# inventory/views.py
from rest_framework.pagination import PageNumberPagination
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from django.db import models
from .models import SIMBatch, SIM, SIMMovement
from .serializers import (
    SIMBatchSerializer,
    SIMSerializer,
    SIMMovementSerializer,
    BulkIssueSerializer,
    BulkReturnSerializer,
)
from apps.accounts.models import User
from apps.dealers.models import Branch, VanTeam


class SIMBatchListCreateView(generics.ListCreateAPIView):
    serializer_class = SIMBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SIMBatch.objects.all()

    def perform_create(self, serializer):
        batch = serializer.save(received_by=self.request.user)

        # Auto-generate SIM records from the serial range
        serial_start = self.request.data.get("serial_start")
        serial_end = self.request.data.get("serial_end")

        if serial_start and serial_end:
            try:
                start = int(serial_start)
                end = int(serial_end)
                sims = [
                    SIM(
                        serial_number=str(n),
                        batch=batch,
                        status=SIM.Status.IN_STOCK,
                        branch=batch.branch,
                    )
                    for n in range(start, end + 1)
                ]
                SIM.objects.bulk_create(sims, ignore_conflicts=True)
            except (ValueError, TypeError):
                pass


class SIMBatchDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = SIMBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = SIMBatch.objects.all()


class SIMListView(generics.ListAPIView):
    serializer_class = SIMSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SIM.objects.all().order_by("-created_at")
        status = self.request.query_params.get("status")
        branch = self.request.query_params.get("branch")
        holder = self.request.query_params.get("holder")
        search = self.request.query_params.get("search")
        van_team = self.request.query_params.get("van_team")
        if status:
            qs = qs.filter(status=status)
        if branch:
            qs = qs.filter(branch_id=branch)
        if holder:
            qs = qs.filter(current_holder_id=holder)
        if search:
            qs = qs.filter(serial_number__icontains=search)
        if van_team:
            if van_team == "-1":
                qs = qs.none()
            else:
                from apps.dealers.models import VanTeamMember
                # Members of this van team — their issued SIMs should also appear
                member_ids = list(VanTeamMember.objects.filter(
                    team_id=van_team
                ).values_list("agent_id", flat=True))
                qs = qs.filter(
                    models.Q(van_team_id=van_team) |
                    models.Q(current_holder_id__in=member_ids)
                )
        return qs


EDIT_DELETE_ROLES = {"dealer_owner", "operations_manager", "super_admin"}


def can_edit_delete(user):
    return getattr(user, "role", None) in EDIT_DELETE_ROLES


class SIMDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SIMSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = SIM.objects.all()
    lookup_field = "serial_number"

    def update(self, request, *args, **kwargs):
        """PATCH — allow editing branch, holder, notes/batch info only."""
        if not can_edit_delete(request.user):
            return Response(
                {"detail": "You do not have permission to edit SIMs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        partial = kwargs.pop("partial", True)
        instance = self.get_object()

        # Track changes before update
        old_holder = instance.current_holder
        old_branch = instance.branch

        EDITABLE = {"branch", "current_holder", "batch", "notes"}
        data = {k: v for k, v in request.data.items() if k in EDITABLE}

        if not data:
            return Response(
                {"detail": "No editable fields provided. Allowed: branch, current_holder, batch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        sim = serializer.save()

        # Log a movement for audit trail
        SIMMovement.objects.create(
            sim=sim,
            movement_type=SIMMovement.MovementType.TRANSFER,
            from_branch=old_branch,
            to_branch=sim.branch,
            notes=f"Manual edit by {request.user.full_name}: {list(data.keys())}",
            created_by=request.user,
        )

        # ─── ADD THIS NOTIFICATION (if holder changed) ─────────────────────────
        if 'current_holder' in data and old_holder != sim.current_holder:
            from apps.notifications.models import Notification

            # Notify old holder (if exists)
            if old_holder:
                Notification.objects.create(
                    recipient=old_holder,
                    title="📱 SIM Transferred Away",
                    message=(
                        f"SIM {sim.serial_number} has been transferred away from you.\n\n"
                        f"New holder: {sim.current_holder.full_name if sim.current_holder else 'Unassigned'}\n"
                        f"Transferred by: {request.user.full_name}\n"
                        f"Notes: {data.get('notes', 'No additional notes')}\n\n"
                        f"This SIM is no longer in your possession."
                    ),
                    type=Notification.Type.SYSTEM,
                )

            # Notify new holder (if exists and different from old)
            if sim.current_holder and (not old_holder or old_holder.id != sim.current_holder.id):
                Notification.objects.create(
                    recipient=sim.current_holder,
                    title="📱 SIM Transferred to You",
                    message=(
                        f"SIM {sim.serial_number} has been transferred to you.\n\n"
                        f"Previous holder: {old_holder.full_name if old_holder else 'Unassigned'}\n"
                        f"Transferred by: {request.user.full_name}\n"
                        f"Notes: {data.get('notes', 'No additional notes')}\n\n"
                        f"This SIM is now in your possession."
                    ),
                    type=Notification.Type.SYSTEM,
                )
        # ───────────────────────────────────────────────────────────────────────

        return Response(serializer.data)


# ── Add this new view at the bottom of views.py ──────────────────────────────

class BulkDeleteSIMsView(APIView):
    """
    DELETE /inventory/actions/bulk-delete/
    Body: { "serial_numbers": ["...", "..."] }
    Permanently deletes the listed SIMs.
    Restricted to dealer_owner, operations_manager, super_admin.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        if not can_edit_delete(request.user):
            return Response(
                {"detail": "You do not have permission to delete SIMs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serial_numbers = request.data.get("serial_numbers", [])
        if not serial_numbers or not isinstance(serial_numbers, list):
            return Response(
                {"detail": "serial_numbers must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = SIM.objects.filter(serial_number__in=serial_numbers)
        found_count = qs.count()

        if found_count == 0:
            return Response(
                {"detail": "No matching SIMs found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        deleted_count, _ = qs.delete()
        return Response(
            {
                "deleted": deleted_count,
                "detail": f"{deleted_count} SIM(s) permanently deleted.",
                "not_found": len(serial_numbers) - found_count,
            },
            status=status.HTTP_200_OK,
        )


class SIMMovementListView(generics.ListAPIView):
    serializer_class = SIMMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        # ── Filter to this specific SIM only ──────────────────────────────────
        serial_number = self.kwargs.get("serial_number")

        qs = SIMMovement.objects.select_related(
            "sim", "from_user", "to_user", "from_branch", "to_branch", "created_by"
        ).order_by("-created_at")

        if serial_number:
            qs = qs.filter(sim__serial_number=serial_number)

        movement_type = self.request.query_params.get("movement_type")
        date = self.request.query_params.get("date")
        from_branch = self.request.query_params.get("from_branch")
        from_user = self.request.query_params.get("from_user")
        created_by = self.request.query_params.get("created_by")

        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        if date:
            qs = qs.filter(created_at__date=date)
        if from_branch:
            qs = qs.filter(from_branch_id=from_branch)
        if from_user:
            qs = qs.filter(from_user_id=from_user)
        if created_by:
            qs = qs.filter(created_by_id=created_by)

        return qs


class BulkIssueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkIssueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ── Validate optional recipient user ──────────────────────────────────
        to_user = None
        to_user_id = data.get("to_user")
        if to_user_id:
            try:
                to_user = User.objects.get(pk=to_user_id)
            except User.DoesNotExist:
                return Response(
                    {"detail": f"User with id={to_user_id} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── Validate optional branch ──────────────────────────────────────────
        to_branch = None
        if data.get("to_branch"):
            try:
                to_branch = Branch.objects.get(pk=data["to_branch"])
            except Branch.DoesNotExist:
                return Response(
                    {"detail": f"Branch with id={data['to_branch']} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── Validate optional van team ────────────────────────────────────────
        van_team = None
        if data.get("van_team"):
            try:
                van_team = VanTeam.objects.get(pk=data["van_team"])
            except VanTeam.DoesNotExist:
                return Response(
                    {"detail": f"VanTeam with id={data['van_team']} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── Fetch the SIMs ────────────────────────────────────────────────────
        sims = SIM.objects.filter(
            serial_number__in=data["serial_numbers"],
            status=SIM.Status.IN_STOCK,
        )
        if sims.count() != len(data["serial_numbers"]):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in data["serial_numbers"] if s not in found]
            return Response(
                {"detail": f"Some SIMs not found or not in stock: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Determine the new status ──────────────────────────────────────────
        new_status = SIM.Status.ISSUED if to_user else SIM.Status.IN_STOCK

        # ── Issue the SIMs ────────────────────────────────────────────────────
        movements = []
        for sim in sims:
            from_branch = sim.branch

            sim.status = new_status
            sim.current_holder = to_user if to_user else None
            if to_branch:
                sim.branch = to_branch
            elif van_team:
                sim.branch = van_team.branch
            sim.van_team = van_team if (van_team and not to_user) else None
            sim.save()

            movements.append(SIMMovement(
                sim=sim,
                movement_type=SIMMovement.MovementType.ISSUE,
                from_user=request.user,
                from_branch=from_branch,
                to_user=to_user,
                to_branch=to_branch,
                van_team=van_team,
                notes=data.get("notes", ""),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        # ─── ADD THIS NOTIFICATION (if issued to a specific user) ─────────────
        if to_user:
            from apps.notifications.models import Notification
            sim_count = sims.count()
            serials_preview = ", ".join([s.serial_number for s in sims[:3]])
            if sim_count > 3:
                serials_preview += f" and {sim_count - 3} more"

            Notification.objects.create(
                recipient=to_user,
                title="📱 New SIMs Issued",
                message=(
                    f"{sim_count} SIM(s) have been issued to you.\n\n"
                    f"Serial numbers: {serials_preview}\n\n"
                    f"Issued by: {request.user.full_name}\n"
                    f"Notes: {data.get('notes', 'No additional notes')}"
                ),
                type=Notification.Type.ISSUE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(
            {
                "issued": sims.count(),
                "detail": f"{sims.count()} SIMs issued successfully.",
                "new_status": new_status,
            },
            status=status.HTTP_200_OK,
        )


class BulkReturnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from_user = None
        from_user_id = data.get("from_user")
        if from_user_id:
            try:
                from_user = User.objects.get(pk=from_user_id)
            except User.DoesNotExist:
                return Response(
                    {"detail": f"User with id={from_user_id} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from_branch_id = data.get("from_branch")
        van_team_id = data.get("van_team")

        returning_van = None
        if van_team_id:
            try:
                returning_van = VanTeam.objects.select_related(
                    "branch").get(pk=van_team_id)
            except VanTeam.DoesNotExist:
                return Response(
                    {"detail": f"VanTeam with id={van_team_id} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        q = models.Q(pk__in=[])
        if from_user:
            q |= models.Q(status=SIM.Status.ISSUED, current_holder=from_user)
            q |= models.Q(status=SIM.Status.IN_STOCK,
                          van_team__leader=from_user)
        if from_branch_id:
            q |= models.Q(status=SIM.Status.IN_STOCK, branch_id=from_branch_id)
        if returning_van:
            q |= models.Q(status=SIM.Status.IN_STOCK, van_team=returning_van)

        sims = SIM.objects.filter(
            serial_number__in=data["serial_numbers"]
        ).filter(q)

        if sims.count() != len(data["serial_numbers"]):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in data["serial_numbers"] if s not in found]
            return Response(
                {"detail": f"Some SIMs not found or not held by this holder: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ba_van = None
        if from_user and returning_van is None:
            ba_van = VanTeam.objects.filter(
                members__agent=from_user
            ).select_related("branch").first()

        movements = []
        for sim in sims:
            from_branch_obj = sim.branch

            if from_user and returning_van is None:
                if ba_van:
                    sim.status = SIM.Status.IN_STOCK
                    sim.current_holder = None
                    sim.van_team = ba_van
                    sim.branch = ba_van.branch
                    destination_branch = None
                    destination_van = ba_van
                else:
                    sim.status = SIM.Status.IN_STOCK
                    sim.current_holder = None
                    sim.van_team = None
                    sim.branch = from_branch_obj
                    destination_branch = from_branch_obj
                    destination_van = None

            elif returning_van:
                sim.status = SIM.Status.IN_STOCK
                sim.current_holder = None
                sim.van_team = None
                sim.branch = returning_van.branch
                destination_branch = returning_van.branch
                destination_van = None

            elif from_branch_id:
                warehouse_branch = Branch.objects.filter(
                    dealer=sim.branch.dealer if sim.branch else None,
                    is_warehouse=True,
                ).first() if sim.branch else None
                sim.status = SIM.Status.IN_STOCK
                sim.current_holder = None
                sim.van_team = None
                sim.branch = warehouse_branch or sim.branch
                destination_branch = warehouse_branch or sim.branch
                destination_van = None
            else:
                destination_branch = sim.branch
                destination_van = None

            sim.save()

            movements.append(SIMMovement(
                sim=sim,
                movement_type=SIMMovement.MovementType.RETURN,
                from_user=from_user,
                from_branch=from_branch_obj,
                to_branch=destination_branch if 'destination_branch' in dir() else None,
                van_team=destination_van if 'destination_van' in dir() else None,
                to_user=request.user,
                notes=data.get("notes", ""),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        # ─── ADD THIS NOTIFICATION (if returned from a specific user) ─────────
        if from_user:
            from apps.notifications.models import Notification
            sim_count = sims.count()
            serials_preview = ", ".join([s.serial_number for s in sims[:3]])
            if sim_count > 3:
                serials_preview += f" and {sim_count - 3} more"

            Notification.objects.create(
                recipient=from_user,
                title="📱 SIMs Returned",
                message=(
                    f"{sim_count} SIM(s) have been returned from you.\n\n"
                    f"Serial numbers: {serials_preview}\n\n"
                    f"Returned by: {request.user.full_name}\n"
                    f"Notes: {data.get('notes', 'No additional notes')}"
                ),
                type=Notification.Type.RETURN,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(
            {"returned": sims.count(), "detail": f"{sims.count()} SIMs returned successfully."},
            status=status.HTTP_200_OK,
        )


class SIMMovementBulkListView(generics.ListAPIView):
    serializer_class = SIMMovementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SIMMovement.objects.select_related(
            "sim", "from_user", "to_user", "from_branch", "to_branch", "created_by"
        ).order_by("-created_at")

        movement_type = self.request.query_params.get("movement_type")
        date = self.request.query_params.get("date")       # YYYY-MM-DD
        from_branch = self.request.query_params.get("from_branch")
        from_user = self.request.query_params.get("from_user")

        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        if date:
            qs = qs.filter(created_at__date=date)
        if from_branch:
            qs = qs.filter(from_branch_id=from_branch)
        if from_user:
            qs = qs.filter(from_user_id=from_user)
        created_by = self.request.query_params.get("created_by")
        if created_by:
            qs = qs.filter(created_by_id=created_by)
        return qs


class BulkRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from rest_framework import serializers as drf_serializers

        serial_numbers = request.data.get("serial_numbers", [])
        notes = request.data.get("notes", "")

        if not serial_numbers or not isinstance(serial_numbers, list):
            return Response(
                {"detail": "serial_numbers must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sims = SIM.objects.filter(
            serial_number__in=serial_numbers,
            status=SIM.Status.ISSUED,
            current_holder=request.user,
        )

        if sims.count() != len(serial_numbers):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in serial_numbers if s not in found]
            return Response(
                {
                    "detail": (
                        "Some SIMs not found, not issued, or not held by you: "
                        f"{missing}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        movements = []
        for sim in sims:
            from_branch = sim.branch
            sim.status = SIM.Status.REGISTERED
            sim.save()

            movements.append(SIMMovement(
                sim=sim,
                movement_type=SIMMovement.MovementType.REGISTER,
                from_user=request.user,
                from_branch=from_branch,
                to_user=None,
                to_branch=None,
                van_team=None,
                notes=notes or "Registered by BA",
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        # ─── ADD THIS NOTIFICATION (to BA who registered) ─────────────────────
        from apps.notifications.models import Notification
        sim_count = sims.count()
        serials_preview = ", ".join([s.serial_number for s in sims[:3]])
        if sim_count > 3:
            serials_preview += f" and {sim_count - 3} more"

        # Notify the BA
        Notification.objects.create(
            recipient=request.user,
            title="✅ SIMs Registered Successfully",
            message=(
                f"You have successfully registered {sim_count} SIM(s).\n\n"
                f"Serial numbers: {serials_preview}\n\n"
                f"These SIMs are now active and commission will be calculated "
                f"in the next reconciliation cycle."
            ),
            type=Notification.Type.RECEIVE,
        )

        # Notify finance team (users with finance role or dealer_owner/ops_manager)
        from apps.accounts.models import User as UserModel
        finance_recipients = UserModel.objects.filter(
            role__in=["finance", "dealer_owner", "operations_manager"],
            is_active=True,
        )
        if request.user.dealer_org_id:
            finance_recipients = finance_recipients.filter(
                dealer_org_id=request.user.dealer_org_id
            )

        for recipient in finance_recipients:
            Notification.objects.create(
                recipient=recipient,
                title="📊 New SIM Registrations",
                message=(
                    f"{request.user.full_name} has registered {sim_count} new SIM(s).\n\n"
                    f"Serial numbers: {serials_preview}\n\n"
                    f"These will be included in the next commission calculation."
                ),
                type=Notification.Type.FINANCE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response(
            {
                "registered": sims.count(),
                "detail": f"{sims.count()} SIM(s) marked as registered.",
            },
            status=status.HTTP_200_OK,
        )


# ── SIM Trace View ────────────────────────────────────────────────────────────


class SIMTraceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, serial_number):
        try:
            sim = SIM.objects.select_related(
                "current_holder", "branch", "van_team", "batch"
            ).get(serial_number=serial_number)
        except SIM.DoesNotExist:
            return Response({"detail": "SIM not found."}, status=status.HTTP_404_NOT_FOUND)

        # ── Movements ─────────────────────────────────────────────────────────
        movements = SIMMovement.objects.filter(sim=sim).select_related(
            "from_user", "to_user", "from_branch", "to_branch", "created_by"
        ).order_by("created_at")

        movements_data = []
        for m in movements:
            movements_data.append({
                "id": m.id,
                "movement_type": m.movement_type,
                "from_user": {"id": m.from_user.id, "full_name": m.from_user.full_name} if m.from_user else None,
                "to_user": {"id": m.to_user.id, "full_name": m.to_user.full_name} if m.to_user else None,
                "from_branch": {"id": m.from_branch.id, "name": m.from_branch.name} if m.from_branch else None,
                "to_branch": {"id": m.to_branch.id, "name": m.to_branch.name} if m.to_branch else None,
                "notes": m.notes,
                "created_at": m.created_at.isoformat(),
                "created_by": m.created_by.full_name if m.created_by else None,
            })

        # ── Reconciliation Records ─────────────────────────────────────────────
        from apps.reconciliation.models import SafaricomReport, ReconciliationRecord
        recon_records = ReconciliationRecord.objects.filter(sim=sim).select_related(
            "report", "identified_ba"
        ).order_by("-report__period_start")

        recon_data = []
        for r in recon_records:
            recon_data.append({
                "id": r.id,
                "report_id": r.report_id,
                "period_start": r.report.period_start.isoformat() if r.report.period_start else None,
                "period_end": r.report.period_end.isoformat() if r.report.period_end else None,
                "result": r.result,
                "topup_amount": str(r.topup_amount) if r.topup_amount else "0",
                "topup_date": r.topup_date.isoformat() if r.topup_date else None,
                "agent_msisdn": r.agent_msisdn,
                "ba_msisdn": r.ba_msisdn,
                "fraud_flag": r.fraud_flag,
                "rejection_reason": r.rejection_reason or "",
                "identified_ba": {
                    "id": r.identified_ba.id,
                    "full_name": r.identified_ba.full_name,
                    "phone": r.identified_ba.phone,
                } if r.identified_ba else None,
                "commission_amount": str(r.commission_amount) if r.commission_amount else "0",
            })

        # ── Verdict ────────────────────────────────────────────────────────────
        verdict = self._generate_verdict(sim, movements, recon_records)

        return Response({
            "sim": {
                "serial_number": sim.serial_number,
                "status": sim.status,
                "current_holder": {
                    "id": sim.current_holder.id,
                    "full_name": sim.current_holder.full_name,
                    "phone": sim.current_holder.phone,
                    "role": sim.current_holder.role,
                } if sim.current_holder else None,
                "branch": {"id": sim.branch.id, "name": sim.branch.name} if sim.branch else None,
                "created_at": sim.created_at.isoformat(),
                "batch_number": sim.batch.batch_number if sim.batch else None,
            },
            "movements": movements_data,
            "reconciliation_records": recon_data,
            "verdict": verdict,
        })

    def _generate_verdict(self, sim, movements, recon_records):
        holder_name = sim.current_holder.full_name if sim.current_holder else "Unknown"
        serial = sim.serial_number

        if not recon_records.exists():
            if sim.status == "registered":
                return {
                    "status": "not_reported",
                    "badge": "warning",
                    "summary": "Claimed but not in Safaricom report",
                    "detail": (
                        f"{holder_name} marked this SIM (serial {serial}) as registered in the system, "
                        f"however it does not appear in any Safaricom reconciliation report. "
                        f"This means either the customer did not complete activation, "
                        f"the topup was below the minimum threshold, or the registration was not genuine. "
                        f"No commission is payable for this SIM."
                    ),
                    "commission_payable": False,
                }
            elif sim.status == "issued":
                return {
                    "status": "pending",
                    "badge": "info",
                    "summary": "Issued — awaiting registration",
                    "detail": (
                        f"This SIM (serial {serial}) has been issued to {holder_name} "
                        f"but has not yet been registered with a customer. "
                        f"It has not appeared in any Safaricom report. No commission applicable yet."
                    ),
                    "commission_payable": False,
                }
            elif sim.status == "fraud_flagged":
                return {
                    "status": "fraud",
                    "badge": "danger",
                    "summary": "Fraud flagged — no Safaricom record",
                    "detail": (
                        f"This SIM (serial {serial}) is flagged as fraudulent in the system "
                        f"and has no Safaricom report record. Held by {holder_name}. "
                        f"Requires immediate investigation."
                    ),
                    "commission_payable": False,
                }
            else:
                return {
                    "status": "in_stock",
                    "badge": "neutral",
                    "summary": "In stock — not yet issued",
                    "detail": (
                        f"This SIM (serial {serial}) is currently in stock and has not been issued "
                        f"to any Brand Ambassador. No movement or Safaricom activity recorded."
                    ),
                    "commission_payable": False,
                }

        latest = recon_records.first()

        if latest.result == "payable":
            ba_match = ""
            if latest.identified_ba and sim.current_holder:
                if latest.identified_ba.id == sim.current_holder.id:
                    ba_match = (
                        f"The BA MSISDN in the report ({latest.ba_msisdn}) matches "
                        f"{holder_name}'s registered MobiGo device. "
                    )
                else:
                    ba_match = (
                        f"Note: The report associates this SIM with {latest.identified_ba.full_name} "
                        f"(MSISDN {latest.ba_msisdn}), but current holder is {holder_name}. "
                    )
            return {
                "status": "payable",
                "badge": "success",
                "summary": "Confirmed active — commission payable",
                "detail": (
                    f"This SIM (serial {serial}) was confirmed active by Safaricom "
                    f"in the {latest.report.period_start} report with a topup of "
                    f"KES {latest.topup_amount}. {ba_match}"
                    f"No fraud flags. Commission of KES {latest.commission_amount} is payable."
                ),
                "commission_payable": True,
                "commission_amount": str(latest.commission_amount),
            }

        elif latest.result == "fraud":
            return {
                "status": "fraud",
                "badge": "danger",
                "summary": "Fraud flagged by Safaricom",
                "detail": (
                    f"This SIM (serial {serial}) was flagged as fraudulent by Safaricom "
                    f"in the {latest.report.period_start} report. "
                    f"It was held by {holder_name} at the time. "
                    f"Fraud-flagged SIMs attract zero commission and the SIM is blocked. "
                    f"This requires immediate investigation."
                ),
                "commission_payable": False,
            }

        elif latest.result == "rejected":
            return {
                "status": "rejected",
                "badge": "danger",
                "summary": "Rejected — topup below minimum",
                "detail": (
                    f"This SIM (serial {serial}) appeared in the Safaricom report "
                    f"for {latest.report.period_start} but the topup amount of "
                    f"KES {latest.topup_amount} is below the minimum threshold. "
                    f"Held by {holder_name}. No commission is payable."
                ),
                "commission_payable": False,
            }

        elif latest.result == "dispute":
            reported_ba = latest.identified_ba.get_full_name(
            ) if latest.identified_ba else f"MSISDN {latest.ba_msisdn}"
            return {
                "status": "dispute",
                "badge": "warning",
                "summary": "Disputed — MSISDN mismatch",
                "detail": (
                    f"The Safaricom report associates this SIM (serial {serial}) with "
                    f"{reported_ba} (MSISDN {latest.ba_msisdn}), however our inventory "
                    f"shows it is held by {holder_name}. "
                    f"Either this SIM was transferred between BAs without being recorded, "
                    f"or there is a data integrity issue. No commission is payable until resolved."
                ),
                "commission_payable": False,
            }

        elif latest.result == "unmatched":
            if not latest.sim:
                return {
                    "status": "foreign",
                    "badge": "danger",
                    "summary": "Serial not in dealer inventory",
                    "detail": (
                        f"This serial number ({serial}) appears in the Safaricom report under "
                        f"BA MSISDN {latest.ba_msisdn} but does not exist in Enlight Communications' "
                        f"inventory. This SIM does not belong to your dealer account. "
                        f"This could indicate a BA is registering SIMs from another dealer — "
                        f"requires immediate investigation."
                    ),
                    "commission_payable": False,
                }
            return {
                "status": "unmatched",
                "badge": "warning",
                "summary": "Unmatched — BA not identified",
                "detail": (
                    f"This SIM (serial {serial}) appeared in the Safaricom report but the "
                    f"BA MSISDN {latest.ba_msisdn} could not be matched to any registered "
                    f"Brand Ambassador in the system. Commission cannot be allocated until "
                    f"the BA is identified."
                ),
                "commission_payable": False,
            }

        return {
            "status": "unknown",
            "badge": "neutral",
            "summary": "Status unknown",
            "detail": "Unable to determine status for this SIM.",
            "commission_payable": False,
        }

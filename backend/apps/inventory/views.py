# inventory/views.py
from rest_framework.pagination import PageNumberPagination
from rest_framework import generics, status, permissions
from rest_framework.exceptions import PermissionDenied
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
from apps.dealers.models import Branch, VanTeam, Dealer


# ─── Dealer Resolution Helper ─────────────────────────────────────────────────

def _get_user_dealer(user):
    """
    Returns the dealer the logged-in user belongs to.
    Returns None for staff/admin — they see everything.
    """
    if user.is_staff:
        return None

    # Dealer owner
    try:
        return user.dealer
    except Dealer.DoesNotExist:
        pass

    # Everyone else — dealer_org FK
    if getattr(user, "dealer_org_id", None):
        return user.dealer_org

    # Branch manager
    branch = Branch.objects.filter(manager=user).first()
    if branch:
        return branch.dealer

    # Van team leader
    team = VanTeam.objects.filter(leader=user).first()
    if team:
        return team.branch.dealer

    # Van team member
    from apps.dealers.models import VanTeamMember
    member = VanTeamMember.objects.filter(agent=user).first()
    if member:
        return member.team.branch.dealer

    return None


def _dealer_sim_qs(user):
    """Base SIM queryset scoped to the user's dealer."""
    dealer = _get_user_dealer(user)
    if dealer is None:
        return SIM.objects.all()
    return SIM.objects.filter(
        models.Q(branch__dealer=dealer) |
        models.Q(batch__branch__dealer=dealer)
    ).distinct()


def _dealer_batch_qs(user):
    """Base SIMBatch queryset scoped to the user's dealer."""
    dealer = _get_user_dealer(user)
    if dealer is None:
        return SIMBatch.objects.all()
    return SIMBatch.objects.filter(branch__dealer=dealer)


def _dealer_movement_qs(user):
    """Base SIMMovement queryset scoped to the user's dealer."""
    dealer = _get_user_dealer(user)
    if dealer is None:
        return SIMMovement.objects.all()
    return SIMMovement.objects.filter(
        models.Q(sim__branch__dealer=dealer) |
        models.Q(from_branch__dealer=dealer)
    ).distinct()


# ─── Role Check ───────────────────────────────────────────────────────────────

EDIT_DELETE_ROLES = {"dealer_owner", "operations_manager", "super_admin"}


def can_edit_delete(user):
    return getattr(user, "role", None) in EDIT_DELETE_ROLES


# ─── SIM Batch Views ──────────────────────────────────────────────────────────

class SIMBatchListCreateView(generics.ListCreateAPIView):
    serializer_class = SIMBatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _dealer_batch_qs(self.request.user)

    def perform_create(self, serializer):
        batch = serializer.save(received_by=self.request.user)

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

    def get_queryset(self):
        return _dealer_batch_qs(self.request.user)


# ─── SIM Views ────────────────────────────────────────────────────────────────

class SIMListView(generics.ListAPIView):
    serializer_class = SIMSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = _dealer_sim_qs(self.request.user).order_by("-created_at")

        sim_status = self.request.query_params.get("status")
        branch = self.request.query_params.get("branch")
        holder = self.request.query_params.get("holder")
        search = self.request.query_params.get("search")
        van_team = self.request.query_params.get("van_team")   # ← parse first

        # New param: location=branch_stock | van_stock | with_ba
        location = self.request.query_params.get("location")
        if location == "branch_stock":
            qs = qs.filter(status=SIM.Status.IN_STOCK, van_team__isnull=True)
        elif location == "van_stock":
            qs = qs.filter(status=SIM.Status.IN_STOCK, van_team__isnull=False)
        elif location == "with_ba":
            qs = qs.filter(status=SIM.Status.ISSUED,
                           current_holder__isnull=False)
        elif sim_status:
            if sim_status == "in_stock":
                if van_team and van_team != "-1":
                    qs = qs.filter(status=sim_status)
                else:
                    qs = qs.filter(status=sim_status, van_team__isnull=True)
            elif sim_status == "issued":
                if van_team and van_team != "-1":
                    qs = qs.filter(status=SIM.Status.ISSUED,
                                   current_holder__isnull=False)
                else:
                    qs = qs.filter(
                        models.Q(status=SIM.Status.ISSUED) |
                        models.Q(status=SIM.Status.IN_STOCK,
                                 van_team__isnull=False)
                    )
            else:
                qs = qs.filter(status=sim_status)

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
                member_ids = list(VanTeamMember.objects.filter(
                    team_id=van_team
                ).values_list("agent_id", flat=True))
                qs = qs.filter(
                    models.Q(van_team_id=van_team) |
                    models.Q(current_holder_id__in=member_ids)
                )
        return qs


class SIMDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SIMSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "serial_number"

    def get_queryset(self):
        return _dealer_sim_qs(self.request.user)

    def update(self, request, *args, **kwargs):
        if not can_edit_delete(request.user):
            return Response(
                {"detail": "You do not have permission to edit SIMs."},
                status=status.HTTP_403_FORBIDDEN,
            )

        partial = kwargs.pop("partial", True)
        instance = self.get_object()

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

        SIMMovement.objects.create(
            sim=sim,
            movement_type=SIMMovement.MovementType.TRANSFER,
            from_branch=old_branch,
            to_branch=sim.branch,
            notes=f"Manual edit by {request.user.full_name}: {list(data.keys())}",
            created_by=request.user,
        )

        if "current_holder" in data and old_holder != sim.current_holder:
            from apps.notifications.models import Notification

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

        return Response(serializer.data)


# ─── Bulk Delete ──────────────────────────────────────────────────────────────

class BulkDeleteSIMsView(APIView):
    """
    DELETE /inventory/actions/bulk-delete/
    Body: { "serial_numbers": ["...", "..."] }
    Permanently deletes the listed SIMs — scoped to the dealer.
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

        # Scoped to dealer — can't delete another dealer's SIMs
        qs = _dealer_sim_qs(request.user).filter(
            serial_number__in=serial_numbers)
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


# ─── SIM Movement Views ───────────────────────────────────────────────────────

class SIMMovementListView(generics.ListAPIView):
    serializer_class = SIMMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        serial_number = self.kwargs.get("serial_number")

        qs = _dealer_movement_qs(self.request.user).select_related(
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


class SIMMovementBulkListView(generics.ListAPIView):
    serializer_class = SIMMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # ← disable pagination entirely for this view

    def get_queryset(self):
        qs = _dealer_movement_qs(self.request.user).select_related(
            "sim", "from_user", "to_user", "from_branch", "to_branch", "created_by"
        ).order_by("-created_at")

        movement_type = self.request.query_params.get("movement_type")
        date = self.request.query_params.get("date")
        branch = self.request.query_params.get("branch")          # ← add this
        from_branch = self.request.query_params.get("from_branch")
        from_user = self.request.query_params.get("from_user")
        created_by = self.request.query_params.get("created_by")

        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        if date:
            qs = qs.filter(created_at__date=date)
        if branch:                                                 # ← add this
            qs = qs.filter(
                models.Q(from_branch_id=branch) | models.Q(to_branch_id=branch)
            )
        if from_branch:
            qs = qs.filter(from_branch_id=from_branch)
        if from_user:
            qs = qs.filter(from_user_id=from_user)
        if created_by:
            qs = qs.filter(created_by_id=created_by)

        return qs

# ─── Bulk Issue ───────────────────────────────────────────────────────────────


class BulkIssueView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkIssueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dealer = _get_user_dealer(request.user)

        # ── Validate recipient user belongs to same dealer ────────────────────
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
            # Ensure to_user belongs to the same dealer
            if dealer and _get_user_dealer(to_user) != dealer:
                return Response(
                    {"detail": "You cannot issue SIMs to a user outside your dealer account."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # ── Validate branch belongs to same dealer ────────────────────────────
        to_branch = None
        if data.get("to_branch"):
            try:
                to_branch = Branch.objects.get(pk=data["to_branch"])
            except Branch.DoesNotExist:
                return Response(
                    {"detail": f"Branch with id={data['to_branch']} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if dealer and to_branch.dealer != dealer:
                return Response(
                    {"detail": "You cannot issue SIMs to a branch outside your dealer account."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # ── Validate van team belongs to same dealer ──────────────────────────
        van_team = None
        if data.get("van_team"):
            try:
                van_team = VanTeam.objects.get(pk=data["van_team"])
            except VanTeam.DoesNotExist:
                return Response(
                    {"detail": f"VanTeam with id={data['van_team']} does not exist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if dealer and van_team.branch.dealer != dealer:
                return Response(
                    {"detail": "You cannot issue SIMs to a van team outside your dealer account."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # ── Fetch the SIMs — scoped to dealer ─────────────────────────────────
        sims = _dealer_sim_qs(request.user).filter(
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

        if to_user:
            new_status = SIM.Status.ISSUED   # BA holds it → ISSUED
        elif van_team:
            # van owns it → IN_STOCK (van's stock)
            new_status = SIM.Status.IN_STOCK
        else:
            new_status = SIM.Status.IN_STOCK

        movements = []
        for sim in sims:
            from_branch = sim.branch

            sim.status = new_status
            sim.current_holder = to_user if to_user else None
            if to_branch:
                sim.branch = to_branch
            elif van_team:
                sim.branch = van_team.branch
            sim.van_team = van_team if van_team else None
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

            # ── 2nd-issue check: does this BA still have unresolved ISSUED SIMs? ──
            from django.utils import timezone
            unresolved = SIM.objects.filter(
                current_holder=to_user,
                status=SIM.Status.ISSUED,
            ).exclude(
                # exclude the ones we just issued
                serial_number__in=data["serial_numbers"]
            )

            if unresolved.exists():
                unresolved_count = unresolved.count()
                unresolved_serials = ", ".join(
                    list(unresolved.values_list(
                        "serial_number", flat=True)[:5])
                )
                if unresolved_count > 5:
                    unresolved_serials += f" and {unresolved_count - 5} more"

                # Find the oldest unresolved issue movement for timestamp
                oldest_issue = SIMMovement.objects.filter(
                    sim__in=unresolved,
                    movement_type=SIMMovement.MovementType.ISSUE,
                ).order_by("created_at").first()

                issued_at_str = (
                    oldest_issue.created_at.strftime("%d %b %Y %I:%M %p")
                    if oldest_issue else "earlier"
                )

                alert_message = (
                    f"⚠️ ATTENTION: You are issuing {sim_count} SIM(s) to {to_user.full_name}, "
                    f"but they still have {unresolved_count} unresolved SIM(s) from {issued_at_str} "
                    f"that have NOT been registered.\n\n"
                    f"Unresolved serials: {unresolved_serials}\n\n"
                    f"BA: {to_user.full_name}\n"
                    f"Issued by: {request.user.full_name}\n\n"
                    f"Please resolve the previous issue before continuing.\n"
                    f"Actions available:\n"
                    f"• Register them on behalf of BA\n"
                    f"• Mark as Lost (with reason)\n"
                    f"• Return them from BA"
                )

                # Find van team leader of this BA
                from apps.dealers.models import VanTeamMember
                van_membership = VanTeamMember.objects.filter(
                    agent=to_user
                ).select_related("team__leader", "team__branch__manager").first()

                recipients_to_alert = []

                if van_membership:
                    if van_membership.team.leader:
                        recipients_to_alert.append(van_membership.team.leader)
                    if van_membership.team.branch and van_membership.team.branch.manager:
                        recipients_to_alert.append(
                            van_membership.team.branch.manager)

                # Also alert dealer owner/ops manager
                if dealer:
                    from apps.accounts.models import User as UserModel
                    for mgr in UserModel.objects.filter(
                        role__in=["dealer_owner", "operations_manager"],
                        dealer_org=dealer,
                        is_active=True,
                    ):
                        if mgr not in recipients_to_alert:
                            recipients_to_alert.append(mgr)

                for recipient in recipients_to_alert:
                    Notification.objects.create(
                        recipient=recipient,
                        title=f"⚠️ Unresolved SIMs — {to_user.full_name}",
                        message=alert_message,
                        type=Notification.Type.ALERT,
                        # Store BA id and unresolved serial numbers for action buttons
                        # The frontend will use these to show Register/Lost/Return buttons
                    )

                # Also store the alert context in response so frontend can show the popup
                return Response(
                    {
                        "issued": sims.count(),
                        "detail": f"{sims.count()} SIMs issued successfully.",
                        "new_status": new_status,
                        "unresolved_alert": {
                            "ba_id": to_user.id,
                            "ba_name": to_user.full_name,
                            "unresolved_count": unresolved_count,
                            "unresolved_serials": list(
                                unresolved.values_list(
                                    "serial_number", flat=True)
                            ),
                            "issued_at": issued_at_str,
                        }
                    },
                    status=status.HTTP_200_OK,
                )

        return Response(
            {
                "issued": sims.count(),
                "detail": f"{sims.count()} SIMs issued successfully.",
                "new_status": new_status,
            },
            status=status.HTTP_200_OK,
        )


# ─── Bulk Return ──────────────────────────────────────────────────────────────

class BulkReturnView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkReturnSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dealer = _get_user_dealer(request.user)

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
            # Ensure from_user belongs to the same dealer
            if dealer and _get_user_dealer(from_user) != dealer:
                return Response(
                    {"detail": "You cannot return SIMs from a user outside your dealer account."},
                    status=status.HTTP_403_FORBIDDEN,
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
            if dealer and returning_van.branch.dealer != dealer:
                return Response(
                    {"detail": "You cannot return SIMs from a van team outside your dealer account."},
                    status=status.HTTP_403_FORBIDDEN,
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

        # Scoped to dealer
        sims = _dealer_sim_qs(request.user).filter(
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
                to_branch=destination_branch,
                van_team=destination_van,
                to_user=request.user,
                notes=data.get("notes", ""),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

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

        return Response(
            {"returned": sims.count(), "detail": f"{sims.count()} SIMs returned successfully."},
            status=status.HTTP_200_OK,
        )


# ─── Bulk Register ────────────────────────────────────────────────────────────

class BulkRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serial_numbers = request.data.get("serial_numbers", [])
        notes = request.data.get("notes", "")

        if not serial_numbers or not isinstance(serial_numbers, list):
            return Response(
                {"detail": "serial_numbers must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Scoped to dealer AND must be held by this user
        sims = _dealer_sim_qs(request.user).filter(
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

        from apps.notifications.models import Notification
        sim_count = sims.count()
        serials_preview = ", ".join([s.serial_number for s in sims[:3]])
        if sim_count > 3:
            serials_preview += f" and {sim_count - 3} more"

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

        from apps.accounts.models import User as UserModel
        dealer = _get_user_dealer(request.user)
        finance_recipients = UserModel.objects.filter(
            role__in=["finance", "dealer_owner", "operations_manager"],
            is_active=True,
        )
        if dealer:
            finance_recipients = finance_recipients.filter(dealer_org=dealer)

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

        return Response(
            {
                "registered": sims.count(),
                "detail": f"{sims.count()} SIM(s) marked as registered.",
            },
            status=status.HTTP_200_OK,
        )


# ─── SIM Trace View ───────────────────────────────────────────────────────────

class SIMTraceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, serial_number):
        # Scoped to dealer — can't trace another dealer's SIM
        sim_qs = _dealer_sim_qs(request.user)
        try:
            sim = sim_qs.select_related(
                "current_holder", "branch", "van_team", "batch"
            ).get(serial_number=serial_number)
        except SIM.DoesNotExist:
            return Response(
                {"detail": "SIM not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        from apps.reconciliation.models import ReconciliationRecord
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


# ─── Resolve Lost SIMs ────────────────────────────────────────────────────────

class ResolveLostSIMsView(APIView):
    """
    POST /inventory/actions/resolve-lost/
    Body: {
        "ba_id": 5,
        "serial_numbers": ["001", "002"],
        "loss_reason": "Stolen at Kibera market",
        "loss_location": "Kibera, Nairobi",
        "notes": "BA reported armed robbery"
    }
    Van leader/branch manager marks specific BA SIMs as lost.
    Automatically creates a deduction record against the BA.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.notifications.models import Notification
        from apps.dealers.models import VanTeamMember
        from apps.accounts.models import User as UserModel

        ba_id = request.data.get("ba_id")
        serial_numbers = request.data.get("serial_numbers", [])
        loss_reason = request.data.get("loss_reason", "").strip()
        loss_location = request.data.get("loss_location", "").strip()
        notes = request.data.get("notes", "").strip()

        if not ba_id or not serial_numbers:
            return Response(
                {"detail": "ba_id and serial_numbers are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not loss_reason:
            return Response(
                {"detail": "loss_reason is required. Where/how were the SIMs lost?"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ba = UserModel.objects.get(pk=ba_id)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": f"BA with id={ba_id} not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dealer = _get_user_dealer(request.user)

        sims = _dealer_sim_qs(request.user).filter(
            serial_number__in=serial_numbers,
            current_holder=ba,
            status=SIM.Status.ISSUED,
        )

        if sims.count() != len(serial_numbers):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in serial_numbers if s not in found]
            return Response(
                {"detail": f"Some SIMs not found or not held by this BA: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        movements = []
        for sim in sims:
            from_branch = sim.branch
            sim.status = SIM.Status.LOST
            sim.current_holder = None
            sim.save()

            movements.append(SIMMovement(
                sim=sim,
                movement_type=SIMMovement.MovementType.LOST,
                from_user=ba,
                from_branch=from_branch,
                notes=(
                    f"Marked LOST by {request.user.full_name}.\n"
                    f"Reason: {loss_reason}\n"
                    f"Location: {loss_location or 'Not specified'}\n"
                    f"Notes: {notes or 'None'}"
                ),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        # ── Auto-create deduction record ──────────────────────────────────────
        from apps.commissions.models import DeductionRule, DeductionRecord
        lost_rule = DeductionRule.objects.filter(
            dealer=dealer,
            violation_type=DeductionRule.ViolationType.LOST,
            is_active=True,
        ).first() if dealer else None

        deduction_amount = 0
        if lost_rule:
            deduction_amount = float(
                lost_rule.amount_per_unit) * len(serial_numbers)
            DeductionRecord.objects.create(
                agent=ba,
                rule=lost_rule,
                violation_type=DeductionRule.ViolationType.LOST,
                sims_count=len(serial_numbers),
                amount=deduction_amount,
                reason=(
                    f"Lost SIMs reported by {request.user.full_name}.\n"
                    f"Location: {loss_location or 'Not specified'}\n"
                    f"Reason: {loss_reason}\n"
                    f"Serials: {', '.join(serial_numbers)}"
                ),
                settlement_mode=lost_rule.settlement_mode,
                raised_by=request.user,
            )

        serials_preview = ", ".join(serial_numbers[:3])
        if len(serial_numbers) > 3:
            serials_preview += f" and {len(serial_numbers) - 3} more"

        # Notify BA
        Notification.objects.create(
            recipient=ba,
            title="📋 Lost SIMs Recorded",
            message=(
                f"{len(serial_numbers)} SIM(s) have been marked as LOST on your account.\n\n"
                f"Serials: {serials_preview}\n"
                f"Reason: {loss_reason}\n"
                f"Location: {loss_location or 'Not specified'}\n"
                f"Recorded by: {request.user.full_name}\n\n"
                + (
                    f"A deduction of KES {deduction_amount} has been raised against your account."
                    if lost_rule else
                    "A deduction may be raised. Please follow up with your manager."
                )
            ),
            type=Notification.Type.ALERT,
        )

        # Notify branch manager and dealer owner
        if dealer:
            for recipient in UserModel.objects.filter(
                role__in=["dealer_owner",
                          "operations_manager", "branch_manager"],
                dealer_org=dealer,
                is_active=True,
            ):
                Notification.objects.create(
                    recipient=recipient,
                    title=f"📋 {len(serial_numbers)} SIM(s) Reported Lost — {ba.full_name}",
                    message=(
                        f"{len(serial_numbers)} SIM(s) have been marked as LOST.\n\n"
                        f"BA: {ba.full_name}\n"
                        f"Serials: {serials_preview}\n"
                        f"Reason: {loss_reason}\n"
                        f"Location: {loss_location or 'Not specified'}\n"
                        f"Recorded by: {request.user.full_name}\n\n"
                        + (
                            f"Deduction of KES {deduction_amount} raised automatically."
                            if lost_rule else
                            "No active deduction rule found. Please raise manually."
                        )
                    ),
                    type=Notification.Type.ALERT,
                )

        return Response(
            {
                "lost": len(serial_numbers),
                "detail": f"{len(serial_numbers)} SIM(s) marked as lost.",
                "deduction_raised": deduction_amount > 0,
                "deduction_amount": deduction_amount,
            },
            status=status.HTTP_200_OK,
        )


# ─── Resolve Register on Behalf of BA ────────────────────────────────────────

class ResolveRegisterSIMsView(APIView):
    """
    POST /inventory/actions/resolve-register/
    Body: {
        "ba_id": 5,
        "serial_numbers": ["001", "002"]
    }
    Van leader/branch manager registers SIMs on behalf of BA.
    All selected serials must be ticked — no partial allowed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.notifications.models import Notification
        from apps.accounts.models import User as UserModel

        ba_id = request.data.get("ba_id")
        serial_numbers = request.data.get("serial_numbers", [])
        notes = request.data.get("notes", "").strip()

        if not ba_id or not serial_numbers:
            return Response(
                {"detail": "ba_id and serial_numbers are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ba = UserModel.objects.get(pk=ba_id)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": f"BA with id={ba_id} not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dealer = _get_user_dealer(request.user)

        sims = _dealer_sim_qs(request.user).filter(
            serial_number__in=serial_numbers,
            current_holder=ba,
            status=SIM.Status.ISSUED,
        )

        if sims.count() != len(serial_numbers):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in serial_numbers if s not in found]
            return Response(
                {"detail": f"Some SIMs not found or not held by this BA: {missing}"},
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
                from_user=ba,
                from_branch=from_branch,
                notes=(
                    f"Registered on behalf of {ba.full_name} "
                    f"by {request.user.full_name}.\n"
                    f"Notes: {notes or 'No notes'}"
                ),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        serials_preview = ", ".join(serial_numbers[:3])
        if len(serial_numbers) > 3:
            serials_preview += f" and {len(serial_numbers) - 3} more"

        # Notify BA
        Notification.objects.create(
            recipient=ba,
            title="✅ SIMs Registered on Your Behalf",
            message=(
                f"{len(serial_numbers)} SIM(s) have been registered on your behalf.\n\n"
                f"Serials: {serials_preview}\n"
                f"Registered by: {request.user.full_name}\n\n"
                f"These SIMs are now awaiting Safaricom confirmation."
            ),
            type=Notification.Type.ISSUE,
        )

        # Notify branch manager
        if dealer:
            from apps.accounts.models import User as UserModel
            for recipient in UserModel.objects.filter(
                role__in=["dealer_owner",
                          "operations_manager", "branch_manager"],
                dealer_org=dealer,
                is_active=True,
            ):
                if recipient.id != request.user.id:
                    Notification.objects.create(
                        recipient=recipient,
                        title=f"✅ SIMs Registered on Behalf of {ba.full_name}",
                        message=(
                            f"{len(serial_numbers)} SIM(s) registered on behalf of {ba.full_name}.\n\n"
                            f"Serials: {serials_preview}\n"
                            f"Registered by: {request.user.full_name}\n\n"
                            f"Awaiting Safaricom confirmation."
                        ),
                        type=Notification.Type.FINANCE,
                    )

        return Response(
            {
                "registered": len(serial_numbers),
                "detail": f"{len(serial_numbers)} SIM(s) registered on behalf of {ba.full_name}.",
            },
            status=status.HTTP_200_OK,
        )


# ─── Resolve Faulty SIMs ─────────────────────────────────────────────────────

class ResolveFaultySIMsView(APIView):
    """
    POST /inventory/actions/resolve-faulty/
    Body: {
        "ba_id": 5,
        "serial_numbers": ["001", "002"],
        "fault_reason": "Registration error on Safaricom system",
        "notes": "BA tried 5 times, same error"
    }
    Marks SIMs as FAULTY, returns them from BA,
    alerts dealer owner + branch manager to investigate with Safaricom.
    No new issue allowed until resolved.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.notifications.models import Notification
        from apps.accounts.models import User as UserModel

        ba_id = request.data.get("ba_id")
        serial_numbers = request.data.get("serial_numbers", [])
        fault_reason = request.data.get("fault_reason", "").strip()
        notes = request.data.get("notes", "").strip()

        if not ba_id or not serial_numbers:
            return Response(
                {"detail": "ba_id and serial_numbers are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not fault_reason:
            return Response(
                {"detail": "fault_reason is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            ba = UserModel.objects.get(pk=ba_id)
        except UserModel.DoesNotExist:
            return Response(
                {"detail": f"BA with id={ba_id} not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dealer = _get_user_dealer(request.user)

        sims = _dealer_sim_qs(request.user).filter(
            serial_number__in=serial_numbers,
            current_holder=ba,
            status=SIM.Status.ISSUED,
        )

        if sims.count() != len(serial_numbers):
            found = set(sims.values_list("serial_number", flat=True))
            missing = [s for s in serial_numbers if s not in found]
            return Response(
                {"detail": f"Some SIMs not found or not held by this BA: {missing}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        movements = []
        for sim in sims:
            from_branch = sim.branch
            sim.status = SIM.Status.FAULTY
            sim.current_holder = None
            sim.save()

            movements.append(SIMMovement(
                sim=sim,
                movement_type=SIMMovement.MovementType.FAULTY,
                from_user=ba,
                from_branch=from_branch,
                notes=(
                    f"Marked FAULTY by {request.user.full_name}.\n"
                    f"Fault reason: {fault_reason}\n"
                    f"Notes: {notes or 'None'}"
                ),
                created_by=request.user,
            ))

        SIMMovement.objects.bulk_create(movements)

        serials_preview = ", ".join(serial_numbers[:3])
        if len(serial_numbers) > 3:
            serials_preview += f" and {len(serial_numbers) - 3} more"

        # Notify BA
        Notification.objects.create(
            recipient=ba,
            title="⚠️ Faulty SIMs Recorded",
            message=(
                f"{len(serial_numbers)} SIM(s) have been marked as FAULTY and returned.\n\n"
                f"Serials: {serials_preview}\n"
                f"Fault reason: {fault_reason}\n"
                f"Recorded by: {request.user.full_name}\n\n"
                f"These SIMs are being investigated. "
                f"You are NOT responsible for these SIMs."
            ),
            type=Notification.Type.ALERT,
        )

        # Notify dealer owner + ops manager — they need to chase Safaricom
        if dealer:
            for recipient in UserModel.objects.filter(
                role__in=["dealer_owner", "operations_manager"],
                dealer_org=dealer,
                is_active=True,
            ):
                Notification.objects.create(
                    recipient=recipient,
                    title=f"🚨 Faulty SIMs Reported — Safaricom Investigation Needed",
                    message=(
                        f"{len(serial_numbers)} SIM(s) have been reported as FAULTY by BA {ba.full_name}.\n\n"
                        f"Serials: {serials_preview}\n"
                        f"Fault reason: {fault_reason}\n"
                        f"Reported by: {request.user.full_name}\n"
                        f"Notes: {notes or 'None'}\n\n"
                        f"⚠️ ACTION REQUIRED: Please contact Safaricom to investigate "
                        f"why these SIM cards cannot be registered.\n"
                        f"These SIMs are now blocked from re-issue until resolved."
                    ),
                    type=Notification.Type.ALERT,
                )

        return Response(
            {
                "faulty": len(serial_numbers),
                "detail": f"{len(serial_numbers)} SIM(s) marked as faulty. Dealer notified.",
            },
            status=status.HTTP_200_OK,
        )


class BatchSummaryView(APIView):
    """
    GET /inventory/batches/summary/
    Returns a summary of unresolved SIMs across all previous batches.
    Used before adding a new batch so the dealer can see the current state.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dealer = _get_user_dealer(request.user)
        base_qs = _dealer_sim_qs(request.user)

        batches = _dealer_batch_qs(request.user).order_by("-received_at")

        summary = []
        for batch in batches:
            batch_sims = base_qs.filter(batch=batch)
            summary.append({
                "id":           batch.id,
                "batch_number": batch.batch_number,
                "received_at":  batch.received_at.isoformat(),
                "total":        batch_sims.count(),
                "in_stock":     batch_sims.filter(status="in_stock", van_team__isnull=True).count(),
                "in_vans":      batch_sims.filter(status="in_stock", van_team__isnull=False).count(),
                "with_ba":      batch_sims.filter(status="issued", current_holder__isnull=False).count(),
                "registered":   batch_sims.filter(status="registered").count(),
                "activated":    batch_sims.filter(status="activated").count(),
                "lost_faulty":  batch_sims.filter(status__in=["lost", "faulty"]).count(),
                "returned":     batch_sims.filter(status="returned").count(),
            })

        return Response(summary)


class CarryForwardView(APIView):
    """
    POST /inventory/batches/carry-forward/
    Body: { "from_batch": 1, "to_batch": 2 }
    Moves all unresolved SIMs (in_stock, in_vans, with_ba, registered)
    from old batch to new batch. Activated and lost/faulty stay.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from_batch_id = request.data.get("from_batch")
        to_batch_id = request.data.get("to_batch")

        if not from_batch_id or not to_batch_id:
            return Response(
                {"detail": "from_batch and to_batch are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        base_qs = _dealer_sim_qs(request.user)

        try:
            from_batch = _dealer_batch_qs(request.user).get(pk=from_batch_id)
            to_batch = _dealer_batch_qs(request.user).get(pk=to_batch_id)
        except SIMBatch.DoesNotExist:
            return Response(
                {"detail": "Batch not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Only move unresolved SIMs — activated, lost, faulty stay on old batch
        moved = base_qs.filter(
            batch=from_batch,
            status__in=["in_stock", "issued", "registered"],
        ).update(batch=to_batch)

        return Response({
            "detail": f"{moved} SIMs carried forward to {to_batch.batch_number}.",
            "moved": moved,
        })

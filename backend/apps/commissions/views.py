from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound
from django.utils import timezone
from apps.reconciliation.models import ReconciliationRecord
from .models import CommissionRule, CommissionCycle, CommissionRecord, PayoutRecord, DeductionRule, DeductionRecord
from .serializers import (
    CommissionRuleSerializer,
    CommissionCycleSerializer,
    CommissionRecordSerializer,
    ApproveCommissionSerializer,
    PayoutRecordSerializer,
    DeductionRuleSerializer,
    DeductionRecordSerializer,
)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _get_user_dealer(user):
    """Return the dealer for the logged-in user, or None for admins/staff."""
    if user.is_staff:
        return None
    dealer = getattr(user, "dealer_org", None)
    if not dealer:
        try:
            dealer = user.dealer
        except Exception:
            pass
    return dealer


def _assert_finance_or_admin(user):
    """Only finance, dealer_owner, operations_manager, or staff may approve/reject/close."""
    allowed = {"finance", "dealer_owner", "operations_manager", "super_admin"}
    if user.is_staff:
        return
    if getattr(user, "role", None) not in allowed:
        raise PermissionDenied(
            "You do not have permission to perform this action.")


# ─── COMMISSION RULES ─────────────────────────────────────────────────────────

class CommissionRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionRule.objects.order_by("-created_at")
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs

    def perform_create(self, serializer):
        dealer = _get_user_dealer(self.request.user)
        if not dealer:
            # Staff can pass dealer explicitly
            serializer.save()
        else:
            serializer.save(dealer=dealer)


class CommissionRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommissionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionRule.objects.all()
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs


# ─── COMMISSION CYCLES ────────────────────────────────────────────────────────

class CommissionCycleListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionCycleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionCycle.objects.order_by("-created_at")
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs

    def perform_create(self, serializer):
        dealer = _get_user_dealer(self.request.user)

        # ── Overlap guard ──────────────────────────────────────────────────
        start = serializer.validated_data.get("start_date")
        end = serializer.validated_data.get("end_date")
        if dealer and start and end:
            overlap = CommissionCycle.objects.filter(
                dealer=dealer,
                start_date__lte=end,
                end_date__gte=start,
            ).exists()
            if overlap:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    "A cycle already exists that overlaps these dates. "
                    "Close or adjust the existing cycle first."
                )

        if dealer:
            serializer.save(dealer=dealer)
        else:
            serializer.save()


class CommissionCycleDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CommissionCycleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionCycle.objects.all()
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs


# ─── COMMISSION RECORDS ───────────────────────────────────────────────────────

class CommissionRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionRecord.objects.order_by("-created_at")
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)

        cycle = self.request.query_params.get("cycle")
        agent = self.request.query_params.get("agent")
        record_status = self.request.query_params.get("status")
        branch = self.request.query_params.get("branch")
        van_team = self.request.query_params.get("van_team")

        if cycle:
            qs = qs.filter(cycle_id=cycle)
        if agent:
            qs = qs.filter(agent_id=agent)
        if record_status:
            qs = qs.filter(status=record_status)
        if branch:
            qs = qs.filter(agent__branch_id=branch)
        if van_team:
            qs = qs.filter(agent__van_team_id=van_team)

        search = self.request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(agent__first_name__icontains=search) |
                Q(agent__last_name__icontains=search)
            )

        return qs

    def perform_create(self, serializer):
        record = serializer.save()
        record.gross_amount = record.active_sims * record.rate_per_sim
        record.net_amount = record.gross_amount - record.deductions
        record.save()


class CommissionRecordDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CommissionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = CommissionRecord.objects.all()
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)
        return qs

    def perform_update(self, serializer):
        record = serializer.save()
        record.gross_amount = record.active_sims * record.rate_per_sim
        record.net_amount = record.gross_amount - record.deductions
        record.save()


# ─── APPROVE / REJECT ─────────────────────────────────────────────────────────

class ApproveCommissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = CommissionRecord.objects.filter(
            pk=pk, status=CommissionRecord.Status.PENDING)
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)

        try:
            record = qs.get()
        except CommissionRecord.DoesNotExist:
            return Response(
                {"detail": "Record not found or already processed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ApproveCommissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        record.status = CommissionRecord.Status.APPROVED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.notes = serializer.validated_data.get("notes", "")
        record.save()

        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=record.agent,
            title="✅ Commission Approved",
            message=(
                f"Your commission of KES {record.net_amount} for cycle "
                f"'{record.cycle.name}' has been approved. "
                f"It will be included in the next payout."
            ),
            type=Notification.Type.FINANCE,
        )

        return Response(
            {"detail": f"Commission approved for {record.agent.full_name}."},
            status=status.HTTP_200_OK,
        )


class RejectCommissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = CommissionRecord.objects.filter(
            pk=pk, status=CommissionRecord.Status.PENDING)
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)

        try:
            record = qs.get()
        except CommissionRecord.DoesNotExist:
            return Response(
                {"detail": "Record not found or already processed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        record.status = CommissionRecord.Status.REJECTED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.notes = request.data.get("notes", "")
        record.save()

        from apps.notifications.models import Notification
        rejection_reason = request.data.get(
            "notes", "No specific reason provided.")
        Notification.objects.create(
            recipient=record.agent,
            title="❌ Commission Rejected",
            message=(
                f"Your commission of KES {record.net_amount} for cycle "
                f"'{record.cycle.name}' has been rejected.\n\n"
                f"Reason: {rejection_reason}\n\n"
                f"Please contact your manager for more information."
            ),
            type=Notification.Type.FINANCE,
        )

        return Response(
            {"detail": f"Commission rejected for {record.agent.full_name}."},
            status=status.HTTP_200_OK,
        )


# ─── PAYOUT RECORDS ───────────────────────────────────────────────────────────

class PayoutRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = PayoutRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = PayoutRecord.objects.order_by("-paid_at")
        if dealer:
            qs = qs.filter(commission_record__agent__dealer_org=dealer)

        commission_record = self.request.query_params.get("commission_record")
        if commission_record:
            qs = qs.filter(commission_record_id=commission_record)
        return qs

    def perform_create(self, serializer):
        _assert_finance_or_admin(self.request.user)
        payout = serializer.save(paid_by=self.request.user)
        record = payout.commission_record
        record.status = CommissionRecord.Status.PAID
        record.save()

        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=record.agent,
            title="💰 Payment Processed",
            message=(
                f"KES {payout.amount} has been paid to you for commission "
                f"cycle '{record.cycle.name}'. "
                f"Method: {payout.get_method_display()}. "
                f"Reference: {payout.transaction_ref or 'N/A'}"
            ),
            type=Notification.Type.FINANCE,
        )


class PayoutRecordDetailView(generics.RetrieveAPIView):
    serializer_class = PayoutRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = PayoutRecord.objects.all()
        if dealer:
            qs = qs.filter(commission_record__agent__dealer_org=dealer)
        return qs


# ─── CYCLE ACTIONS ────────────────────────────────────────────────────────────

class CloseCycleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = CommissionCycle.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(dealer=dealer)

        try:
            cycle = qs.get()
        except CommissionCycle.DoesNotExist:
            return Response({"detail": "Cycle not found."}, status=status.HTTP_404_NOT_FOUND)

        if cycle.status != CommissionCycle.Status.OPEN:
            return Response(
                {"detail": f"Cycle is already {cycle.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cycle.status = CommissionCycle.Status.CLOSED
        cycle.save()

        from apps.notifications.models import Notification
        agents = set(CommissionRecord.objects.filter(
            cycle=cycle).values_list("agent", flat=True))
        for agent_id in agents:
            Notification.objects.create(
                recipient_id=agent_id,
                title="📅 Commission Cycle Closed",
                message=(
                    f"Commission cycle '{cycle.name}' has been closed. "
                    f"Your pending commissions are now being processed for approval."
                ),
                type=Notification.Type.FINANCE,
            )

        return Response({"detail": f"Cycle '{cycle.name}' closed."}, status=status.HTTP_200_OK)


class GenerateCycleRecordsView(APIView):
    """
    POST /commissions/cycles/<pk>/generate-records/

    Body:
        { "report_ids": [1, 2, 5] }

    Rules:
    - Only OPEN cycles can receive new records.
    - report_ids must all belong to the same dealer and have status "done".
    - If ANY commission record derived from a report is approved or paid,
      that report is LOCKED and cannot be included — return 400 listing them.
    - After success, cycle.used_report_ids is updated (append, not overwrite)
      so the audit trail accumulates across multiple generate calls.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = CommissionCycle.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(dealer=dealer)

        try:
            cycle = qs.get()
        except CommissionCycle.DoesNotExist:
            return Response({"detail": "Cycle not found."}, status=404)

        if cycle.status != CommissionCycle.Status.OPEN:
            return Response({"detail": "Cycle is already closed."}, status=400)

        # ── Resolve dealer ────────────────────────────────────────────────────
        if not dealer:
            dealer = getattr(request.user, "dealer_org", None)
            if not dealer:
                try:
                    dealer = request.user.dealer
                except Exception:
                    return Response({"detail": "No dealer context."}, status=400)

        # ── Validate report_ids from request body ─────────────────────────────
        report_ids = request.data.get("report_ids", [])
        if not report_ids or not isinstance(report_ids, list):
            return Response(
                {"detail": "report_ids must be a non-empty list."},
                status=400,
            )

        from apps.reconciliation.models import SafaricomReport, ReconciliationRecord
        from apps.inventory.models import SIM

        reports_qs = SafaricomReport.objects.filter(
            id__in=report_ids,
            status="done",
            dealer=dealer,
        )
        found_ids = set(reports_qs.values_list("id", flat=True))
        missing = [r for r in report_ids if r not in found_ids]
        if missing:
            return Response(
                {"detail": f"Reports not found or not processed: {missing}"},
                status=400,
            )

        # ── Lock check ────────────────────────────────────────────────────────
        # A report is locked if commission records generated from it are
        # approved or paid.  We detect this by checking if any BA who appears
        # in that report already has an approved/paid record in ANY cycle
        # (not just this one — once money is approved it's untouchable).
        locked_reports = []
        for report in reports_qs:
            ba_ids_in_report = set(
                ReconciliationRecord.objects.filter(report=report)
                .exclude(identified_ba=None)
                .values_list("identified_ba", flat=True)
                .distinct()
            )
            if ba_ids_in_report:
                locked = CommissionRecord.objects.filter(
                    cycle=cycle,
                    agent_id__in=ba_ids_in_report,
                    status__in=["approved", "paid"],
                ).exists()
                if locked:
                    locked_reports.append(report.id)

        if locked_reports:
            return Response(
                {
                    "detail": (
                        "Some reports contain BAs with approved or paid commission records "
                        "in this cycle and cannot be re-included. Unlock or skip them."
                    ),
                    "locked_report_ids": locked_reports,
                },
                status=400,
            )

        # ── Commission rule ───────────────────────────────────────────────────
        import datetime
        today = datetime.date.today()
        rule = CommissionRule.objects.filter(
            dealer=dealer, is_active=True, effective_from__lte=today
        ).order_by("-effective_from").first()
        if not rule:
            return Response({"detail": "No active commission rule found."}, status=400)
        rate = float(rule.rate_per_active)

        # ── Aggregate recon records from SELECTED reports only ────────────────
        # Deduplicate serial numbers per BA per result across selected reports
        # so the same SIM in two reports is only counted once.
        recon_rows = (
            ReconciliationRecord.objects
            .filter(report__in=reports_qs, identified_ba__isnull=False)
            .exclude(result="ghost_sim")
            .values("identified_ba", "result", "serial_number")
            .distinct()
        )

        ba_data = {}
        for row in recon_rows:
            bid = row["identified_ba"]
            if bid not in ba_data:
                ba_data[bid] = {
                    "payable": set(), "rejected": set(),
                    "fraud": set(), "disputed": set(),
                }
            r = row["result"]
            serial = row["serial_number"]
            if r == "payable":
                ba_data[bid]["payable"].add(serial)
            elif r == "rejected":
                ba_data[bid]["rejected"].add(serial)
            elif r == "fraud":
                ba_data[bid]["fraud"].add(serial)
            elif r == "disputed":
                ba_data[bid]["disputed"].add(serial)

        # ── Clear pending records for BAs NOT in the selected reports ─────────
        # Ensures the cycle only reflects the currently selected reports.
        # Approved / paid records are never touched.
        ba_ids_in_selection = set(ba_data.keys())
        CommissionRecord.objects.filter(
            cycle=cycle,
            status=CommissionRecord.Status.PENDING,
        ).exclude(agent_id__in=ba_ids_in_selection).delete()

        created = 0
        updated = 0

        from apps.accounts.models import User as UserModel

        for bid, data in ba_data.items():
            try:
                ba = UserModel.objects.get(id=bid)
            except UserModel.DoesNotExist:
                continue
            # Verify this BA belongs to the dealer — mirrors _get_user_dealer logic
            ba_dealer = getattr(ba, "dealer_org", None)
            if not ba_dealer:
                try:
                    ba_dealer = ba.dealer
                except Exception:
                    ba_dealer = None
            if ba_dealer != dealer:
                continue

            internal_reg = SIM.objects.filter(
                current_holder=ba, status=SIM.Status.REGISTERED
            ).count()

            active = len(data["payable"])
            gross = round(active * rate, 2)

            from django.db.models import Sum as DSum
            ba_deductions = DeductionRecord.objects.filter(
                agent=ba,
                status="approved",
                settlement_mode="commission_deduction",
                settlement_cycle=cycle,
            ).aggregate(total=DSum("amount"))["total"] or 0
            net = round(gross - float(ba_deductions), 2)

            existing = CommissionRecord.objects.filter(
                cycle=cycle, agent=ba).first()
            if existing:
                if existing.status == "pending":
                    existing.claimed_sims = internal_reg
                    existing.active_sims = active
                    existing.rejected_sims = len(data["rejected"])
                    existing.fraud_sims = len(data["fraud"])
                    existing.disputed_sims = len(data["disputed"])
                    existing.not_in_report_sims = max(0, internal_reg - active)
                    existing.rate_per_sim = rate
                    existing.gross_amount = gross
                    existing.deductions = ba_deductions
                    existing.net_amount = net
                    existing.save()
                    updated += 1
                # approved / paid → skip, never overwrite
            else:
                CommissionRecord.objects.create(
                    cycle=cycle,
                    agent=ba,
                    claimed_sims=internal_reg,
                    active_sims=active,
                    rejected_sims=len(data["rejected"]),
                    fraud_sims=len(data["fraud"]),
                    disputed_sims=len(data["disputed"]),
                    not_in_report_sims=max(0, internal_reg - active),
                    not_in_inventory_sims=0,
                    rate_per_sim=rate,
                    gross_amount=gross,
                    deductions=ba_deductions,
                    net_amount=net,
                    status="pending",
                )
                created += 1

        # ── Update audit trail on cycle ───────────────────────────────────────
        existing_used = getattr(cycle, "used_report_ids", None) or []
        combined = list(set(existing_used + list(report_ids)))
        cycle.used_report_ids = combined
        cycle.save(update_fields=["used_report_ids"])

        # ── Notify finance/owner/ops ──────────────────────────────────────────
        from apps.notifications.models import Notification

        recipients = UserModel.objects.filter(
            role__in=["finance", "dealer_owner", "operations_manager"],
            dealer_org=dealer,
            is_active=True,
        )
        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title="📊 Commission Records Generated",
                message=(
                    f"Commission records generated for cycle '{cycle.name}'.\n\n"
                    f"Reports used: {list(report_ids)}\n"
                    f"Records created: {created}\n"
                    f"Records updated: {updated}\n"
                    f"Generated by: {request.user.full_name}\n\n"
                    f"Ready for review and approval in the Commission module."
                ),
                type=Notification.Type.FINANCE,
            )

        return Response({
            "detail":       f"Generated commission records from {len(report_ids)} report(s).",
            "reports_used": list(report_ids),
            "created":      created,
            "updated":      updated,
        })


class ListReportsForCycleView(APIView):
    """
    GET /commissions/cycles/<pk>/available-reports/

    Returns all done reports for the dealer, annotated with:
    - is_locked: bool  — true if any BA in this report has an approved/paid
                         commission record in THIS cycle
    - is_used:   bool  — true if this report is already in cycle.used_report_ids
    - locked_ba_count: int — how many BAs are locked (informational)

    Frontend uses this to render the checklist modal.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = CommissionCycle.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(dealer=dealer)

        try:
            cycle = qs.get()
        except CommissionCycle.DoesNotExist:
            return Response({"detail": "Cycle not found."}, status=404)

        if not dealer:
            dealer = getattr(request.user, "dealer_org", None)
            if not dealer:
                try:
                    dealer = request.user.dealer
                except Exception:
                    return Response({"detail": "No dealer context."}, status=400)

        from apps.reconciliation.models import SafaricomReport, ReconciliationRecord

        reports = (
            SafaricomReport.objects
            .filter(status="done", dealer=dealer)
            .order_by("-uploaded_at")   # newest first
        )

        used_ids = set(getattr(cycle, "used_report_ids", None) or [])

        results = []
        for r in reports:
            try:
                ba_ids = set(
                    ReconciliationRecord.objects.filter(report=r)
                    .exclude(identified_ba=None)
                    .values_list("identified_ba", flat=True)
                    .distinct()
                )
                locked_ba_count = 0
                is_locked = False
                if ba_ids:
                    locked_qs = CommissionRecord.objects.filter(
                        cycle=cycle,
                        agent_id__in=ba_ids,
                        status__in=["approved", "paid"],
                    )
                    locked_ba_count = locked_qs.count()
                    is_locked = locked_ba_count > 0

                period_start = getattr(r, "period_start", None)
                period_end = getattr(r, "period_end", None)
                period = f"{period_start} → {period_end}" if period_start and period_end else ""

                results.append({
                    "id":              r.id,
                    "filename":        getattr(r, "filename", None) or getattr(r, "file_name", None) or f"Report #{r.id}",
                    "period":          period,
                    "period_start":    period_start,
                    "period_end":      period_end,
                    "total_records":   getattr(r, "total_records", None) or getattr(r, "record_count", 0) or 0,
                    "matched":         getattr(r, "matched", None) or getattr(r, "matched_count", 0) or 0,
                    "uploaded_at":     r.uploaded_at.isoformat(),
                    "is_locked":       is_locked,
                    "locked_ba_count": locked_ba_count,
                    "is_used":         r.id in used_ids,
                })
            except Exception as e:
                import traceback
                results.append({"id": r.id, "error": str(
                    e), "trace": traceback.format_exc()})

        return Response(results)


# ─── DEDUCTION RULES ──────────────────────────────────────────────────────────

class DeductionRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = DeductionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = DeductionRule.objects.order_by("-created_at")
        if dealer:
            qs = qs.filter(dealer=dealer)
        else:
            # Staff: allow optional filter by dealer
            dealer_id = self.request.query_params.get("dealer")
            if dealer_id:
                qs = qs.filter(dealer_id=dealer_id)
        return qs


class DeductionRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeductionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = DeductionRule.objects.all()
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs


# ─── DEDUCTION RECORDS ────────────────────────────────────────────────────────

class DeductionRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = DeductionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = DeductionRecord.objects.select_related(
            "agent", "rule", "raised_by", "approved_by"
        ).order_by("-created_at")

        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)
        else:
            # Staff: allow optional filter
            dealer_id = self.request.query_params.get("dealer")
            if dealer_id:
                qs = qs.filter(agent__dealer_org_id=dealer_id)

        record_status = self.request.query_params.get("status")
        agent = self.request.query_params.get("agent")
        if record_status:
            qs = qs.filter(status=record_status)
        if agent:
            qs = qs.filter(agent_id=agent)

        return qs

    def perform_create(self, serializer):
        deduction = serializer.save(
            raised_by=self.request.user,
            status=DeductionRecord.Status.PENDING,
        )

        from apps.notifications.models import Notification
        violation_display = deduction.get_violation_type_display()
        settlement_text = (
            "will be deducted from your next commission payout"
            if deduction.settlement_mode == "commission_deduction"
            else "requires repayment (standalone deduction)"
        )
        Notification.objects.create(
            recipient=deduction.agent,
            title="⚠️ Deduction Raised Against Your Account",
            message=(
                f"A deduction of KES {deduction.amount} has been raised against your account.\n\n"
                f"Violation: {violation_display}\n"
                f"Reason: {deduction.reason or 'No specific reason provided'}\n\n"
                f"This {settlement_text}.\n\n"
                f"Raised by: {self.request.user.full_name}\n"
                f"Status: Pending Review"
            ),
            type=Notification.Type.FINANCE,
        )


class DeductionRecordDetailView(generics.RetrieveAPIView):
    serializer_class = DeductionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = DeductionRecord.objects.all()
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)
        return qs


class ApproveDeductionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = DeductionRecord.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)

        try:
            record = qs.get()
        except DeductionRecord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if record.status != DeductionRecord.Status.PENDING:
            return Response({"detail": "Only pending records can be approved."}, status=400)

        record.status = DeductionRecord.Status.APPROVED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.save()

        from django.db.models import Sum
        commission = CommissionRecord.objects.filter(
            agent=record.agent,
            status="pending",
        ).first()
        if commission:
            total_deductions = DeductionRecord.objects.filter(
                agent=record.agent,
                status="approved",
                settlement_mode="commission_deduction",
                settlement_cycle=commission.cycle,   # ← add this line
            ).aggregate(total=Sum("amount"))["total"] or 0
            commission.deductions = total_deductions
            commission.net_amount = round(
                float(commission.gross_amount) - float(total_deductions), 2)
            commission.save()
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=record.agent,
            title="Deduction Approved",
            message=(
                f"A deduction of KES {record.amount} has been approved against your account. "
                f"Reason: {record.reason or record.get_violation_type_display()}. "
                f"It will be deducted from your next commission payout."
                if record.settlement_mode == "commission_deduction"
                else f"A standalone deduction of KES {record.amount} requires repayment. "
                f"Reason: {record.reason or record.get_violation_type_display()}."
            ),
            type=Notification.Type.FINANCE,
        )

        return Response(DeductionRecordSerializer(record).data)


class DismissDeductionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = DeductionRecord.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)

        try:
            record = qs.get()
        except DeductionRecord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if record.status != DeductionRecord.Status.PENDING:
            return Response({"detail": "Only pending records can be dismissed."}, status=400)

        record.status = DeductionRecord.Status.DISMISSED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.save()

        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=record.agent,
            title="✅ Deduction Dismissed",
            message=(
                f"The deduction of KES {record.amount} raised against your account "
                f"has been DISMISSED.\n\n"
                f"Violation: {record.get_violation_type_display()}\n"
                f"Reason: {record.reason or 'No specific reason provided'}\n\n"
                f"Dismissed by: {request.user.full_name}\n\n"
                f"No action is required from you."
            ),
            type=Notification.Type.FINANCE,
        )

        return Response(DeductionRecordSerializer(record).data)


class DeductionPendingCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dealer = _get_user_dealer(request.user)
        qs = DeductionRecord.objects.filter(
            status=DeductionRecord.Status.PENDING)
        if dealer:
            qs = qs.filter(agent__dealer_org=dealer)
        else:
            # Staff: allow optional filter
            dealer_id = request.query_params.get("dealer")
            if dealer_id:
                qs = qs.filter(agent__dealer_org_id=dealer_id)
        return Response({"count": qs.count()})


# ─── BA SIM BREAKDOWN ─────────────────────────────────────────────────────────

class BASimBreakdownView(APIView):
    """
    GET /commissions/ba-sim-breakdown/?ba_id=5&start_date=2024-01-01&end_date=2024-01-31
    Returns a per-SIM accountability report for a BA within a date range.
    Cross-references inventory movements with Safaricom reconciliation results.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        _assert_finance_or_admin(request.user)

        ba_id = request.query_params.get("ba_id")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not ba_id:
            return Response({"detail": "ba_id is required."}, status=400)

        from apps.accounts.models import User as UserModel
        from apps.inventory.models import SIM, SIMMovement
        from apps.reconciliation.models import ReconciliationRecord

        dealer = _get_user_dealer(request.user)

        try:
            ba = UserModel.objects.get(id=ba_id)
        except UserModel.DoesNotExist:
            return Response({"detail": "BA not found."}, status=404)

        if dealer and ba.dealer_org != dealer:
            raise PermissionDenied("This BA does not belong to your dealer.")

        # Date range applies to Safaricom report period, not when SIMs were issued
        movements_qs = SIMMovement.objects.filter(
            to_user=ba,
            movement_type="issue",
        ).select_related("sim").order_by("created_at")

        # Unique serials — keep earliest issuance date per serial
        serial_to_issued_at = {}
        for m in movements_qs:
            if m.sim and m.sim.serial_number not in serial_to_issued_at:
                serial_to_issued_at[m.sim.serial_number] = m.created_at

        serials_issued = list(serial_to_issued_at.keys())

        # Current SIM status from inventory
        sims = {
            s.serial_number: s
            for s in SIM.objects.filter(serial_number__in=serials_issued)
        }

        # Best reconciliation result per serial — filtered by REPORT PERIOD, not issue date
        recon_qs = ReconciliationRecord.objects.filter(
            serial_number__in=serials_issued,
        ).order_by("-created_at")

        if start_date:
            recon_qs = recon_qs.filter(report__period_start__gte=start_date)
        if end_date:
            recon_qs = recon_qs.filter(report__period_end__lte=end_date)

        recon_map = {}
        for r in recon_qs:
            if r.serial_number not in recon_map:
                recon_map[r.serial_number] = r
        recon_map = {}
        for r in ReconciliationRecord.objects.filter(
            serial_number__in=serials_issued,
        ).order_by("-created_at"):
            if r.serial_number not in recon_map:
                recon_map[r.serial_number] = r

        # Build per-SIM result rows
        rows = []
        for serial in serials_issued:
            sim = sims.get(serial)
            recon = recon_map.get(serial)

            recon_result = recon.result if recon else "not_in_report"
            verdict = (
                "✅ Payable" if recon_result == "payable" else
                "❌ Rejected" if recon_result == "rejected" else
                "🚩 Fraud" if recon_result == "fraud" else
                "⚠️ Disputed" if recon_result == "dispute" else
                "👻 Ghost SIM" if recon_result == "ghost_sim" else
                "🔍 Not in Report"
            )

            rows.append({
                "serial_number":    serial,
                "current_status":   sim.status if sim else "unknown",
                "recon_result":     recon_result,
                "verdict":          verdict,
                "commission_amount": float(recon.commission_amount) if recon and recon.commission_amount else 0.0,
                "fraud_flag":       recon.fraud_flag if recon else False,
                "ba_msisdn":        recon.ba_msisdn if recon else None,
                "topup_amount":     float(recon.topup_amount) if recon and recon.topup_amount else 0.0,
                "issued_at":        serial_to_issued_at[serial].isoformat(),
            })

        # Sort: "not_in_report" first — those are the problem SIMs Kevin needs to answer for
        priority = {"not_in_report": 0, "rejected": 1, "fraud": 2,
                    "dispute": 3, "payable": 4, "ghost_sim": 5}
        rows.sort(key=lambda x: (priority.get(
            x["recon_result"], 9), x["serial_number"]))

        confirmed = sum(1 for r in rows if r["recon_result"] == "payable")
        missing = sum(1 for r in rows if r["recon_result"] == "not_in_report")
        rejected = sum(1 for r in rows if r["recon_result"] == "rejected")
        fraud = sum(1 for r in rows if r["fraud_flag"])
        total_commission = sum(r["commission_amount"] for r in rows)

        return Response({
            "ba_id":            ba.id,
            "ba_name":          ba.full_name,
            "total_issued":     len(serials_issued),
            "confirmed":        confirmed,
            "not_in_report":    missing,
            "rejected":         rejected,
            "fraud_flagged":    fraud,
            "total_commission": round(total_commission, 2),
            "sims":             rows,
        })

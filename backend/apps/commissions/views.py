from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
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


class CommissionRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CommissionRule.objects.all().order_by("-created_at")


class CommissionRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommissionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CommissionRule.objects.all()


class CommissionCycleListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionCycleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CommissionCycle.objects.all().order_by("-created_at")


class CommissionCycleDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CommissionCycleSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CommissionCycle.objects.all()


class CommissionRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = CommissionRecord.objects.all().order_by("-created_at")
        cycle = self.request.query_params.get("cycle")
        agent = self.request.query_params.get("agent")
        status = self.request.query_params.get("status")
        if cycle:
            qs = qs.filter(cycle_id=cycle)
        if agent:
            qs = qs.filter(agent_id=agent)
        if status:
            qs = qs.filter(status=status)

        branch = self.request.query_params.get("branch")
        van_team = self.request.query_params.get("van_team")
        if branch:
            qs = qs.filter(agent__branch_id=branch)
        if van_team:
            qs = qs.filter(agent__van_team_id=van_team)

        return qs

    def perform_create(self, serializer):
        record = serializer.save()
        record.gross_amount = record.active_sims * record.rate_per_sim
        record.net_amount = record.gross_amount - record.deductions
        record.save()


class CommissionRecordDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = CommissionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CommissionRecord.objects.all()

    def perform_update(self, serializer):
        record = serializer.save()
        record.gross_amount = record.active_sims * record.rate_per_sim
        record.net_amount = record.gross_amount - record.deductions
        record.save()


class ApproveCommissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            record = CommissionRecord.objects.get(
                pk=pk, status=CommissionRecord.Status.PENDING)
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

        # ─── NOTIFICATION ─────────────────────────────────────────
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
        # ───────────────────────────────────────────────────────────────────

        return Response(
            {"detail": f"Commission approved for {record.agent.full_name}."},
            status=status.HTTP_200_OK,
        )


class RejectCommissionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            record = CommissionRecord.objects.get(
                pk=pk, status=CommissionRecord.Status.PENDING)
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

        # ─── NOTIFICATION ─────────────────────────────────────────
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
        # ───────────────────────────────────────────────────────────────────

        return Response(
            {"detail": f"Commission rejected for {record.agent.full_name}."},
            status=status.HTTP_200_OK,
        )


class PayoutRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = PayoutRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PayoutRecord.objects.all().order_by("-paid_at")
        commission_record = self.request.query_params.get("commission_record")
        if commission_record:
            qs = qs.filter(commission_record_id=commission_record)
        return qs

    def perform_create(self, serializer):
        payout = serializer.save(paid_by=self.request.user)
        record = payout.commission_record
        record.status = CommissionRecord.Status.PAID
        record.save()

        # ─── NOTIFICATION ─────────────────────────────────────────
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
    queryset = PayoutRecord.objects.all()


class CloseCycleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            cycle = CommissionCycle.objects.get(pk=pk)
        except CommissionCycle.DoesNotExist:
            return Response(
                {"detail": "Cycle not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if cycle.status != CommissionCycle.Status.OPEN:
            return Response(
                {"detail": f"Cycle is already {cycle.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cycle.status = CommissionCycle.Status.CLOSED
        cycle.save()

        # ─── NOTIFICATION (to all agents with records in this cycle) ───
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
        # ──────────────────────────────────────────────────────────────────────

        return Response(
            {"detail": f"Cycle '{cycle.name}' closed."},
            status=status.HTTP_200_OK,
        )


class GenerateCycleRecordsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            cycle = CommissionCycle.objects.get(pk=pk)
        except CommissionCycle.DoesNotExist:
            return Response({"detail": "Cycle not found."}, status=404)

        if cycle.status != CommissionCycle.Status.OPEN:
            return Response({"detail": "Cycle is already closed."}, status=400)

        dealer = getattr(request.user, "dealer_org", None)
        if not dealer:
            try:
                dealer = request.user.dealer
            except Exception:
                return Response({"detail": "No dealer context."}, status=400)

        # Get commission rate
        import datetime
        today = datetime.date.today()
        rule = CommissionRule.objects.filter(
            dealer=dealer, is_active=True, effective_from__lte=today
        ).order_by("-effective_from").first()
        if not rule:
            return Response({"detail": "No active commission rule found."}, status=400)
        rate = float(rule.rate_per_active)

        # All reports within cycle period
        from apps.reconciliation.models import ReconciliationRecord, SafaricomReport
        from apps.inventory.models import SIM
        from django.db.models import Count, Q

        reports = SafaricomReport.objects.filter(
            status="done",
            processed_at__date__gte=cycle.start_date,
            processed_at__date__lte=cycle.end_date,
        )

        # Sum across all reports per BA
        recon_rows = (
            ReconciliationRecord.objects
            .filter(report__in=reports, identified_ba__isnull=False)
            .exclude(result="ghost_sim")
            .values("identified_ba", "result")
            .annotate(cnt=Count("id"))
        )

        ba_data = {}
        for row in recon_rows:
            bid = row["identified_ba"]
            if bid not in ba_data:
                ba_data[bid] = {"payable": 0, "rejected": 0,
                                "fraud": 0, "disputed": 0}
            r = row["result"]
            if r == "payable":
                ba_data[bid]["payable"] += row["cnt"]
            elif r == "rejected":
                ba_data[bid]["rejected"] += row["cnt"]
            elif r == "fraud":
                ba_data[bid]["fraud"] += row["cnt"]
            elif r == "disputed":
                ba_data[bid]["disputed"] += row["cnt"]
            elif r == "ghost_sim":
                ba_data[bid]["ghost"] = ba_data[bid].get(
                    "ghost", 0) + row["cnt"]

        created = 0
        updated = 0
        for bid, data in ba_data.items():
            from apps.accounts.models import User as UserModel
            try:
                ba = UserModel.objects.get(id=bid)
            except UserModel.DoesNotExist:
                continue

            internal_reg = SIM.objects.filter(
                current_holder=ba, status=SIM.Status.REGISTERED
            ).count()
            active = data["payable"]
            gross = round(active * rate, 2)

            existing = CommissionRecord.objects.filter(
                cycle=cycle, agent=ba).first()
            if existing:
                if existing.status in ["pending"]:
                    existing.claimed_sims = internal_reg
                    existing.active_sims = active
                    existing.rejected_sims = data["rejected"]
                    existing.fraud_sims = data["fraud"]
                    existing.disputed_sims = data["disputed"]
                    existing.not_in_report_sims = max(0, internal_reg - active)
                    existing.rate_per_sim = rate
                    existing.gross_amount = gross
                    existing.deductions = 0
                    existing.net_amount = gross
                    existing.save()
                    updated += 1
            else:
                CommissionRecord.objects.create(
                    cycle=cycle,
                    agent=ba,
                    claimed_sims=internal_reg,
                    active_sims=active,
                    rejected_sims=data["rejected"],
                    fraud_sims=data["fraud"],
                    disputed_sims=data["disputed"],
                    not_in_report_sims=max(0, internal_reg - active),
                    not_in_inventory_sims=0,
                    rate_per_sim=rate,
                    gross_amount=gross,
                    deductions=0,
                    net_amount=gross,
                    status="pending",
                )
                created += 1

        # ─── NOTIFICATION (after generation is complete) ───────────────────────
        from apps.notifications.models import Notification
        from apps.accounts.models import User as UserModel

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
                    f"Commission records have been generated for cycle '{cycle.name}'.\n\n"
                    f"Records created: {created}\n"
                    f"Records updated: {updated}\n"
                    f"Reports processed: {reports.count()}\n"
                    f"Generated by: {request.user.full_name}\n\n"
                    f"These records are now ready for review and approval. "
                    f"Please visit the Commission module to review pending approvals."
                ),
                type=Notification.Type.FINANCE,
            )
        # ───────────────────────────────────────────────────────────────────────

        return Response({
            "detail": f"Generated commission records from {reports.count()} reports.",
            "reports_used": reports.count(),
            "created": created,
            "updated": updated,
        })


class DeductionRuleListCreateView(generics.ListCreateAPIView):
    serializer_class = DeductionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer_id = self.request.query_params.get("dealer")
        qs = DeductionRule.objects.all().order_by("-created_at")
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        return qs


class DeductionRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeductionRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DeductionRule.objects.all()


class DeductionRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = DeductionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = DeductionRecord.objects.select_related(
            "agent", "rule", "raised_by", "approved_by"
        ).order_by("-created_at")
        status = self.request.query_params.get("status")
        agent = self.request.query_params.get("agent")
        dealer = self.request.query_params.get("dealer")
        if status:
            qs = qs.filter(status=status)
        if agent:
            qs = qs.filter(agent_id=agent)
        if dealer:
            qs = qs.filter(agent__dealer_org_id=dealer)
        return qs

    def perform_create(self, serializer):
        deduction = serializer.save(
            raised_by=self.request.user,
            status=DeductionRecord.Status.PENDING,
        )

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
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
        # ───────────────────────────────────────────────────────────────────────


class DeductionRecordDetailView(generics.RetrieveAPIView):
    serializer_class = DeductionRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DeductionRecord.objects.all()


class ApproveDeductionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            record = DeductionRecord.objects.get(pk=pk)
        except DeductionRecord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if record.status != DeductionRecord.Status.PENDING:
            return Response({"detail": "Only pending records can be approved."}, status=400)

        record.status = DeductionRecord.Status.APPROVED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.save()

        # Notify the agent
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
        try:
            record = DeductionRecord.objects.get(pk=pk)
        except DeductionRecord.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if record.status != DeductionRecord.Status.PENDING:
            return Response({"detail": "Only pending records can be dismissed."}, status=400)

        record.status = DeductionRecord.Status.DISMISSED
        record.approved_by = request.user
        record.approved_at = timezone.now()
        record.save()

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
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
        # ───────────────────────────────────────────────────────────────────────

        return Response(DeductionRecordSerializer(record).data)


class DeductionPendingCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dealer_id = request.query_params.get("dealer")
        qs = DeductionRecord.objects.filter(
            status=DeductionRecord.Status.PENDING)
        if dealer_id:
            qs = qs.filter(agent__dealer_org_id=dealer_id)
        return Response({"count": qs.count()})

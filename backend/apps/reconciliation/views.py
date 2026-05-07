import io
import openpyxl
from string import ascii_uppercase

from django.db import models
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.utils.dateparse import parse_date

from .models import SafaricomReport, ReconciliationRecord, DEFAULT_COLUMN_MAPPING
from .serializers import (
    SafaricomReportSerializer,
    SafaricomReportListSerializer,
    ReconciliationRecordSerializer,
)
from apps.inventory.models import SIM, SIMMovement
from apps.dealers.models import MobiGo
from apps.commissions.models import CommissionRule, CommissionCycle, CommissionRecord
from apps.commissions.models import CommissionRecord as CR


def col_letter_to_index(letter: str) -> int:
    """Convert Excel column letter to 0-based index. A→0, B→1, F→5 etc."""
    letter = letter.upper().strip()
    result = 0
    for char in letter:
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def get_cell(row, col_letter: str, default=""):
    """Safely get a cell value from a row tuple using a column letter."""
    try:
        idx = col_letter_to_index(col_letter)
        cell = row[idx]
        return cell.value if cell.value is not None else default
    except (IndexError, AttributeError):
        return default


def normalize_msisdn(raw: str) -> str:
    """
    Normalize a Kenyan MSISDN to the local 9-digit form.
    +254754765166 → 754765166
    0754765166    → 754765166
    254754765166  → 754765166
    754765166     → 754765166
    """
    n = str(raw).strip().replace(" ", "").replace("-", "")
    if n.startswith("+254"):
        return n[4:]
    if n.startswith("254"):
        return n[3:]
    if n.startswith("0"):
        return n[1:]
    return n


class SafaricomReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SafaricomReportSerializer
        return SafaricomReportListSerializer

    def get_queryset(self):
        return SafaricomReport.objects.all().order_by("-uploaded_at")

    def perform_create(self, serializer):
        file_obj = self.request.FILES.get("file")
        filename = file_obj.name if file_obj else ""

        # Rebuild column_mapping from individual form fields
        mapping = DEFAULT_COLUMN_MAPPING.copy()
        for key in DEFAULT_COLUMN_MAPPING:
            val = self.request.data.get(f"column_mapping_{key}")
            if val:
                mapping[key] = val.strip().upper()

        serializer.save(
            uploaded_by=self.request.user,
            filename=filename,
            column_mapping=mapping,
        )


class SafaricomReportDetailView(generics.RetrieveAPIView):
    serializer_class = SafaricomReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = SafaricomReport.objects.all()


class ProcessReportView(APIView):
    """
    POST /api/reconciliation/{id}/process/
    Parses the uploaded Excel file, matches each row against:
      1. SIM inventory (by serial number)
      2. MobiGo (by ba_msisdn) to identify the BA
    Then determines result: payable / rejected / fraud / dispute / unmatched
    And calculates commission per record.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            report = SafaricomReport.objects.get(
                pk=pk, status=SafaricomReport.Status.PENDING)
        except SafaricomReport.DoesNotExist:
            return Response(
                {"detail": "Report not found or already processed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        report.status = SafaricomReport.Status.PROCESSING
        report.save()

        try:
            # ── Read the Excel file ───────────────────────────────────────────
            file_content = report.file.read()
            wb = openpyxl.load_workbook(
                io.BytesIO(file_content), read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows())

            # Skip header row
            data_rows = rows[1:] if len(rows) > 1 else []

            # ── Get column mapping ────────────────────────────────────────────
            mapping = report.get_column_mapping()
            col_serial = mapping.get("serial_number", "F")
            col_ba = mapping.get("ba_msisdn",     "J")
            col_agent = mapping.get("agent_msisdn",  "I")
            col_topup = mapping.get("topup_amount",  "H")
            col_date = mapping.get("topup_date",    "G")
            col_fraud = mapping.get("fraud_flag",    "P")

            # ── Get commission rule for this dealer ───────────────────────────
            # Resolve dealer from the uploader

            dealer = getattr(request.user, "dealer_org", None)

            commission_rule = None
            if dealer:
                commission_rule = CommissionRule.objects.filter(
                    dealer=dealer,
                    is_active=True,
                ).order_by("-effective_from").first()

            min_topup = float(
                commission_rule.minimum_topup) if commission_rule else 50.0
            rate_per_sim = float(
                commission_rule.rate_per_active) if commission_rule else 100.0

            # ── Process rows ──────────────────────────────────────────────────
            matched_count = 0
            unmatched_count = 0
            fraud_count = 0
            records = []

            # Track per-BA commission for auto-creating CommissionRecords later
            ba_commission: dict = {}  # ba_user_id → {sims: int, amount: float}

            for row in data_rows:
                serial = str(get_cell(row, col_serial, "")).strip()
                ba_msisdn = str(get_cell(row, col_ba,     "")).strip()
                agent_msisdn = str(get_cell(row, col_agent, "")).strip()
                topup_raw = get_cell(row, col_topup, 0)
                date_raw = get_cell(row, col_date,  None)
                fraud_raw = str(get_cell(row, col_fraud, "N")).strip().upper()

                if not serial:
                    continue  # skip empty rows

                # Parse topup amount
                try:
                    topup_amount = float(str(topup_raw).replace(
                        ",", "")) if topup_raw else 0.0
                except (ValueError, TypeError):
                    topup_amount = 0.0

                # Parse topup date
                topup_date = None
                if date_raw:
                    if hasattr(date_raw, "date"):
                        topup_date = date_raw.date()
                    else:
                        try:
                            topup_date = parse_date(
                                str(date_raw).split("T")[0])
                        except Exception:
                            topup_date = None

                # Is it fraud flagged by Safaricom?
                is_fraud = fraud_raw in ("Y", "YES", "1", "TRUE")

                # ── Step 1: Match SIM ─────────────────────────────────────────
                sim = None
                try:
                    sim = SIM.objects.get(serial_number=serial)
                    matched_count += 1
                except SIM.DoesNotExist:
                    unmatched_count += 1

                # ── Step 2: Identify BA from ba_msisdn via MobiGo ─────────────────
                identified_ba = None
                if ba_msisdn:
                    normalized = normalize_msisdn(ba_msisdn)
                    # Match against any stored format
                    mobigo = MobiGo.objects.filter(
                        is_active=True,
                    ).filter(
                        models.Q(ba_msisdn=normalized) |
                        models.Q(ba_msisdn=f"+254{normalized}") |
                        models.Q(ba_msisdn=f"254{normalized}") |
                        models.Q(ba_msisdn=f"0{normalized}")
                    ).select_related("assigned_ba").first()

                    if mobigo and mobigo.assigned_ba:
                        identified_ba = mobigo.assigned_ba

                # ── Step 3: Determine result ──────────────────────────────────
                result = ReconciliationRecord.Result.UNMATCHED
                rejection_reason = ""
                commission_amount = 0.0
                sim_status = ReconciliationRecord.SimStatus.ACTIVE

                if is_fraud:
                    result = ReconciliationRecord.Result.FRAUD
                    sim_status = ReconciliationRecord.SimStatus.FRAUD_FLAGGED
                    fraud_count += 1
                    if sim:
                        sim.status = SIM.Status.FRAUD_FLAGGED
                        sim.save()
                        SIMMovement.objects.create(
                            sim=sim,
                            movement_type=SIMMovement.MovementType.FLAG,
                            from_user=sim.current_holder,
                            from_branch=sim.branch,
                            notes=f"Fraud flagged by Safaricom — Report ID {report.id}",
                            created_by=request.user,
                        )

                        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
                        from apps.notifications.models import Notification

                        # Notify the BA who holds this SIM
                        if sim.current_holder:
                            Notification.objects.create(
                                recipient=sim.current_holder,
                                title="🚨 Fraud Alert - SIM Flagged",
                                message=(
                                    f"SIM {serial} has been flagged as FRAUD by Safaricom.\n\n"
                                    f"Report: {report.period_start} to {report.period_end}\n"
                                    f"Topup amount: KES {topup_amount}\n\n"
                                    f"This SIM has been blocked and will NOT earn commission.\n\n"
                                    f"Please contact your manager immediately for investigation."
                                ),
                                type=Notification.Type.ALERT,
                            )

                        # Notify finance/management
                        from apps.accounts.models import User as UserModel
                        dealer = sim.branch.dealer if sim.branch else None
                        if dealer:
                            finance_recipients = UserModel.objects.filter(
                                role__in=["finance", "dealer_owner",
                                          "operations_manager"],
                                dealer_org=dealer,
                                is_active=True,
                            )
                            for recipient in finance_recipients:
                                Notification.objects.create(
                                    recipient=recipient,
                                    title="🚨 Fraud Alert - Action Required",
                                    message=(
                                        f"SIM {serial} has been flagged as FRAUD by Safaricom.\n\n"
                                        f"BA: {sim.current_holder.full_name if sim.current_holder else 'Unknown'}\n"
                                        f"Report period: {report.period_start} to {report.period_end}\n"
                                        f"Topup amount: KES {topup_amount}\n\n"
                                        f"This requires immediate investigation."
                                    ),
                                    type=Notification.Type.ALERT,
                                )
                        # ───────────────────────────────────────────────────────────────────────

                elif sim is None:
                    if identified_ba is not None:
                        result = ReconciliationRecord.Result.GHOST_SIM
                        rejection_reason = (
                            f"Serial {serial} not in inventory — "
                            f"BA MSISDN {ba_msisdn} matched to {identified_ba.first_name} "
                            f"{identified_ba.last_name} but SIM was never issued through SimTrack"
                        )

                        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
                        from apps.notifications.models import Notification

                        # Notify the BA
                        if identified_ba:
                            Notification.objects.create(
                                recipient=identified_ba,
                                title="⚠️ Ghost SIM Detected",
                                message=(
                                    f"A SIM with serial number {serial} was found in the Safaricom report "
                                    f"associated with your MSISDN ({ba_msisdn}), but this SIM was NEVER "
                                    f"issued to you through SimTrack.\n\n"
                                    f"Report period: {report.period_start} to {report.period_end}\n"
                                    f"Topup amount: KES {topup_amount}\n\n"
                                    f"This is a SERIOUS compliance issue. Please contact your manager immediately."
                                ),
                                type=Notification.Type.ALERT,
                            )

                        # Notify finance/management
                        dealer = None
                        if identified_ba:
                            dealer = identified_ba.dealer_org

                        if dealer:
                            finance_recipients = UserModel.objects.filter(
                                role__in=["finance", "dealer_owner",
                                          "operations_manager"],
                                dealer_org=dealer,
                                is_active=True,
                            )
                            for recipient in finance_recipients:
                                Notification.objects.create(
                                    recipient=recipient,
                                    title="🚨 Ghost SIM Alert - Compliance Issue",
                                    message=(
                                        f"GHOST SIM detected!\n\n"
                                        f"Serial: {serial}\n"
                                        f"BA: {identified_ba.full_name} (MSISDN {ba_msisdn})\n"
                                        f"Report: {report.period_start} to {report.period_end}\n"
                                        f"Topup: KES {topup_amount}\n\n"
                                        f"This SIM was never issued through SimTrack. "
                                        f"This requires immediate investigation for potential fraud."
                                    ),
                                    type=Notification.Type.ALERT,
                                )
                        # ───────────────────────────────────────────────────────────────────────
                    else:
                        result = ReconciliationRecord.Result.UNMATCHED
                        rejection_reason = "Serial not found in inventory"

                elif identified_ba is None:
                    result = ReconciliationRecord.Result.REVIEW
                    rejection_reason = "BA MSISDN not matched to any MobiGo device"

                elif sim.current_holder_id != identified_ba.id:
                    result = ReconciliationRecord.Result.DISPUTE
                    rejection_reason = (
                        f"SIM held by user {sim.current_holder_id} "
                        f"but Safaricom reports BA {identified_ba.id}"
                    )

                    # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────────
                    from apps.notifications.models import Notification

                    # Notify the BA who holds the SIM
                    if sim.current_holder:
                        Notification.objects.create(
                            recipient=sim.current_holder,
                            title="⚠️ Dispute: SIM Ownership Mismatch",
                            message=(
                                f"A dispute has been recorded for SIM {serial}.\n\n"
                                f"Safaricom reports this SIM belongs to {identified_ba.full_name} "
                                f"(MSISDN {ba_msisdn}), but our records show you as the current holder.\n\n"
                                f"Report period: {report.period_start} to {report.period_end}\n\n"
                                f"Please contact your manager to resolve this discrepancy."
                            ),
                            type=Notification.Type.ALERT,
                        )

                    # Notify the identified BA (if different from current holder)
                    if identified_ba and identified_ba.id != sim.current_holder_id:
                        Notification.objects.create(
                            recipient=identified_ba,
                            title="⚠️ Dispute: SIM Ownership Mismatch",
                            message=(
                                f"A dispute has been recorded for SIM {serial}.\n\n"
                                f"Safaricom reports this SIM belongs to you (MSISDN {ba_msisdn}), "
                                f"but our records show it is held by {sim.current_holder.full_name if sim.current_holder else 'another user'}.\n\n"
                                f"Report period: {report.period_start} to {report.period_end}\n\n"
                                f"Please contact your manager to resolve this discrepancy."
                            ),
                            type=Notification.Type.ALERT,
                        )

                    # Notify managers
                    dealer = sim.branch.dealer if sim.branch else None
                    if dealer:
                        managers = UserModel.objects.filter(
                            role__in=["operations_manager", "dealer_owner"],
                            dealer_org=dealer,
                            is_active=True,
                        )
                        for manager in managers:
                            Notification.objects.create(
                                recipient=manager,
                                title="⚠️ Dispute Requires Resolution",
                                message=(
                                    f"SIM {serial} is in DISPUTE status.\n\n"
                                    f"Current holder: {sim.current_holder.full_name if sim.current_holder else 'Unknown'}\n"
                                    f"Safaricom BA: {identified_ba.full_name if identified_ba else 'Unknown'} (MSISDN {ba_msisdn})\n"
                                    f"Report: {report.period_start} to {report.period_end}\n\n"
                                    f"Please investigate and resolve the ownership discrepancy."
                                ),
                                type=Notification.Type.ALERT,
                            )
                    # ───────────────────────────────────────────────────────────────────────────
                elif topup_amount < min_topup:
                    result = ReconciliationRecord.Result.REJECTED
                    rejection_reason = (
                        f"Topup KES {topup_amount} below minimum KES {min_topup}"
                    )
                    sim_status = ReconciliationRecord.SimStatus.INACTIVE

                else:
                    # All checks pass — payable
                    result = ReconciliationRecord.Result.PAYABLE
                    commission_amount = rate_per_sim
                    sim_status = ReconciliationRecord.SimStatus.ACTIVE

                    # Mark SIM as registered
                    if sim:
                        sim.status = SIM.Status.ACTIVATED   # ← was REGISTERED
                        sim.save()
                        SIMMovement.objects.create(
                            sim=sim,
                            movement_type=SIMMovement.MovementType.REGISTER,
                            from_user=sim.current_holder,
                            from_branch=sim.branch,
                            notes=f"Confirmed active by Safaricom — KES {topup_amount} topup. Report ID {report.id}",
                            created_by=request.user,
                        )

                    # Accumulate BA commission
                    if identified_ba:
                        if identified_ba.id not in ba_commission:
                            ba_commission[identified_ba.id] = {
                                "user": identified_ba,
                                "sims": 0,
                                "amount": 0.0,
                            }
                        ba_commission[identified_ba.id]["sims"] += 1
                        ba_commission[identified_ba.id]["amount"] += commission_amount

                records.append(ReconciliationRecord(
                    report=report,
                    sim=sim,
                    serial_number=serial,
                    ba_msisdn=ba_msisdn,
                    agent_msisdn=agent_msisdn,
                    topup_amount=topup_amount,
                    topup_date=topup_date,
                    sim_status=sim_status,
                    fraud_flag=is_fraud,
                    identified_ba=identified_ba,
                    registered_by=identified_ba,
                    matched=sim is not None,
                    result=result,
                    rejection_reason=rejection_reason,
                    commission_amount=commission_amount,
                ))

            # ── Bulk create records ───────────────────────────────────────────
            ReconciliationRecord.objects.bulk_create(records)

            # ── Auto-create CommissionRecords per BA ──────────────────────────
            if commission_rule and dealer and ba_commission:
                cycle = CommissionCycle.objects.filter(
                    dealer=dealer,
                    status=CommissionCycle.Status.OPEN,
                ).first()

                if cycle:
                    from apps.inventory.models import SIM as SIMModel

                    for ba_id, data in ba_commission.items():
                        ba_user = data["user"]

                        # Claimed: SIMs this BA has registered in the system
                        claimed = SIMModel.objects.filter(
                            current_holder=ba_user,
                            status=SIMModel.Status.REGISTERED,
                        ).count()

                        # From reconciliation records for this BA in this report
                        ba_recon = ReconciliationRecord.objects.filter(
                            report=report,
                            identified_ba=ba_user,
                        )
                        payable_count = ba_recon.filter(
                            result=ReconciliationRecord.Result.PAYABLE).count()
                        fraud_count_ba = ba_recon.filter(
                            result=ReconciliationRecord.Result.FRAUD).count()
                        rejected_count = ba_recon.filter(
                            result=ReconciliationRecord.Result.REJECTED).count()
                        disputed_count = ba_recon.filter(
                            result=ReconciliationRecord.Result.DISPUTE).count()

                        # Not in inventory: rows where sim=None for this BA
                        not_in_inv = ReconciliationRecord.objects.filter(
                            report=report,
                            identified_ba=ba_user,
                            sim__isnull=True,
                        ).exclude(result=ReconciliationRecord.Result.GHOST_SIM).count()
                        # Ghost SIMs specifically — not in inventory but BA was identified
                        ghost_count = ba_recon.filter(
                            result=ReconciliationRecord.Result.GHOST_SIM).count()

                        # Not in report: claimed but Safaricom didn't confirm
                        not_in_report = max(0, claimed - payable_count)

                        # Gross = payable SIMs × rate
                        gross = payable_count * rate_per_sim
                        # Deductions = not_in_report × rate (they don't get paid for unclaimed)
                        deductions = not_in_report * rate_per_sim
                        net = gross  # deductions are informational only for now

                        existing = CommissionRecord.objects.filter(
                            cycle=cycle, agent_id=ba_id).first()

                        if existing:
                            existing.claimed_sims += claimed
                            existing.active_sims += payable_count
                            existing.not_in_report_sims += not_in_report
                            existing.not_in_inventory_sims += not_in_inv  # includes ghost_count
                            existing.fraud_sims += fraud_count_ba
                            existing.rejected_sims += rejected_count
                            existing.disputed_sims += disputed_count
                            existing.gross_amount = float(
                                existing.gross_amount) + gross
                            existing.deductions = float(
                                existing.deductions) + deductions
                            existing.net_amount = float(
                                existing.net_amount) + net
                            existing.save()
                        else:
                            CommissionRecord.objects.create(
                                cycle=cycle,
                                agent=ba_user,
                                claimed_sims=claimed,
                                active_sims=payable_count,
                                not_in_report_sims=not_in_report,
                                not_in_inventory_sims=not_in_inv,  # includes ghost_count
                                fraud_sims=fraud_count_ba,
                                rejected_sims=rejected_count,
                                disputed_sims=disputed_count,
                                rate_per_sim=rate_per_sim,
                                gross_amount=gross,
                                deductions=deductions,
                                net_amount=net,
                            )

            # ── Update report stats ───────────────────────────────────────────
            report.status = SafaricomReport.Status.DONE
            report.total_records = len(records)
            report.matched = matched_count
            report.unmatched = unmatched_count
            report.fraud_flagged = fraud_count
            report.processed_at = timezone.now()
            report.save()

            return Response({
                "detail":        "Report processed successfully.",
                "total_records": len(records),
                "matched":       matched_count,
                "unmatched":     unmatched_count,
                "fraud_flagged": fraud_count,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            report.status = SafaricomReport.Status.FAILED
            report.save()
            return Response(
                {"detail": f"Processing failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ReconciliationRecordListView(generics.ListAPIView):
    serializer_class = ReconciliationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ReconciliationRecord.objects.filter(
            report_id=self.kwargs["pk"]
        ).select_related("identified_ba", "sim")

        sim_status = self.request.query_params.get("sim_status")
        matched = self.request.query_params.get("matched")
        result = self.request.query_params.get("result")

        if sim_status:
            qs = qs.filter(sim_status=sim_status)
        if matched is not None:
            qs = qs.filter(matched=matched.lower() == "true")
        if result:
            qs = qs.filter(result=result)

        return qs.order_by("-created_at")


class ResetReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        from apps.accounts.models import User  # ← ADD THIS IMPORT
        from apps.notifications.models import Notification  # ← ADD THIS IMPORT

        try:
            report = SafaricomReport.objects.get(pk=pk)
        except SafaricomReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

        if report.status == SafaricomReport.Status.PROCESSING:
            return Response(
                {"detail": "Report is currently processing. Wait for it to finish."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Delete commission records linked to this report's BAs
        ba_ids = list(report.records.values_list(
            "identified_ba", flat=True).distinct())
        dealer = getattr(request.user, "dealer_org", None)
        if ba_ids and dealer:
            cycle = CommissionCycle.objects.filter(
                dealer=dealer,
                status=CommissionCycle.Status.OPEN,
            ).first()
            if cycle:
                CR.objects.filter(
                    cycle=cycle,
                    agent_id__in=ba_ids,
                    status="pending",
                ).delete()

        # Delete existing records and reset stats
        report.records.all().delete()
        report.status = SafaricomReport.Status.PENDING
        report.total_records = 0
        report.matched = 0
        report.unmatched = 0
        report.fraud_flagged = 0
        report.processed_at = None
        report.save()

        # ─── ADD THIS NOTIFICATION ─────────────────────────────────────────────
        # Notify ops managers and dealer owner
        if dealer:
            recipients = User.objects.filter(
                role__in=["operations_manager", "dealer_owner"],
                dealer_org=dealer,
                is_active=True,
            )

            for recipient in recipients:
                Notification.objects.create(
                    recipient=recipient,
                    title="🔄 Report Reset",
                    message=(
                        f"Safaricom report has been RESET to pending status.\n\n"
                        f"Report ID: {report.id}\n"
                        f"Period: {report.period_start} to {report.period_end}\n"
                        f"Reset by: {request.user.full_name}\n"
                        f"Files uploaded: {report.filename}\n\n"
                        f"All associated reconciliation records and pending commissions "
                        f"have been deleted. The report can now be reprocessed."
                    ),
                    type=Notification.Type.ALERT,
                )
        # ───────────────────────────────────────────────────────────────────────

        return Response({"detail": "Report reset to pending."}, status=status.HTTP_200_OK)

# ── Fraud Summary View ────────────────────────────────────────────────────────


class FraudSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Sum, Q
        from apps.inventory.models import SIM

        # ── KPIs ──────────────────────────────────────────────────────────────
        fraud_flagged_safaricom = ReconciliationRecord.objects.filter(
            result=ReconciliationRecord.Result.FRAUD
        ).count()

        unknown_ba = ReconciliationRecord.objects.filter(
            result=ReconciliationRecord.Result.UNMATCHED,
            identified_ba__isnull=True,
            sim__isnull=False,
        ).count()

        wrong_dealer = ReconciliationRecord.objects.filter(
            result=ReconciliationRecord.Result.UNMATCHED,
            sim__isnull=True,
        ).count()

        disputed = ReconciliationRecord.objects.filter(
            result=ReconciliationRecord.Result.DISPUTE
        ).count()

        agent_eq_ba = ReconciliationRecord.objects.filter(
            result=ReconciliationRecord.Result.FRAUD,
            agent_msisdn=models.F("ba_msisdn"),
        ).count()

        # ── Flagged Incidents ─────────────────────────────────────────────────
        fraud_records = ReconciliationRecord.objects.filter(
            result__in=[
                ReconciliationRecord.Result.FRAUD,
                ReconciliationRecord.Result.DISPUTE,
                ReconciliationRecord.Result.UNMATCHED,
            ]
        ).select_related(
            "report", "identified_ba", "sim__current_holder"
        ).order_by("-created_at")[:50]

        incidents = []
        for r in fraud_records:
            if r.result == ReconciliationRecord.Result.FRAUD:
                incident_type = "Fraud Flagged by Safaricom"
                severity = "critical"
                description = (
                    f"SIM {r.serial_number} was flagged as fraudulent. "
                    f"BA MSISDN: {r.ba_msisdn or '—'}. "
                    f"Topup: KES {r.topup_amount}."
                )
            elif r.result == ReconciliationRecord.Result.DISPUTE:
                incident_type = "MSISDN Mismatch — Disputed"
                severity = "high"
                ba_name = r.identified_ba.full_name if r.identified_ba else "Unknown"
                holder = r.sim.current_holder.full_name if r.sim and r.sim.current_holder else "Unknown"
                description = (
                    f"Report BA MSISDN {r.ba_msisdn} matched to {ba_name} "
                    f"but SIM is held by {holder}."
                )
            elif r.sim is None:
                incident_type = "Wrong Dealer SIM"
                severity = "high"
                description = (
                    f"Serial {r.serial_number} in Safaricom report does not exist "
                    f"in this dealer's inventory. BA MSISDN: {r.ba_msisdn or '—'}."
                )
            else:
                incident_type = "Unknown BA Phone"
                severity = "medium"
                description = (
                    f"BA MSISDN {r.ba_msisdn} could not be matched to any "
                    f"registered Brand Ambassador."
                )

            incidents.append({
                "id": r.id,
                "type": incident_type,
                "severity": severity,
                "description": description,
                "serial_number": r.serial_number,
                "ba_msisdn": r.ba_msisdn,
                "ba_name": r.identified_ba.full_name if r.identified_ba else None,
                "report_period": r.report.period_start.isoformat() if r.report.period_start else None,
                "topup_amount": str(r.topup_amount),
                "result": r.result,
                "created_at": r.created_at.isoformat(),
            })

# ── BA Risk Scores ────────────────────────────────────────────────────
        ba_stats = (
            ReconciliationRecord.objects.filter(identified_ba__isnull=False)
            .values(
                "identified_ba",
                "identified_ba__first_name",
                "identified_ba__last_name",
            )
            .annotate(
                total=Count("id"),
                fraud_count=Count("id", filter=Q(
                    result=ReconciliationRecord.Result.FRAUD)),
                dispute_count=Count("id", filter=Q(
                    result=ReconciliationRecord.Result.DISPUTE)),
                rejected_count=Count("id", filter=Q(
                    result=ReconciliationRecord.Result.REJECTED)),
            )
        )

        ba_risk = []
        for ba in ba_stats:
            total = ba["total"] or 1
            score = min(
                round(
                    (ba["fraud_count"] * 50 +
                     ba["dispute_count"] * 25 +
                     ba["rejected_count"] * 10) / total * 100
                ),
                100,
            )
            if score == 0 and ba["fraud_count"] == 0 and ba["dispute_count"] == 0:
                continue
            full_name = f"{ba['identified_ba__first_name']} {ba['identified_ba__last_name']}".strip(
            )
            ba_risk.append({
                "ba_id": ba["identified_ba"],
                "full_name": full_name,
                "risk_score": score,
                "total_sims": ba["total"],
                "fraud_count": ba["fraud_count"],
                "dispute_count": ba["dispute_count"],
                "rejected_count": ba["rejected_count"],
            })

        ba_risk.sort(key=lambda x: x["risk_score"], reverse=True)

        return Response({
            "kpis": {
                "fraud_flagged_safaricom": fraud_flagged_safaricom,
                "unknown_ba": unknown_ba,
                "wrong_dealer_sims": wrong_dealer,
                "disputed": disputed,
                "agent_eq_ba": agent_eq_ba,
            },
            "incidents": incidents,
            "ba_risk": ba_risk,
        })


class MyReconciliationHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.inventory.models import SIM
        records = ReconciliationRecord.objects.filter(
            identified_ba=request.user
        ).select_related("report", "sim").order_by("-report__period_end", "-created_at")

        data = []
        for r in records:
            data.append({
                "id":               r.id,
                "serial_number":    r.serial_number,
                "result":           r.result,
                "commission_amount": float(r.commission_amount) if r.commission_amount else 0,
                "rejection_reason": r.rejection_reason,
                "topup_amount":     float(r.topup_amount) if r.topup_amount else 0,
                "topup_date":       r.topup_date,
                "report_id":        r.report_id,
                "period_start":     r.report.period_start,
                "period_end":       r.report.period_end,
                "sim_status":       r.sim.status if r.sim else None,
            })

        return Response(data)


class RaiseComplaintView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.accounts.models import User, Notification
        serial = request.data.get("serial_number")
        record_id = request.data.get("record_id")
        message = request.data.get("message", "").strip()

        if not serial or not record_id:
            return Response({"error": "serial_number and record_id required"}, status=400)

        ba_name = f"{request.user.first_name} {request.user.last_name}".strip(
        ) or request.user.email

        recipients = User.objects.filter(
            role__in=["branch_manager", "operations_manager"],
            dealer=request.user.dealer,
            is_active=True,
        )

        note_title = f"Complaint: SIM {serial}"
        note_message = message or f"{ba_name} raised a complaint about SIM {serial} (Record #{record_id})"

        for recipient in recipients:
            Notification.objects.create(
                user=recipient,
                title=note_title,
                message=note_message,
                notification_type="complaint",
                related_object_id=record_id,
            )

        return Response({"detail": f"Complaint raised for {serial}. Managers notified."})

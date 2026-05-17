import io
import openpyxl
from string import ascii_uppercase

from django.db import models
from rest_framework import generics, status, permissions
from rest_framework.exceptions import PermissionDenied
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


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _get_user_dealer(user):
    """Return the dealer for the logged-in user, or None for staff/admins."""
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
    """Only finance, dealer_owner, operations_manager, or staff may process/reset reports."""
    allowed = {"finance", "dealer_owner", "operations_manager", "super_admin"}
    if user.is_staff:
        return
    if getattr(user, "role", None) not in allowed:
        raise PermissionDenied(
            "You do not have permission to perform this action.")


# ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

def col_letter_to_index(letter: str) -> int:
    letter = letter.upper().strip()
    result = 0
    for char in letter:
        result = result * 26 + (ord(char) - ord('A') + 1)
    return result - 1


def get_cell(row, col_letter: str, default=""):
    try:
        idx = col_letter_to_index(col_letter)
        cell = row[idx]
        return cell.value if cell.value is not None else default
    except (IndexError, AttributeError):
        return default


def normalize_msisdn(raw) -> str:
    # Handle Excel float corruption e.g. 700500050.0 or 7.005e+08
    try:
        raw = str(int(float(str(raw))))
    except (ValueError, TypeError):
        raw = str(raw)

    n = raw.strip().replace(" ", "").replace("-", "").replace("+", "")

    if n.startswith("254"):
        return n[3:]
    if n.startswith("0"):
        return n[1:]
    return n


# ─── SAFARICOM REPORTS ────────────────────────────────────────────────────────

class SafaricomReportListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SafaricomReportSerializer
        return SafaricomReportListSerializer

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = SafaricomReport.objects.order_by("-uploaded_at")
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs

    def perform_create(self, serializer):
        dealer = _get_user_dealer(self.request.user)
        file_obj = self.request.FILES.get("file")
        filename = file_obj.name if file_obj else ""

        mapping = DEFAULT_COLUMN_MAPPING.copy()
        for key in DEFAULT_COLUMN_MAPPING:
            val = self.request.data.get(f"column_mapping_{key}")
            if val:
                mapping[key] = val.strip().upper()

        kwargs = dict(uploaded_by=self.request.user,
                      filename=filename, column_mapping=mapping)
        if dealer:
            kwargs["dealer"] = dealer
        serializer.save(**kwargs)


class SafaricomReportDetailView(generics.RetrieveAPIView):
    serializer_class = SafaricomReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)
        qs = SafaricomReport.objects.all()
        if dealer:
            qs = qs.filter(dealer=dealer)
        return qs


# ─── PROCESS REPORT ───────────────────────────────────────────────────────────

class ProcessReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        dealer = _get_user_dealer(request.user)
        qs = SafaricomReport.objects.filter(
            pk=pk, status=SafaricomReport.Status.PENDING)
        if dealer:
            qs = qs.filter(dealer=dealer)

        try:
            report = qs.get()
        except SafaricomReport.DoesNotExist:
            return Response(
                {"detail": "Report not found or already processed."},
                status=status.HTTP_404_NOT_FOUND,
            )

        report.status = SafaricomReport.Status.PROCESSING
        report.save()

        try:
            file_content = report.file.read()
            wb = openpyxl.load_workbook(io.BytesIO(
                file_content), read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows())
            data_rows = rows[1:] if len(rows) > 1 else []

            mapping = report.get_column_mapping()
            col_serial = mapping.get("serial_number", "F")
            col_ba = mapping.get("ba_msisdn",     "J")
            col_agent = mapping.get("agent_msisdn",  "I")
            col_topup = mapping.get("topup_amount",  "H")
            col_date = mapping.get("topup_date",    "G")
            col_fraud = mapping.get("fraud_flag",    "P")

            # Resolve dealer from report (not just from request user — staff support)
            effective_dealer = dealer or report.dealer

            commission_rule = None
            if effective_dealer:
                commission_rule = CommissionRule.objects.filter(
                    dealer=effective_dealer,
                    is_active=True,
                ).order_by("-effective_from").first()

            min_topup = float(
                commission_rule.minimum_topup) if commission_rule else 50.0
            rate_per_sim = float(
                commission_rule.rate_per_active) if commission_rule else 100.0

            matched_count = 0
            unmatched_count = 0
            fraud_count = 0
            records = []
            ba_commission: dict = {}

            for row in data_rows:
                serial = str(get_cell(row, col_serial, "")).strip()
                ba_msisdn = str(get_cell(row, col_ba,     "")).strip()
                agent_msisdn = str(get_cell(row, col_agent,  "")).strip()
                topup_raw = get_cell(row, col_topup, 0)
                date_raw = get_cell(row, col_date,  None)
                fraud_raw = str(get_cell(row, col_fraud, "N")).strip().upper()

                if not serial:
                    continue

                try:
                    topup_amount = float(str(topup_raw).replace(
                        ",", "")) if topup_raw else 0.0
                except (ValueError, TypeError):
                    topup_amount = 0.0

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

                is_fraud = fraud_raw in ("Y", "YES", "1", "TRUE")

                # Match SIM — scoped to dealer's inventory
                sim = None
                try:
                    sim_qs = SIM.objects.filter(serial_number=serial)
                    if effective_dealer:
                        sim_qs = sim_qs.filter(branch__dealer=effective_dealer)
                    sim = sim_qs.get()
                    matched_count += 1
                except SIM.DoesNotExist:
                    unmatched_count += 1

                # Identify BA via MobiGo — scoped to dealer
                identified_ba = sim.current_holder if sim else None

                # Best-effort MSISDN dispute check (audit only — never blocks payment)
                msisdn_user = None
                result = ReconciliationRecord.Result.UNMATCHED
                rejection_reason = ""
                commission_amount = 0.0
                sim_status = ReconciliationRecord.SimStatus.ACTIVE

                if ba_msisdn and ba_msisdn not in ("", "0"):
                    from apps.accounts.models import User as UserModel
                    normalized_ba = normalize_msisdn(ba_msisdn)
                    msisdn_user = UserModel.objects.filter(
                        models.Q(phone=normalized_ba) |
                        models.Q(phone=f"+254{normalized_ba}") |
                        models.Q(phone=f"0{normalized_ba}")
                    ).first()
                    if is_fraud:
                        # ── Fraud flagged by Safaricom ────────────────────────────────────
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
                            from apps.notifications.models import Notification
                            if sim.current_holder:
                                Notification.objects.create(
                                    recipient=sim.current_holder,
                                    title="🚨 Fraud Alert - SIM Flagged",
                                    message=(
                                        f"SIM {serial} has been flagged as FRAUD by Safaricom.\n\n"
                                        f"Report: {report.period_start} to {report.period_end}\n"
                                        f"Topup amount: KES {topup_amount}\n\n"
                                        f"This SIM has been blocked and will NOT earn commission.\n\n"
                                        f"Please contact your manager immediately."
                                    ),
                                    type=Notification.Type.ALERT,
                                )
                            from apps.accounts.models import User as UserModel
                            fraud_dealer = sim.branch.dealer if sim.branch else effective_dealer
                            if fraud_dealer:
                                for recipient in UserModel.objects.filter(
                                    role__in=["finance", "dealer_owner",
                                              "operations_manager"],
                                    dealer_org=fraud_dealer,
                                    is_active=True,
                                ):
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

                    elif sim is None:
                        # ── Serial not in our inventory ───────────────────────────────────
                        result = ReconciliationRecord.Result.UNMATCHED
                        rejection_reason = "Serial not found in dealer inventory"

                    elif identified_ba is None:
                        # ── SIM exists but was never issued to anyone ─────────────────────
                        result = ReconciliationRecord.Result.REVIEW
                        rejection_reason = "SIM found in inventory but has no current holder"

                    elif msisdn_user and msisdn_user.id != identified_ba.id:
                        # ── MSISDN resolves to a DIFFERENT user than the SIM holder ───────
                        result = ReconciliationRecord.Result.DISPUTE
                        rejection_reason = (
                            f"SIM held by {identified_ba.full_name} but Safaricom MSISDN "
                            f"{ba_msisdn} matches {msisdn_user.full_name}"
                        )
                        from apps.notifications.models import Notification
                        from apps.accounts.models import User as UserModel
                        Notification.objects.create(
                            recipient=identified_ba,
                            title="⚠️ Dispute: SIM Ownership Mismatch",
                            message=(
                                f"A dispute has been recorded for SIM {serial}.\n\n"
                                f"Safaricom reports MSISDN {ba_msisdn} ({msisdn_user.full_name}) "
                                f"but our records show you as the current holder.\n\n"
                                f"Report period: {report.period_start} to {report.period_end}\n\n"
                                f"Please contact your manager to resolve this."
                            ),
                            type=Notification.Type.ALERT,
                        )
                        dispute_dealer = sim.branch.dealer if sim.branch else effective_dealer
                        if dispute_dealer:
                            for manager in UserModel.objects.filter(
                                role__in=["operations_manager",
                                          "dealer_owner"],
                                dealer_org=dispute_dealer,
                                is_active=True,
                            ):
                                Notification.objects.create(
                                    recipient=manager,
                                    title="⚠️ Dispute Requires Resolution",
                                    message=(
                                        f"SIM {serial} is in DISPUTE.\n\n"
                                        f"Current holder (inventory): {identified_ba.full_name}\n"
                                        f"Safaricom MSISDN {ba_msisdn}: {msisdn_user.full_name}\n"
                                        f"Report: {report.period_start} to {report.period_end}\n\n"
                                        f"Please investigate and resolve."
                                    ),
                                    type=Notification.Type.ALERT,
                                )

                    elif topup_amount < min_topup:
                        # ── Topup below threshold ─────────────────────────────────────────
                        result = ReconciliationRecord.Result.REJECTED
                        rejection_reason = f"Topup KES {topup_amount} below minimum KES {min_topup}"
                        sim_status = ReconciliationRecord.SimStatus.INACTIVE

                    else:
                        # ── All checks passed — commission payable ────────────────────────
                        result = ReconciliationRecord.Result.PAYABLE
                        commission_amount = rate_per_sim
                        sim_status = ReconciliationRecord.SimStatus.ACTIVE

                        sim.status = SIM.Status.ACTIVATED
                        sim.save()
                        SIMMovement.objects.create(
                            sim=sim,
                            movement_type=SIMMovement.MovementType.REGISTER,
                            from_user=sim.current_holder,
                            from_branch=sim.branch,
                            notes=f"Confirmed active by Safaricom — KES {topup_amount} topup. Report ID {report.id}",
                            created_by=request.user,
                        )

                        if identified_ba:
                            if identified_ba.id not in ba_commission:
                                ba_commission[identified_ba.id] = {
                                    "user": identified_ba, "sims": 0, "amount": 0.0,
                                }
                            ba_commission[identified_ba.id]["sims"] += 1
                            ba_commission[identified_ba.id]["amount"] += commission_amount

                            from apps.notifications.models import Notification
                            Notification.objects.create(
                                recipient=identified_ba,
                                title="✅ SIM Confirmed Active — Commission Earned",
                                message=(
                                    f"SIM {serial} has been confirmed active by Safaricom.\n\n"
                                    f"Topup: KES {topup_amount}\n"
                                    f"Commission: KES {commission_amount}\n"
                                    f"Period: {report.period_start} to {report.period_end}\n\n"
                                    f"This SIM will be included in your next commission payout."
                                ),
                                type=Notification.Type.FINANCE,
                            )

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

            ReconciliationRecord.objects.bulk_create(records)

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


# ─── RECONCILIATION RECORDS ───────────────────────────────────────────────────

class ReconciliationRecordListView(generics.ListAPIView):
    serializer_class = ReconciliationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        dealer = _get_user_dealer(self.request.user)

        # Verify the report belongs to this dealer before returning its records
        report_qs = SafaricomReport.objects.filter(pk=self.kwargs["pk"])
        if dealer:
            report_qs = report_qs.filter(dealer=dealer)
        if not report_qs.exists():
            return ReconciliationRecord.objects.none()

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


# ─── RESET REPORT ─────────────────────────────────────────────────────────────

class ResetReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        _assert_finance_or_admin(request.user)

        from apps.accounts.models import User
        from apps.notifications.models import Notification

        dealer = _get_user_dealer(request.user)
        qs = SafaricomReport.objects.filter(pk=pk)
        if dealer:
            qs = qs.filter(dealer=dealer)

        try:
            report = qs.get()
        except SafaricomReport.DoesNotExist:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)

        if report.status == SafaricomReport.Status.PROCESSING:
            return Response(
                {"detail": "Report is currently processing. Wait for it to finish."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ba_ids = list(report.records.values_list(
            "identified_ba", flat=True).distinct())
        effective_dealer = dealer or report.dealer
        if ba_ids and effective_dealer:
            cycle = CommissionCycle.objects.filter(
                dealer=effective_dealer,
                status=CommissionCycle.Status.OPEN,
            ).first()
            if cycle:
                CR.objects.filter(
                    cycle=cycle, agent_id__in=ba_ids, status="pending",
                ).delete()

        report.records.all().delete()
        report.status = SafaricomReport.Status.PENDING
        report.total_records = 0
        report.matched = 0
        report.unmatched = 0
        report.fraud_flagged = 0
        report.processed_at = None
        report.save()

        if effective_dealer:
            for recipient in User.objects.filter(
                role__in=["operations_manager", "dealer_owner"],
                dealer_org=effective_dealer,
                is_active=True,
            ):
                Notification.objects.create(
                    recipient=recipient,
                    title="🔄 Report Reset",
                    message=(
                        f"Safaricom report has been RESET to pending status.\n\n"
                        f"Report ID: {report.id}\n"
                        f"Period: {report.period_start} to {report.period_end}\n"
                        f"Reset by: {request.user.full_name}\n"
                        f"File: {report.filename}\n\n"
                        f"All associated reconciliation records and pending commissions "
                        f"have been deleted. The report can now be reprocessed."
                    ),
                    type=Notification.Type.ALERT,
                )

        return Response({"detail": "Report reset to pending."}, status=status.HTTP_200_OK)


# ─── FRAUD SUMMARY ────────────────────────────────────────────────────────────

class FraudSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Sum, Q

        dealer = _get_user_dealer(request.user)
        base_qs = ReconciliationRecord.objects.all()
        if dealer:
            base_qs = base_qs.filter(report__dealer=dealer)

        fraud_flagged_safaricom = base_qs.filter(
            result=ReconciliationRecord.Result.FRAUD
        ).count()

        unknown_ba = base_qs.filter(
            result=ReconciliationRecord.Result.UNMATCHED,
            identified_ba__isnull=True,
            sim__isnull=False,
        ).count()

        wrong_dealer = base_qs.filter(
            result=ReconciliationRecord.Result.UNMATCHED,
            sim__isnull=True,
        ).count()

        disputed = base_qs.filter(
            result=ReconciliationRecord.Result.DISPUTE
        ).count()

        agent_eq_ba = base_qs.filter(
            result=ReconciliationRecord.Result.FRAUD,
            agent_msisdn=models.F("ba_msisdn"),
        ).count()

        fraud_records = base_qs.filter(
            result__in=[
                ReconciliationRecord.Result.FRAUD,
                ReconciliationRecord.Result.DISPUTE,
                ReconciliationRecord.Result.UNMATCHED,
            ]
        ).select_related("report", "identified_ba", "sim__current_holder").order_by("-created_at")[:50]

        incidents = []
        for r in fraud_records:
            if r.result == ReconciliationRecord.Result.FRAUD:
                incident_type = "Fraud Flagged by Safaricom"
                severity = "critical"
                description = (
                    f"SIM {r.serial_number} was flagged as fraudulent. "
                    f"BA MSISDN: {r.ba_msisdn or '—'}. Topup: KES {r.topup_amount}."
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
                "id":           r.id,
                "type":         incident_type,
                "severity":     severity,
                "description":  description,
                "serial_number": r.serial_number,
                "ba_msisdn":    r.ba_msisdn,
                "ba_name":      r.identified_ba.full_name if r.identified_ba else None,
                "report_period": r.report.period_start.isoformat() if r.report.period_start else None,
                "topup_amount": str(r.topup_amount),
                "result":       r.result,
                "created_at":   r.created_at.isoformat(),
            })

        ba_stats = (
            base_qs.filter(identified_ba__isnull=False)
            .values("identified_ba", "identified_ba__first_name", "identified_ba__last_name")
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
                    (ba["fraud_count"] * 50 + ba["dispute_count"]
                     * 25 + ba["rejected_count"] * 10)
                    / total * 100
                ),
                100,
            )
            if score == 0 and ba["fraud_count"] == 0 and ba["dispute_count"] == 0:
                continue
            full_name = f"{ba['identified_ba__first_name']} {ba['identified_ba__last_name']}".strip(
            )
            ba_risk.append({
                "ba_id":          ba["identified_ba"],
                "full_name":      full_name,
                "risk_score":     score,
                "total_sims":     ba["total"],
                "fraud_count":    ba["fraud_count"],
                "dispute_count":  ba["dispute_count"],
                "rejected_count": ba["rejected_count"],
            })

        ba_risk.sort(key=lambda x: x["risk_score"], reverse=True)

        return Response({
            "kpis": {
                "fraud_flagged_safaricom": fraud_flagged_safaricom,
                "unknown_ba":             unknown_ba,
                "wrong_dealer_sims":      wrong_dealer,
                "disputed":               disputed,
                "agent_eq_ba":            agent_eq_ba,
            },
            "incidents": incidents,
            "ba_risk":   ba_risk,
        })


# ─── MY RECONCILIATION HISTORY (BA self-view) ─────────────────────────────────

class MyReconciliationHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # This is a self-view — always scoped to the requesting user
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


# ─── RAISE COMPLAINT ──────────────────────────────────────────────────────────

class RaiseComplaintView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.accounts.models import User
        from apps.notifications.models import Notification

        serial = request.data.get("serial_number")
        record_id = request.data.get("record_id")
        message = request.data.get("message", "").strip()

        if not serial or not record_id:
            return Response({"error": "serial_number and record_id required"}, status=400)

        # Verify the record belongs to the requesting user
        try:
            record = ReconciliationRecord.objects.get(
                pk=record_id, identified_ba=request.user)
        except ReconciliationRecord.DoesNotExist:
            return Response({"error": "Record not found or does not belong to you."}, status=404)

        dealer = _get_user_dealer(request.user)
        ba_name = request.user.full_name or request.user.email

        note_title = f"Complaint: SIM {serial}"
        note_message = message or f"{ba_name} raised a complaint about SIM {serial} (Record #{record_id})"

        if dealer:
            recipients = User.objects.filter(
                role__in=["branch_manager", "operations_manager"],
                dealer_org=dealer,
                is_active=True,
            )
        else:
            recipients = User.objects.none()

        for recipient in recipients:
            Notification.objects.create(
                recipient=recipient,
                title=note_title,
                message=note_message,
                type=Notification.Type.ALERT,
            )

        return Response({"detail": f"Complaint raised for {serial}. Managers notified."})

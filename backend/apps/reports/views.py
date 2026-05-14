# apps/reports/views.py
import datetime
from collections import defaultdict

from django.db.models import Count, Sum, Q
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils import timezone

from django.db import models

from .models import DailyPerformanceSnapshot
from .serializers import DailyPerformanceSnapshotSerializer

from apps.inventory.models import SIM, SIMMovement
from apps.reconciliation.models import ReconciliationRecord, SafaricomReport
from apps.dealers.models import VanTeam
from apps.accounts.models import User as UserModel


# ─── Dealer Resolution Helper ─────────────────────────────────────────────────

def _get_dealer_id(user):
    """
    Consistently resolve dealer_id for any user role.
    Returns None for staff/admin — they see everything.
    """
    if user.is_staff:
        return None

    # Non-owner staff (BA, branch manager, etc.) — direct FK
    dealer_id = getattr(user, "dealer_org_id", None)
    if dealer_id:
        return dealer_id

    # Dealer owner — linked via OneToOne on Dealer model, not FK on User
    try:
        return user.dealer.id
    except Exception:
        return None


# ─── Live Performance Summary ─────────────────────────────────────────────────

class LivePerformanceSummaryView(APIView):
    """
    GET /api/reports/live-summary/
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_estimated_commission(self, registered_count: int, dealer_id) -> float:
        from apps.commissions.models import CommissionRule
        try:
            today = datetime.date.today()
            rule = CommissionRule.objects.filter(
                dealer_id=dealer_id,
                is_active=True,
                effective_from__lte=today,
            ).filter(
                models.Q(effective_to__isnull=True) | models.Q(
                    effective_to__gte=today)
            ).order_by("-effective_from").first()
            if rule:
                return registered_count * float(rule.rate_per_active)
        except Exception:
            pass
        return registered_count * 100

    def get(self, request):
        user = request.user
        branch_id = request.query_params.get("branch")

        dealer_id = _get_dealer_id(user)

        van_team_id = request.query_params.get("van_team")
        ba_id = request.query_params.get("ba")

        base = SIM.objects.all()
        if dealer_id:
            base = base.filter(batch__branch__dealer_id=dealer_id)
        if branch_id:
            base = base.filter(branch_id=branch_id)
        if van_team_id:
            from apps.dealers.models import VanTeamMember
            member_ids = list(VanTeamMember.objects.filter(
                team_id=van_team_id
            ).values_list("agent_id", flat=True))
            base = base.filter(current_holder_id__in=member_ids)
        if ba_id:
            base = base.filter(current_holder_id=ba_id)

        in_field = base.filter(
            status=SIM.Status.ISSUED,
            current_holder__isnull=False,
        ).count()
        registered = base.filter(status=SIM.Status.REGISTERED).count()
        fraud = base.filter(status=SIM.Status.FRAUD_FLAGGED).count()
        in_stock = base.filter(status=SIM.Status.IN_STOCK,
                               van_team__isnull=True).count()

        # Filter SafaricomReports by dealer FK directly (not branch)
        recon_qs = SafaricomReport.objects.filter(status="done")
        if dealer_id:
            recon_qs = recon_qs.filter(branch__dealer_id=dealer_id)
        latest_report = recon_qs.order_by("-processed_at").first()

        confirmed = 0
        confirmed_commission = 0.0
        last_recon_date = None

        if latest_report:
            payable_qs = ReconciliationRecord.objects.filter(
                report=latest_report, result="payable"
            )
            confirmed = payable_qs.count()
            confirmed_commission = float(
                payable_qs.aggregate(t=Sum("commission_amount"))["t"] or 0
            )
            if latest_report.processed_at:
                last_recon_date = latest_report.processed_at.strftime(
                    "%b %d, %Y")

        ba_held_qs = (
            base.filter(
                status=SIM.Status.ISSUED,
                current_holder__isnull=False,
            )
            .values(
                "current_holder",
                "branch__id", "branch__name",
                "van_team__id", "van_team__name",
            )
            .annotate(sims_held=Count("id"))
        )
        ba_held = {r["current_holder"]: r for r in ba_held_qs}

        all_bas_qs = UserModel.objects.filter(
            role="brand_ambassador", is_active=True
        )
        if dealer_id:
            all_bas_qs = all_bas_qs.filter(dealer_org_id=dealer_id)
        if van_team_id:
            from apps.dealers.models import VanTeamMember
            van_member_ids = list(VanTeamMember.objects.filter(
                team_id=van_team_id
            ).values_list("agent_id", flat=True))
            all_bas_qs = all_bas_qs.filter(id__in=van_member_ids)
        if ba_id:
            all_bas_qs = all_bas_qs.filter(id=ba_id)

        ba_reg = {
            r["current_holder"]: r["cnt"]
            for r in base.filter(
                status=SIM.Status.REGISTERED, current_holder__isnull=False
            ).values("current_holder").annotate(cnt=Count("id"))
        }

        ba_fraud = {
            r["current_holder"]: r["cnt"]
            for r in base.filter(
                status=SIM.Status.FRAUD_FLAGGED, current_holder__isnull=False
            ).values("current_holder").annotate(cnt=Count("id"))
        }

        ba_conf = {}
        ba_comm = {}
        # Use activated SIMs from inventory as confirmed count — most reliable source
        for row in (
            base.filter(status=SIM.Status.ACTIVATED,
                        current_holder__isnull=False)
            .values("current_holder")
            .annotate(cnt=Count("id"))
        ):
            ba_conf[row["current_holder"]] = row["cnt"]

        if latest_report:
            for row in (
                ReconciliationRecord.objects.filter(
                    report=latest_report, result="payable",
                    identified_ba__isnull=False,
                )
                .values("identified_ba")
                .annotate(cnt=Count("id"), total=Sum("commission_amount"))
            ):
                # Prefer recon count if available, else fall back to activated count
                ba_conf[row["identified_ba"]] = row["cnt"]
                ba_comm[row["identified_ba"]] = float(row["total"] or 0)

        by_ba = []
        for ba in all_bas_qs:
            bid = ba.id
            held = ba_held.get(bid, {})
            by_ba.append({
                "id":            bid,
                "name":          ba.full_name,
                "branch_id":     held.get("branch__id"),
                "branch_name":   held.get("branch__name") or "—",
                "van_team_id":   held.get("van_team__id"),
                "van_team_name": held.get("van_team__name") or "Direct",
                "sims_in_field": held.get("sims_held", 0),
                "registered":    ba_reg.get(bid, 0),
                "confirmed":     ba_conf.get(bid, 0),
                "fraud_flags":   ba_fraud.get(bid, 0),
                "commission":    ba_comm.get(bid, 0),
            })

        from apps.dealers.models import Branch as BranchModel

        all_branches_qs = BranchModel.objects.filter(is_active=True)
        if dealer_id:
            all_branches_qs = all_branches_qs.filter(dealer_id=dealer_id)

        van_counts = {
            r["branch_id"]: r["cnt"]
            for r in VanTeam.objects.filter(is_active=True)
            .values("branch_id")
            .annotate(cnt=Count("id"))
        }

        branch_map: dict = {
            b.id: {
                "name": b.name,
                "sims_in_field": 0, "registered": 0,
                "confirmed": 0, "fraud_flags": 0, "commission": 0.0,
                "van_count": van_counts.get(b.id, 0),
            }
            for b in all_branches_qs
        }

        for ba in by_ba:
            if ba["branch_id"] and ba["branch_id"] in branch_map:
                d = branch_map[ba["branch_id"]]
                d["sims_in_field"] += ba["sims_in_field"]
                d["registered"] += ba["registered"]
                d["confirmed"] += ba["confirmed"]
                d["fraud_flags"] += ba["fraud_flags"]
                d["commission"] += ba["commission"]

        by_branch = [{"id": k, **v} for k, v in branch_map.items()]

        from apps.dealers.models import VanTeam as VanTeamModel, VanTeamMember

        all_vans_qs = VanTeamModel.objects.filter(
            is_active=True).select_related("branch")
        if dealer_id:
            all_vans_qs = all_vans_qs.filter(branch__dealer_id=dealer_id)

        van_map: dict = {
            v.id: {
                "name": v.name,
                "branch_name": v.branch.name if v.branch else "—",
                "sims_in_field": 0, "registered": 0,
                "confirmed": 0, "fraud_flags": 0, "commission": 0.0,
            }
            for v in all_vans_qs
        }

        ba_to_van = {
            m.agent_id: m.team_id
            for m in VanTeamMember.objects.filter(
                team__in=all_vans_qs
            ).only("agent_id", "team_id")
        }

        for ba in by_ba:
            van_id = ba.get("van_team_id") or ba_to_van.get(ba["id"])
            if van_id and van_id in van_map:
                d = van_map[van_id]
                d["sims_in_field"] += ba["sims_in_field"]
                d["registered"] += ba["registered"]
                d["confirmed"] += ba["confirmed"]
                d["fraud_flags"] += ba["fraud_flags"]
                d["commission"] += ba["commission"]

        by_van = [{"id": k, **v} for k, v in van_map.items()]

        today = datetime.date.today()
        trend = []
        for i in range(6, -1, -1):
            day = today - datetime.timedelta(days=i)
            mov_qs = SIMMovement.objects.filter(
                movement_type=SIMMovement.MovementType.REGISTER,
                created_at__date=day,
            )
            # Filter reconciliation records by dealer FK directly
            rec_qs = ReconciliationRecord.objects.filter(
                result="payable", topup_date=day,
            )
            if dealer_id:
                mov_qs = mov_qs.filter(sim__batch__branch__dealer_id=dealer_id)
                rec_qs = rec_qs.filter(report__branch__dealer_id=dealer_id)

            trend.append({
                "label":      day.strftime("%a"),
                "date":       day.isoformat(),
                "registered": mov_qs.count(),
                "confirmed":  rec_qs.count(),
            })

        return Response({
            "kpis": {
                "in_field":             in_field,
                "registered":           registered,
                "confirmed":            confirmed,
                "pending":              max(0, registered - confirmed),
                "fraud":                fraud,
                "in_stock":             in_stock,
                "estimated_commission": self._get_estimated_commission(registered, dealer_id),
                "confirmed_commission": confirmed_commission,
                "last_recon_date":      last_recon_date,
            },
            "by_ba":     by_ba,
            "by_branch": by_branch,
            "by_van":    by_van,
            "trend":     trend,
        })


# ── Snapshot CRUD ─────────────────────────────────────────────────────────────

class DailyPerformanceListView(generics.ListCreateAPIView):
    serializer_class = DailyPerformanceSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer_id = _get_dealer_id(self.request.user)
        qs = DailyPerformanceSnapshot.objects.all().order_by("-date")
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        if date := self.request.query_params.get("date"):
            qs = qs.filter(date=date)
        if branch := self.request.query_params.get("branch"):
            qs = qs.filter(branch_id=branch)
        return qs


class DailyPerformanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DailyPerformanceSnapshotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        dealer_id = _get_dealer_id(self.request.user)
        qs = DailyPerformanceSnapshot.objects.all()
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        return qs


# ── Aggregated Summary Views ──────────────────────────────────────────────────

class WeeklySummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dealer_id = _get_dealer_id(request.user)
        qs = DailyPerformanceSnapshot.objects.all()
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        if branch := request.query_params.get("branch"):
            qs = qs.filter(branch_id=branch)

        today = datetime.date.today()
        week_ago = today - datetime.timedelta(days=6)
        qs = qs.filter(date__range=[week_ago, today])

        data = (
            qs.values("date")
            .annotate(
                total_issued=Sum("sims_issued"),
                total_returned=Sum("sims_returned"),
                total_registered=Sum("sims_registered"),
                total_fraud=Sum("sims_fraud"),
            )
            .order_by("date")
        )
        return Response(list(data))


class AgentPerformanceSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dealer_id = _get_dealer_id(request.user)
        qs = DailyPerformanceSnapshot.objects.filter(agent__isnull=False)
        if dealer_id:
            qs = qs.filter(dealer_id=dealer_id)
        if branch := request.query_params.get("branch"):
            qs = qs.filter(branch_id=branch)

        data = (
            qs.values("agent", "agent__first_name", "agent__last_name")
            .annotate(
                total_issued=Sum("sims_issued"),
                total_returned=Sum("sims_returned"),
                total_registered=Sum("sims_registered"),
                total_fraud=Sum("sims_fraud"),
            )
            .order_by("-total_registered", "-confirmed")
        )
        return Response(list(data))


class DailySnapshotByDateView(APIView):
    """
    GET /api/reports/daily-by-date/?date=2026-05-04
    Returns live movement data for a specific date.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        dealer_id = _get_dealer_id(user)
        branch_id = request.query_params.get("branch")

        date_str = request.query_params.get("date")
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response(
                    {"detail": "Invalid date format. Use YYYY-MM-DD."},
                    status=400,
                )
        else:
            target_date = datetime.date.today()

        van_team_id = request.query_params.get("van_team")
        ba_id = request.query_params.get("ba")

        mov_qs = SIMMovement.objects.filter(
            created_at__date=target_date
        ).select_related("to_user", "from_user", "sim")

        if dealer_id:
            mov_qs = mov_qs.filter(sim__batch__branch__dealer_id=dealer_id)
        if branch_id:
            mov_qs = mov_qs.filter(sim__branch_id=branch_id)
        if van_team_id:
            from apps.dealers.models import VanTeamMember
            member_ids = list(VanTeamMember.objects.filter(
                team_id=van_team_id
            ).values_list("agent_id", flat=True))
            mov_qs = mov_qs.filter(
                models.Q(to_user_id__in=member_ids) |
                models.Q(from_user_id__in=member_ids)
            )
        if ba_id:
            mov_qs = mov_qs.filter(
                models.Q(to_user_id=ba_id) |
                models.Q(from_user_id=ba_id)
            )

        ba_data: dict = defaultdict(lambda: {
            "name": "—", "issued": 0, "returned": 0,
            "registered": 0, "transferred": 0,
        })

        for m in mov_qs:
            if m.movement_type == SIMMovement.MovementType.ISSUE and m.to_user:
                uid = m.to_user.id
                ba_data[uid]["name"] = m.to_user.full_name
                ba_data[uid]["issued"] += 1

            elif m.movement_type == SIMMovement.MovementType.RETURN and m.from_user:
                uid = m.from_user.id
                ba_data[uid]["name"] = m.from_user.full_name
                ba_data[uid]["returned"] += 1

            elif m.movement_type == SIMMovement.MovementType.REGISTER:
                user_ref = m.from_user or m.to_user
                if user_ref:
                    uid = user_ref.id
                    ba_data[uid]["name"] = user_ref.full_name
                    ba_data[uid]["registered"] += 1

            elif m.movement_type == SIMMovement.MovementType.TRANSFER:
                if m.to_user:
                    uid = m.to_user.id
                    ba_data[uid]["name"] = m.to_user.full_name
                    ba_data[uid]["transferred"] += 1

        total_issued = sum(v["issued"] for v in ba_data.values())
        total_returned = sum(v["returned"] for v in ba_data.values())
        total_registered = sum(v["registered"] for v in ba_data.values())

        # Filter reconciliation records by dealer FK directly
        recon_qs = ReconciliationRecord.objects.filter(
            result="payable", topup_date=target_date
        )
        if dealer_id:
            recon_qs = recon_qs.filter(report__branch__dealer_id=dealer_id)
        confirmed_today = recon_qs.count()

        from apps.commissions.models import CommissionRule
        commission_rate = 0.0
        try:
            rule = CommissionRule.objects.filter(
                is_active=True,
                effective_from__lte=target_date,
            ).filter(
                models.Q(effective_to__isnull=True) | models.Q(
                    effective_to__gte=target_date)
            )
            if dealer_id:
                rule = rule.filter(dealer_id=dealer_id)
            rule = rule.order_by("-effective_from").first()
            if rule:
                commission_rate = float(rule.rate_per_active)
        except Exception:
            commission_rate = 100.0

        all_bas = UserModel.objects.filter(
            role="brand_ambassador", is_active=True)
        if dealer_id:
            all_bas = all_bas.filter(dealer_org_id=dealer_id)
        if van_team_id:
            from apps.dealers.models import VanTeamMember
            van_member_ids = list(VanTeamMember.objects.filter(
                team_id=van_team_id
            ).values_list("agent_id", flat=True))
            all_bas = all_bas.filter(id__in=van_member_ids)
        if ba_id:
            all_bas = all_bas.filter(id=ba_id)

        by_ba_list = []
        for ba in all_bas:
            activity = ba_data.get(ba.id, {
                "name": ba.full_name, "issued": 0, "returned": 0,
                "registered": 0, "transferred": 0,
            })
            registered = activity["registered"]
            by_ba_list.append({
                "id":           ba.id,
                "name":         ba.full_name,
                "issued":       activity["issued"],
                "returned":     activity["returned"],
                "registered":   registered,
                "transferred":  activity["transferred"],
                "est_commission": round(registered * commission_rate, 2),
            })

        by_ba_list.sort(
            key=lambda x: x["issued"] + x["registered"], reverse=True)

        today = datetime.date.today()
        calendar_data = []
        for i in range(29, -1, -1):
            day = today - datetime.timedelta(days=i)
            day_mov = SIMMovement.objects.filter(
                movement_type=SIMMovement.MovementType.REGISTER,
                created_at__date=day,
            )
            if dealer_id:
                day_mov = day_mov.filter(
                    sim__batch__branch__dealer_id=dealer_id)
            calendar_data.append({
                "date":       day.isoformat(),
                "registered": day_mov.count(),
            })

        total_est_commission = round(total_registered * commission_rate, 2)

        return Response({
            "date":   target_date.isoformat(),
            "totals": {
                "issued":          total_issued,
                "returned":        total_returned,
                "registered":      total_registered,
                "confirmed":       confirmed_today,
                "est_commission":  total_est_commission,
                "commission_rate": commission_rate,
            },
            "by_ba":    by_ba_list,
            "calendar": calendar_data,
        })


class AgentPerformanceView(APIView):
    """
    GET /api/reports/agent-performance/
    Returns real per-BA performance data from inventory + reconciliation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        dealer_id = _get_dealer_id(user)
        branch_id = request.query_params.get("branch")

        base = SIM.objects.all()
        if dealer_id:
            base = base.filter(batch__branch__dealer_id=dealer_id)
        if branch_id:
            base = base.filter(branch_id=branch_id)

        ba_held_qs = (
            base.filter(
                status__in=[SIM.Status.ISSUED, SIM.Status.REGISTERED],
                current_holder__isnull=False,
            )
            .values(
                "current_holder",
                "branch__name",
                "van_team__name",
            )
            .annotate(sims_held=Count("id"))
        )
        ba_held = {r["current_holder"]: r for r in ba_held_qs}

        all_bas_qs = UserModel.objects.filter(
            role__in=["external_agent"],
            is_active=True
        )
        if dealer_id:
            all_bas_qs = all_bas_qs.filter(dealer_org_id=dealer_id)

        ba_reg = {
            r["current_holder"]: r["cnt"]
            for r in base.filter(
                status=SIM.Status.REGISTERED, current_holder__isnull=False
            ).values("current_holder").annotate(cnt=Count("id"))
        }

        ba_fraud = {
            r["current_holder"]: r["cnt"]
            for r in base.filter(
                status=SIM.Status.FRAUD_FLAGGED, current_holder__isnull=False
            ).values("current_holder").annotate(cnt=Count("id"))
        }

        from django.db.models import Max
        last_issuance = {
            m["to_user"]: m["last"]
            for m in SIMMovement.objects.filter(
                movement_type=SIMMovement.MovementType.ISSUE,
                to_user__isnull=False,
            ).values("to_user").annotate(last=Max("created_at"))
        }

        # Filter SafaricomReports by dealer FK directly
        recon_qs = SafaricomReport.objects.filter(status="done")
        if dealer_id:
            recon_qs = recon_qs.filter(branch__dealer_id=dealer_id)
        latest_report = recon_qs.order_by("-processed_at").first()

        ba_conf = {}
        ba_comm = {}
        last_recon_date = None
        if latest_report:
            for row in (
                ReconciliationRecord.objects.filter(
                    report=latest_report, result="payable",
                    identified_ba__isnull=False,
                )
                .values("identified_ba")
                .annotate(cnt=Count("id"), total=Sum("commission_amount"))
            ):
                ba_conf[row["identified_ba"]] = row["cnt"]
                ba_comm[row["identified_ba"]] = float(row["total"] or 0)
            if latest_report.processed_at:
                last_recon_date = latest_report.processed_at.strftime(
                    "%b %d, %Y")

        today = datetime.date.today()
        trend_days = [
            today - datetime.timedelta(days=i) for i in range(6, -1, -1)]
        ba_trend: dict = defaultdict(lambda: [0] * 7)
        for i, day in enumerate(trend_days):
            day_mov = SIMMovement.objects.filter(
                movement_type=SIMMovement.MovementType.REGISTER,
                created_at__date=day,
            )
            if dealer_id:
                day_mov = day_mov.filter(
                    sim__batch__branch__dealer_id=dealer_id)
            for m in day_mov.values("to_user").annotate(cnt=Count("id")):
                if m["to_user"]:
                    ba_trend[m["to_user"]][i] += m["cnt"]

        agents = []
        for ba in all_bas_qs:
            bid = ba.id
            held = ba_held.get(bid, {})
            last_iss = last_issuance.get(bid)
            if last_iss:
                days_since = (timezone.now() - last_iss).days
                last_iss_str = last_iss.date().isoformat()
            else:
                days_since = 999
                last_iss_str = None

            agents.append({
                "id":                  bid,
                "name":                ba.full_name,
                "phone":               ba.phone or "—",
                "branch_name":         held.get("branch__name") or "—",
                "van_team_name":       held.get("van_team__name") or "Direct",
                "sims_in_field":       held.get("sims_held", 0),
                "registered":          ba_reg.get(bid, 0),
                "confirmed":           ba_conf.get(bid, 0) if bid in ba_conf else None,
                "fraud_flags":         ba_fraud.get(bid, 0),
                "commission":          ba_comm.get(bid, 0),
                "last_issuance_date":  last_iss_str,
                "days_since_issuance": days_since,
                "trend":               ba_trend[bid],
            })

        agg_trend = [
            {
                "label":      d.strftime("%a"),
                "date":       d.isoformat(),
                "registered": sum(ba_trend[a["id"]][i] for a in agents),
            }
            for i, d in enumerate(trend_days)
        ]

        return Response({
            "last_recon_date": last_recon_date,
            "agents":          agents,
            "trend":           agg_trend,
        })

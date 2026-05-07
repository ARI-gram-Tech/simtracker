from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
import datetime

from apps.commissions.models import DeductionRule, DeductionRecord
from apps.inventory.models import SIM
from apps.notifications.models import Notification


class Command(BaseCommand):
    help = "Flag BAs with SIMs held too long without registering"

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        rules = DeductionRule.objects.filter(
            violation_type=DeductionRule.ViolationType.STALE_SIM,
            is_active=True,
            threshold_days__isnull=False,
        )

        total_created = 0

        for rule in rules:
            cutoff_date = today - datetime.timedelta(days=rule.threshold_days)

            # Find all issued SIMs for this dealer older than threshold
            stale_sims = SIM.objects.filter(
                status=SIM.Status.ISSUED,
                updated_at__date__lte=cutoff_date,
                branch__dealer=rule.dealer,
            ).select_related("current_holder")

            # Group by BA
            ba_sims: dict = {}
            for sim in stale_sims:
                if not sim.current_holder:
                    continue
                ba = sim.current_holder
                if ba.id not in ba_sims:
                    ba_sims[ba.id] = {"ba": ba, "sims": [], "max_days": 0}
                days_held = (today - sim.updated_at.date()).days
                ba_sims[ba.id]["sims"].append(sim)
                ba_sims[ba.id]["max_days"] = max(
                    ba_sims[ba.id]["max_days"], days_held)

            for ba_id, data in ba_sims.items():
                ba = data["ba"]
                sims = data["sims"]
                max_days = data["max_days"]
                count = len(sims)

                # Skip if pending record already exists today for this rule + BA
                already_flagged = DeductionRecord.objects.filter(
                    agent=ba,
                    rule=rule,
                    status=DeductionRecord.Status.PENDING,
                    created_at__date=today,
                ).exists()
                if already_flagged:
                    continue

                # Calculate amount
                if rule.is_per_day:
                    amount = rule.amount_per_unit * count * max_days
                else:
                    amount = rule.amount_per_unit * count

                record = DeductionRecord.objects.create(
                    agent=ba,
                    rule=rule,
                    violation_type=DeductionRule.ViolationType.STALE_SIM,
                    sims_count=count,
                    days_held=max_days,
                    amount=amount,
                    reason=(
                        f"{count} SIM{'s' if count > 1 else ''} held for "
                        f"{max_days} day{'s' if max_days > 1 else ''} without registration."
                    ),
                    status=DeductionRecord.Status.PENDING,
                    settlement_mode=rule.settlement_mode,
                    raised_by=None,
                )

                # Notify the BA
                Notification.objects.create(
                    recipient=ba,
                    title="SIM Holding Penalty Raised",
                    message=(
                        f"You have {count} SIM{'s' if count > 1 else ''} that "
                        f"{'have' if count > 1 else 'has'} been held for {max_days} days "
                        f"without registration. A deduction of KES {amount} has been raised "
                        f"and is pending approval by your dealer."
                    ),
                    type=Notification.Type.FINANCE,
                )

                total_created += 1
                self.stdout.write(
                    f"  Flagged {ba.full_name}: {count} SIMs, KES {amount}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {total_created} deduction record(s) created.")
        )

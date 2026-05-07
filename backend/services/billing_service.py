"""
services/billing_service.py

The central billing engine. Responsible for:
  1. generate_subscription_invoices()  — called by Celery beat monthly/yearly
  2. process_plan_change(dealer, new_plan)  — handles upgrade vs downgrade
  3. apply_pending_plan_changes()  — called by Celery beat to apply scheduled downgrades
  4. mark_overdue_invoices()  — called by Celery beat daily
  5. suspend_overdue_dealers()  — called by Celery beat after grace period
"""

from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils import timezone

import logging

if TYPE_CHECKING:
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice

logger = logging.getLogger(__name__)


# ─── 1. Monthly/Yearly Subscription Invoice Generation ────────────────────────

def generate_subscription_invoices() -> list["Invoice"]:
    """
    Generate subscription invoices for all active dealers whose
    next_billing_date is today or in the past.

    Called by Celery beat — runs daily and checks next_billing_date.
    Returns list of created invoices.
    """
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice, PlanSetting

    today = timezone.now().date()
    created_invoices: list[Invoice] = []

    # Only bill active (paid) subscribers — not trial, suspended, or overdue
    billable_dealers = Dealer.objects.filter(
        subscription_status="active",
        next_billing_date__lte=today,
    ).exclude(subscription_plan="trial")

    for dealer in billable_dealers:
        try:
            plan_settings = PlanSetting.objects.get(
                plan=dealer.subscription_plan)
        except PlanSetting.DoesNotExist:
            logger.warning(
                f"[billing] No PlanSetting for dealer {dealer.id} plan '{dealer.subscription_plan}'")
            continue

        # Determine amount and period
        if dealer.billing_cycle == "yearly":
            amount = Decimal(str(plan_settings.yearly_price))
            period = Invoice.Period.YEARLY
            next_billing = today.replace(year=today.year + 1)
        else:
            amount = Decimal(str(plan_settings.monthly_price))
            period = Invoice.Period.MONTHLY
            # Advance to same day next month (handle month-end edge cases)
            if today.month == 12:
                next_billing = today.replace(year=today.year + 1, month=1)
            else:
                import calendar
                last_day_next = calendar.monthrange(
                    today.year, today.month + 1)[1]
                next_billing = today.replace(
                    month=today.month + 1,
                    day=min(today.day, last_day_next)
                )

        invoice = Invoice.objects.create(
            dealer=dealer,
            invoice_type=Invoice.InvoiceType.SUBSCRIPTION,
            source=Invoice.Source.SYSTEM,
            period=period,
            amount=amount,
            status=Invoice.Status.PENDING,
            issued_date=today,
            due_date=today + timezone.timedelta(days=14),
            billing_period_start=today,
            billing_period_end=next_billing - timezone.timedelta(days=1),
            notes=(
                f"Auto-generated {period} subscription invoice "
                f"for '{plan_settings.plan}' plan."
            ),
        )
        created_invoices.append(invoice)
        logger.info(
            f"[billing] Created subscription invoice INV-{invoice.pk:04d} for dealer {dealer.id}")

        # Advance next billing date
        dealer.next_billing_date = next_billing
        dealer.save(update_fields=["next_billing_date"])

    return created_invoices


# ─── 2. Plan Change Orchestration ─────────────────────────────────────────────

PLAN_RANK = {"trial": 0, "basic": 1, "pro": 2, "enterprise": 3}


def _check_downgrade_compatibility(dealer: "Dealer", new_plan_settings) -> list[str]:
    """
    Returns a list of conflict messages if current usage exceeds new plan limits.
    Empty list means downgrade is compatible.
    """
    from services.usage_service import get_usage

    usage = get_usage(dealer)
    conflicts: list[str] = []

    if usage["users"] > new_plan_settings.max_users:
        conflicts.append(
            f"You have {usage['users']} users but '{new_plan_settings.plan}' "
            f"allows only {new_plan_settings.max_users}."
        )
    if usage["vans"] > new_plan_settings.max_vans:
        conflicts.append(
            f"You have {usage['vans']} van teams but '{new_plan_settings.plan}' "
            f"allows only {new_plan_settings.max_vans}."
        )
    if usage["branches"] > new_plan_settings.max_branches:
        conflicts.append(
            f"You have {usage['branches']} branches but '{new_plan_settings.plan}' "
            f"allows only {new_plan_settings.max_branches}."
        )

    return conflicts


def process_plan_change(dealer: "Dealer", new_plan: str, created_by=None) -> dict:
    """
    Handle a plan change request.

    UPGRADE  → apply immediately + create proration invoice
    DOWNGRADE → schedule for next billing cycle (no immediate invoice)

    Returns a result dict describing what happened.
    """
    from apps.invoices.models import PlanSetting
    from services.proration_service import create_proration_invoice
    from rest_framework.exceptions import PermissionDenied

    old_plan = dealer.subscription_plan

    try:
        old_plan_settings = PlanSetting.objects.get(plan=old_plan)
        new_plan_settings = PlanSetting.objects.get(plan=new_plan)
    except PlanSetting.DoesNotExist as e:
        raise ValueError(f"Plan configuration missing: {e}")

    old_rank = PLAN_RANK.get(old_plan, 0)
    new_rank = PLAN_RANK.get(new_plan, 0)
    is_upgrade = new_rank > old_rank
    is_downgrade = new_rank < old_rank

    # ── UPGRADE ────────────────────────────────────────────────────────────
    if is_upgrade:
        # Create prorated invoice for remaining days on new (higher) plan
        proration_invoice = create_proration_invoice(
            dealer=dealer,
            old_plan_settings=old_plan_settings,
            new_plan_settings=new_plan_settings,
            created_by=created_by,
        )

        # Apply immediately
        dealer.subscription_plan = new_plan
        dealer.subscription_status = "active"
        dealer.pending_plan_change = None
        dealer.pending_plan_change_at = None
        dealer.save(update_fields=[
            "subscription_plan", "subscription_status",
            "pending_plan_change", "pending_plan_change_at",
        ])

        logger.info(
            f"[billing] Dealer {dealer.id} upgraded from '{old_plan}' to '{new_plan}'")

        return {
            "dealer_id": dealer.id,
            "old_plan":  old_plan,
            "new_plan":  new_plan,
            "effective": "immediate",
            "message":   f"Upgraded from {old_plan} to {new_plan} immediately.",
            "invoice":   proration_invoice,
        }

    # ── DOWNGRADE ──────────────────────────────────────────────────────────
    if is_downgrade:
        # Check usage compatibility first
        conflicts = _check_downgrade_compatibility(dealer, new_plan_settings)
        if conflicts:
            raise PermissionDenied({
                "error":     "downgrade_incompatible",
                "message":   "Cannot downgrade: current usage exceeds target plan limits.",
                "conflicts": conflicts,
            })

        # Schedule for next billing cycle
        dealer.pending_plan_change = new_plan
        dealer.pending_plan_change_at = timezone.now()
        dealer.save(update_fields=[
                    "pending_plan_change", "pending_plan_change_at"])

        scheduled_date = dealer.next_billing_date or "your next billing cycle"
        logger.info(
            f"[billing] Dealer {dealer.id} downgrade to '{new_plan}' scheduled for {scheduled_date}")

        return {
            "dealer_id": dealer.id,
            "old_plan":  old_plan,
            "new_plan":  new_plan,
            "effective": "next_billing_cycle",
            "message":   f"Downgrade to {new_plan} scheduled for {scheduled_date}.",
            "invoice":   None,
        }

    # Same rank — shouldn't happen (caller checks) but handle gracefully
    return {
        "dealer_id": dealer.id,
        "old_plan":  old_plan,
        "new_plan":  new_plan,
        "effective": "none",
        "message":   "No change — plans are equivalent.",
        "invoice":   None,
    }


# ─── 3. Apply Scheduled Downgrades ────────────────────────────────────────────

def apply_pending_plan_changes() -> list[int]:
    """
    Apply any scheduled downgrades where next_billing_date has passed.
    Called by Celery beat — runs daily.
    Returns list of dealer IDs that were changed.
    """
    from apps.dealers.models import Dealer

    today = timezone.now().date()
    changed: list[int] = []

    dealers = Dealer.objects.filter(
        pending_plan_change__isnull=False,
        next_billing_date__lte=today,
    )

    for dealer in dealers:
        old_plan = dealer.subscription_plan
        new_plan = dealer.pending_plan_change

        dealer.subscription_plan = new_plan
        dealer.pending_plan_change = None
        dealer.pending_plan_change_at = None
        dealer.save(update_fields=[
            "subscription_plan", "pending_plan_change", "pending_plan_change_at"
        ])

        logger.info(
            f"[billing] Applied pending downgrade for dealer {dealer.id}: '{old_plan}' → '{new_plan}'")
        changed.append(dealer.id)

    return changed


# ─── 4. Mark Overdue Invoices ─────────────────────────────────────────────────

def mark_overdue_invoices() -> int:
    """
    Mark pending invoices as overdue if their due_date has passed.
    Called by Celery beat — runs daily.
    Returns count of invoices marked overdue.
    """
    from apps.invoices.models import Invoice

    today = timezone.now().date()
    updated = Invoice.objects.filter(
        status=Invoice.Status.PENDING,
        due_date__lt=today,
    ).update(status=Invoice.Status.OVERDUE)

    if updated:
        logger.info(f"[billing] Marked {updated} invoice(s) as overdue")

    return updated


# ─── 5. Suspend Dealers with Overdue Invoices ─────────────────────────────────

def suspend_overdue_dealers(grace_days: int = 7) -> list[int]:
    """
    Suspend dealers who have had overdue invoices for longer than `grace_days`.
    Called by Celery beat — runs daily.
    Returns list of dealer IDs that were suspended.
    """
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice

    cutoff = timezone.now() - timezone.timedelta(days=grace_days)
    suspended: list[int] = []

    active_dealers = Dealer.objects.filter(
        subscription_status__in=["active", "overdue"]
    )

    for dealer in active_dealers:
        old_overdue = dealer.invoices.filter(
            status=Invoice.Status.OVERDUE,
            updated_at__lte=cutoff,
        ).exists()

        if old_overdue:
            dealer.subscription_status = "suspended"
            dealer.is_active = False
            dealer.save(update_fields=["subscription_status", "is_active"])
            logger.warning(
                f"[billing] Suspended dealer {dealer.id} due to overdue invoices")
            suspended.append(dealer.id)

    return suspended

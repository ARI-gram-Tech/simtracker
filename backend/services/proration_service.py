"""
services/proration_service.py

Calculates prorated invoice amounts when a dealer upgrades mid-cycle.

Logic:
  - days_remaining = next_billing_date - today
  - days_in_cycle  = total days in current billing period
  - prorated_new   = (new_monthly_price / days_in_cycle) * days_remaining
  - prorated_old   = (old_monthly_price / days_in_cycle) * days_remaining
  - charge         = prorated_new - prorated_old  (only if positive)
"""

from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from typing import TYPE_CHECKING

from django.utils import timezone

import calendar

if TYPE_CHECKING:
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice, PlanSetting


def _days_in_month(date) -> int:
    """Return number of days in the month of the given date."""
    return calendar.monthrange(date.year, date.month)[1]


def calculate_proration(
    dealer: "Dealer",
    old_plan_settings: "PlanSetting",
    new_plan_settings: "PlanSetting",
) -> dict:
    """
    Calculate the prorated charge for upgrading from old_plan to new_plan.

    Returns:
    {
        "prorated_amount": Decimal,
        "days_remaining":  int,
        "days_in_cycle":   int,
        "old_daily_rate":  Decimal,
        "new_daily_rate":  Decimal,
    }
    """
    today = timezone.now().date()

    # Use next_billing_date if set, otherwise end of current month
    if dealer.next_billing_date:
        next_billing = dealer.next_billing_date
    else:
        days_in_month = _days_in_month(today)
        next_billing = today.replace(day=days_in_month)

    days_remaining = (next_billing - today).days
    if days_remaining <= 0:
        days_remaining = 1  # at minimum charge for today

    # Determine cycle length
    if dealer.billing_cycle == "yearly":
        days_in_cycle = 365
        old_base_price = Decimal(str(old_plan_settings.yearly_price))
        new_base_price = Decimal(str(new_plan_settings.yearly_price))
    else:
        days_in_cycle = _days_in_month(today)
        old_base_price = Decimal(str(old_plan_settings.monthly_price))
        new_base_price = Decimal(str(new_plan_settings.monthly_price))

    old_daily_rate = (
        old_base_price / days_in_cycle).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    new_daily_rate = (
        new_base_price / days_in_cycle).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Credit for unused time on old plan, charge for new plan
    old_credit = (
        old_daily_rate * days_remaining).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    new_charge = (
        new_daily_rate * days_remaining).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    prorated_amount = max(new_charge - old_credit, Decimal("0"))

    return {
        "prorated_amount": prorated_amount,
        "days_remaining":  days_remaining,
        "days_in_cycle":   days_in_cycle,
        "old_daily_rate":  old_daily_rate,
        "new_daily_rate":  new_daily_rate,
        "next_billing":    next_billing,
    }


def create_proration_invoice(
    dealer: "Dealer",
    old_plan_settings: "PlanSetting",
    new_plan_settings: "PlanSetting",
    created_by=None,
) -> "Invoice | None":
    """
    Create a proration invoice when upgrading plans.
    Returns None if prorated amount is zero (e.g. same price plans).
    """
    from apps.invoices.models import Invoice

    proration = calculate_proration(
        dealer, old_plan_settings, new_plan_settings)
    amount = proration["prorated_amount"]

    if amount <= 0:
        return None

    today = timezone.now().date()
    full_price = (
        new_plan_settings.yearly_price
        if dealer.billing_cycle == "yearly"
        else new_plan_settings.monthly_price
    )

    invoice = Invoice.objects.create(
        dealer=dealer,
        invoice_type=Invoice.InvoiceType.PRORATION,
        source=Invoice.Source.SYSTEM,
        period=Invoice.Period.ONCE,
        amount=amount,
        original_amount=Decimal(str(full_price)),
        is_prorated=True,
        status=Invoice.Status.PENDING,
        issued_date=today,
        due_date=today + timezone.timedelta(days=7),
        billing_period_start=today,
        billing_period_end=proration["next_billing"],
        created_by=created_by,
        notes=(
            f"Prorated upgrade from '{old_plan_settings.plan}' to '{new_plan_settings.plan}'.\n"
            f"{proration['days_remaining']} days remaining in cycle "
            f"({proration['days_in_cycle']}-day cycle).\n"
            f"Old daily rate: KES {proration['old_daily_rate']} | "
            f"New daily rate: KES {proration['new_daily_rate']}.\n"
            f"Prorated charge: KES {amount}."
        ),
    )

    return invoice

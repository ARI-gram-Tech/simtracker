"""
services/overage_service.py

Handles all overage billing logic:
  - create_overage_invoice_for_resource()  called at point of resource creation
  - generate_overage_invoices()            called by Celery beat (monthly scan)
"""

from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice, PlanSetting


def _overage_price(plan_settings: "PlanSetting", resource: str) -> Decimal:
    price_map = {
        "users":    plan_settings.overage_price_per_user,
        "vans":     plan_settings.overage_price_per_van,
        "branches": plan_settings.overage_price_per_branch,
    }
    return Decimal(str(price_map.get(resource, 0)))


def create_overage_invoice_for_resource(
    dealer: "Dealer",
    resource: str,
    plan_settings: "PlanSetting",
    extra_units: int = 1,
) -> "Invoice":
    """
    Create a single overage invoice for `extra_units` of a specific resource.
    Called at point-of-creation when a dealer adds a resource beyond their limit.
    """
    from apps.invoices.models import Invoice

    price_per_unit = _overage_price(plan_settings, resource)
    amount = price_per_unit * extra_units

    today = timezone.now().date()

    label_map = {
        "users":    "User",
        "vans":     "Van Team",
        "branches": "Branch",
    }
    label = label_map.get(resource, resource.title())

    invoice = Invoice.objects.create(
        dealer=dealer,
        invoice_type=Invoice.InvoiceType.OVERAGE,
        source=Invoice.Source.SYSTEM,
        period=Invoice.Period.ONCE,
        amount=amount,
        status=Invoice.Status.PENDING,
        issued_date=today,
        due_date=today + timezone.timedelta(days=7),
        notes=(
            f"Overage charge: {extra_units} extra {label}(s) "
            f"at KES {price_per_unit} each on plan '{plan_settings.plan}'."
        ),
    )

    return invoice


def generate_overage_invoices() -> list["Invoice"]:
    """
    Scan all active dealers whose usage exceeds plan limits and
    generate monthly overage invoices for the excess.

    Called by Celery beat — runs once per month.
    Returns list of created invoices (for logging).
    """
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice, PlanSetting
    from services.usage_service import get_usage

    created_invoices: list[Invoice] = []
    today = timezone.now().date()

    active_dealers = Dealer.objects.filter(
        subscription_status__in=["active", "overdue"]
    ).select_related()

    for dealer in active_dealers:
        try:
            plan_settings = PlanSetting.objects.get(
                plan=dealer.subscription_plan)
        except PlanSetting.DoesNotExist:
            continue

        if not plan_settings.allow_overage:
            continue

        usage = get_usage(dealer)
        limits = {
            "users":    plan_settings.max_users,
            "vans":     plan_settings.max_vans,
            "branches": plan_settings.max_branches,
        }

        overage_lines: list[str] = []
        total_overage = Decimal("0")

        for resource, limit in limits.items():
            current = usage[resource]
            excess = current - limit
            if excess <= 0:
                continue

            price_per_unit = _overage_price(plan_settings, resource)
            charge = price_per_unit * excess
            total_overage += charge

            label = {"users": "Users", "vans": "Vans",
                     "branches": "Branches"}[resource]
            overage_lines.append(
                f"{label}: {current} used / {limit} allowed = "
                f"{excess} extra × KES {price_per_unit} = KES {charge}"
            )

        if total_overage <= 0:
            continue

        invoice = Invoice.objects.create(
            dealer=dealer,
            invoice_type=Invoice.InvoiceType.OVERAGE,
            source=Invoice.Source.SYSTEM,
            period=Invoice.Period.MONTHLY,
            amount=total_overage,
            status=Invoice.Status.PENDING,
            issued_date=today,
            due_date=today + timezone.timedelta(days=14),
            billing_period_start=today.replace(day=1),
            billing_period_end=today,
            notes="Monthly overage charges:\n" + "\n".join(overage_lines),
        )
        created_invoices.append(invoice)

    return created_invoices

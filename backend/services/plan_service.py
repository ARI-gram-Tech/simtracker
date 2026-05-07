"""
services/plan_service.py

Guards and limit enforcement:
  - require_active_subscription(dealer)  → raises 403 if suspended/trial-expired
  - enforce_limit(dealer, resource)      → raises 403 OR creates overage invoice
  - require_feature(dealer, feature)     → raises 403 if feature not in plan
"""

from __future__ import annotations
from typing import TYPE_CHECKING, Literal

from rest_framework.exceptions import PermissionDenied

if TYPE_CHECKING:
    from apps.dealers.models import Dealer
    from apps.invoices.models import Invoice

Resource = Literal["users", "vans", "branches"]


def require_active_subscription(dealer: "Dealer") -> None:
    """
    Block access for suspended dealers or expired trials.
    Raises PermissionDenied (HTTP 403) if not allowed.
    """
    if dealer.subscription_status == "suspended":
        raise PermissionDenied(
            "Your account has been suspended. Please clear outstanding invoices to continue."
        )

    if dealer.trial_expired:
        raise PermissionDenied(
            "Your trial has expired. Please upgrade to a paid plan to continue."
        )


def enforce_limit(dealer: "Dealer", resource: Resource) -> "Invoice | None":
    """
    Check whether the dealer has exceeded their plan limit for a resource.

    - If within limits → return None (allow creation)
    - If exceeded AND allow_overage=True → create overage invoice, return it
    - If exceeded AND allow_overage=False → raise PermissionDenied (HTTP 403)
    """
    from apps.invoices.models import PlanSetting
    from services.usage_service import get_usage
    from services.overage_service import create_overage_invoice_for_resource

    try:
        plan_settings = PlanSetting.objects.get(plan=dealer.subscription_plan)
    except PlanSetting.DoesNotExist:
        raise PermissionDenied(
            "Plan configuration not found. Contact support.")

    limit_map = {
        "users":    plan_settings.max_users,
        "vans":     plan_settings.max_vans,
        "branches": plan_settings.max_branches,
    }

    usage = get_usage(dealer)
    limit = limit_map[resource]
    current = usage[resource]

    if current < limit:
        # Within limits — allow
        return None

    # Over limit
    if not plan_settings.allow_overage:
        label_map = {
            "users":    f"user (max {limit})",
            "vans":     f"van team (max {limit})",
            "branches": f"branch (max {limit})",
        }
        raise PermissionDenied(
            f"You have reached your {label_map[resource]} limit. "
            f"Please upgrade your plan to add more."
        )

    # Overage allowed — generate invoice for the 1 extra unit
    overage_invoice = create_overage_invoice_for_resource(
        dealer=dealer,
        resource=resource,
        plan_settings=plan_settings,
        extra_units=1,
    )
    return overage_invoice


def require_feature(dealer: "Dealer", feature: str) -> None:
    """
    Raise PermissionDenied if the dealer's plan does not include `feature`.

    Usage:
        require_feature(dealer, "bulk_issue")
        require_feature(dealer, "advanced_reports")
    """
    from apps.invoices.models import PlanSetting

    try:
        plan_settings = PlanSetting.objects.get(plan=dealer.subscription_plan)
    except PlanSetting.DoesNotExist:
        raise PermissionDenied(
            "Plan configuration not found. Contact support.")

    if feature not in (plan_settings.features or []):
        raise PermissionDenied(
            f"The '{feature}' feature is not available on your current plan. "
            f"Please upgrade to access this feature."
        )

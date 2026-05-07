"""
services/usage_service.py

Calculates real-time usage for a dealer:
  - users   (all VanTeamMembers across all branches)
  - vans    (all VanTeams across all branches)
  - branches

Used by:
  - plan_service.py (limit enforcement)
  - overage_service.py (overage calculation)
  - DealerUsageView (API endpoint)
"""

from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.dealers.models import Dealer


def get_usage(dealer: "Dealer") -> dict[str, int]:
    """Return raw usage counts for a dealer."""
    from apps.dealers.models import Branch, VanTeam, VanTeamMember

    branches = Branch.objects.filter(dealer=dealer, is_active=True).count()
    vans = VanTeam.objects.filter(
        branch__dealer=dealer, is_active=True).count()
    users = VanTeamMember.objects.filter(team__branch__dealer=dealer).count()

    return {
        "branches": branches,
        "vans":     vans,
        "users":    users,
    }


def get_usage_summary(dealer: "Dealer") -> dict:
    """
    Return usage vs plan limits, ready for the API response.

    Example return:
    {
        "plan": "basic",
        "usage": { "users": 4, "vans": 2, "branches": 1 },
        "limits": { "users": 5, "vans": 3, "branches": 2 },
        "exceeded": { "users": False, "vans": False, "branches": False },
    }
    """
    from apps.invoices.models import PlanSetting

    usage = get_usage(dealer)

    try:
        plan_settings = PlanSetting.objects.get(plan=dealer.subscription_plan)
        limits = {
            "users":    plan_settings.max_users,
            "vans":     plan_settings.max_vans,
            "branches": plan_settings.max_branches,
        }
    except PlanSetting.DoesNotExist:
        limits = {"users": 0, "vans": 0, "branches": 0}

    exceeded = {
        resource: usage[resource] > limit
        for resource, limit in limits.items()
    }

    return {
        "plan":     dealer.subscription_plan,
        "status":   dealer.subscription_status,
        "usage":    usage,
        "limits":   limits,
        "exceeded": exceeded,
    }

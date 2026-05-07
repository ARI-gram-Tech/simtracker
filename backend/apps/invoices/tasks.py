"""
apps/invoices/tasks.py

Celery beat tasks for automated billing.

Schedule (add to CELERY_BEAT_SCHEDULE in settings):

    "generate-subscription-invoices": {
        "task": "apps.invoices.tasks.task_generate_subscription_invoices",
        "schedule": crontab(hour=1, minute=0),   # daily at 01:00
    },
    "generate-overage-invoices": {
        "task": "apps.invoices.tasks.task_generate_overage_invoices",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),  # 1st of month
    },
    "mark-overdue-invoices": {
        "task": "apps.invoices.tasks.task_mark_overdue_invoices",
        "schedule": crontab(hour=0, minute=30),  # daily at 00:30
    },
    "suspend-overdue-dealers": {
        "task": "apps.invoices.tasks.task_suspend_overdue_dealers",
        "schedule": crontab(hour=0, minute=45),  # daily at 00:45
    },
    "apply-pending-plan-changes": {
        "task": "apps.invoices.tasks.task_apply_pending_plan_changes",
        "schedule": crontab(hour=1, minute=30),  # daily at 01:30
    },
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="apps.invoices.tasks.task_generate_subscription_invoices")
def task_generate_subscription_invoices():
    """
    Generate subscription invoices for all dealers whose next_billing_date is today.
    Runs: daily at 01:00
    """
    from services.billing_service import generate_subscription_invoices

    invoices = generate_subscription_invoices()
    logger.info(f"[task] Generated {len(invoices)} subscription invoice(s)")
    return {"generated": len(invoices)}


@shared_task(name="apps.invoices.tasks.task_generate_overage_invoices")
def task_generate_overage_invoices():
    """
    Generate monthly overage invoices for dealers exceeding plan limits.
    Runs: 1st of every month at 02:00
    """
    from services.overage_service import generate_overage_invoices

    invoices = generate_overage_invoices()
    logger.info(f"[task] Generated {len(invoices)} overage invoice(s)")
    return {"generated": len(invoices)}


@shared_task(name="apps.invoices.tasks.task_mark_overdue_invoices")
def task_mark_overdue_invoices():
    """
    Mark pending invoices past their due date as OVERDUE.
    Runs: daily at 00:30
    """
    from services.billing_service import mark_overdue_invoices

    count = mark_overdue_invoices()
    logger.info(f"[task] Marked {count} invoice(s) as overdue")
    return {"marked_overdue": count}


@shared_task(name="apps.invoices.tasks.task_suspend_overdue_dealers")
def task_suspend_overdue_dealers():
    """
    Suspend dealers with overdue invoices older than 7 days (grace period).
    Runs: daily at 00:45
    """
    from services.billing_service import suspend_overdue_dealers

    suspended = suspend_overdue_dealers(grace_days=7)
    logger.info(f"[task] Suspended {len(suspended)} dealer(s): {suspended}")
    return {"suspended_dealers": suspended}


@shared_task(name="apps.invoices.tasks.task_apply_pending_plan_changes")
def task_apply_pending_plan_changes():
    """
    Apply scheduled plan downgrades when next_billing_date has passed.
    Runs: daily at 01:30
    """
    from services.billing_service import apply_pending_plan_changes

    changed = apply_pending_plan_changes()
    logger.info(
        f"[task] Applied pending plan changes for {len(changed)} dealer(s): {changed}")
    return {"plan_changes_applied": changed}

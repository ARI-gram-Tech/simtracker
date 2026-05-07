"""
config/celery.py

Celery application configuration for SimTrack.

Usage:
  Start worker:   celery -A config worker --loglevel=info
  Start beat:     celery -A config beat --loglevel=info
  Both together:  celery -A config worker --beat --loglevel=info  (dev only)
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

app = Celery("simtrack")

# Load config from Django settings, using CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# ─── Beat Schedule ────────────────────────────────────────────────────────────
app.conf.beat_schedule = {

    # Daily: generate subscription invoices for dealers due today
    "generate-subscription-invoices": {
        "task":     "apps.invoices.tasks.task_generate_subscription_invoices",
        "schedule": crontab(hour=1, minute=0),
        "options":  {"expires": 3600},
    },

    # 1st of each month: generate overage invoices
    "generate-overage-invoices": {
        "task":     "apps.invoices.tasks.task_generate_overage_invoices",
        "schedule": crontab(day_of_month=1, hour=2, minute=0),
        "options":  {"expires": 3600},
    },

    # Daily: mark past-due invoices as OVERDUE
    "mark-overdue-invoices": {
        "task":     "apps.invoices.tasks.task_mark_overdue_invoices",
        "schedule": crontab(hour=0, minute=30),
        "options":  {"expires": 3600},
    },

    # Daily: suspend dealers with overdue invoices past grace period
    "suspend-overdue-dealers": {
        "task":     "apps.invoices.tasks.task_suspend_overdue_dealers",
        "schedule": crontab(hour=0, minute=45),
        "options":  {"expires": 3600},
    },

    # Daily: apply scheduled plan downgrades
    "apply-pending-plan-changes": {
        "task":     "apps.invoices.tasks.task_apply_pending_plan_changes",
        "schedule": crontab(hour=1, minute=30),
        "options":  {"expires": 3600},
    },
}

app.conf.timezone = "Africa/Nairobi"

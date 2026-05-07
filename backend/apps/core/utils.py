# /apps/core/utils.py
from apps.notifications.models import Notification


def notify(recipient, title, message, type=Notification.Type.SYSTEM):
    """Helper to create an in-app notification from anywhere in the codebase."""
    Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        type=type,
    )


def notify_bulk(recipients, title, message, type=Notification.Type.SYSTEM):
    """Send the same notification to multiple users at once."""
    Notification.objects.bulk_create([
        Notification(
            recipient=r,
            title=title,
            message=message,
            type=type,
        ) for r in recipients
    ])

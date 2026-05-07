# apps/notifications/urls.py

from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    MarkReadView,
    MarkAllReadView,
    UnreadCountView,
    SendEmailView,
    SendNotificationView,
    EmailLogListView,
)

urlpatterns = [
    path("",
         NotificationListView.as_view(),    name="notification_list"),
    path("<int:pk>/",
         NotificationDetailView.as_view(),  name="notification_detail"),
    path("<int:pk>/mark-read/",
         MarkReadView.as_view(),            name="mark_read"),
    path("mark-all-read/",
         MarkAllReadView.as_view(),         name="mark_all_read"),
    path("unread-count/",
         UnreadCountView.as_view(),         name="unread_count"),

    # Admin raw email
    path("send-email/",
         SendEmailView.as_view(),           name="send_email"),
    path("email-logs/",
         EmailLogListView.as_view(),        name="email_logs"),

    # Dealer owner / manager → user notification (in-app + optional email)
    path("send/",
         SendNotificationView.as_view(),    name="send_notification"),
]

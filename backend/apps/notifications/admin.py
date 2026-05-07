# backend/apps/notifications/admin.py
from django.contrib import admin
from .models import EmailLog, Notification


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ["recipient_email", "subject", "status", "error_message"]
    list_filter = ["status"]
    search_fields = ["recipient_email", "subject"]
    readonly_fields = ["recipient_email", "subject",
                       "body", "status", "error_message"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "title", "type", "is_read"]
    list_filter = ["type", "is_read"]
    search_fields = ["recipient__email", "title"]

from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    class Type(models.TextChoices):
        ISSUE = "issue",   "SIM Issued"
        RETURN = "return",  "SIM Returned"
        RECEIVE = "receive", "SIM Received"
        ALERT = "alert",   "Alert"
        SYSTEM = "system",  "System"
        FINANCE = "finance", "Finance"

    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(
        max_length=20, choices=Type.choices, default=Type.SYSTEM)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.email} — {self.title}"


class EmailLog(models.Model):
    class Status(models.TextChoices):
        SENT = "sent",   "Sent"
        FAILED = "failed", "Failed"

    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices)
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient_email} — {self.subject} [{self.status}]"

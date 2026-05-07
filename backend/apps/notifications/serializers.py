from rest_framework import serializers
from .models import Notification, EmailLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "recipient", "title", "message",
            "type", "is_read", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = [
            "id", "recipient_email", "subject", "body",
            "status", "error_message", "sent_at",
        ]
        read_only_fields = ["id", "sent_at"]

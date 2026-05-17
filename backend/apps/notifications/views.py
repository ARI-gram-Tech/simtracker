# apps/notifications/views.py

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings

from apps.accounts.models import User
from .models import Notification, EmailLog
from .serializers import NotificationSerializer, EmailLogSerializer
from .service import send_dealer_notification, _send_email, _send_dealer_email


# ─── Permission helper ────────────────────────────────────────────────────────

class IsDealerOwnerOrManager(permissions.BasePermission):
    ALLOWED_ROLES = {"dealer_owner", "operations_manager", "super_admin"}

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in self.ALLOWED_ROLES
        )


# ─── Standard Notification Views ─────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).order_by("-created_at")


class NotificationDetailView(generics.RetrieveAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk, recipient=request.user)
            notification.is_read = True
            notification.save()
            return Response({"detail": "Marked as read."}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)


class MarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response(
            {"detail": "All notifications marked as read."},
            status=status.HTTP_200_OK,
        )


class ClearAllNotificationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        deleted, _ = Notification.objects.filter(
            recipient=request.user).delete()
        return Response({"detail": f"{deleted} notifications cleared."}, status=status.HTTP_200_OK)


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


# ─── Admin: raw email send ────────────────────────────────────────────────────

class SendEmailView(APIView):
    """
    POST /api/notifications/send-email/
    Admin-only. Sends an HTML email ...
    """
    permission_classes = [IsDealerOwnerOrManager]

    def post(self, request):
        recipient_email = request.data.get("recipient_email")
        subject = request.data.get("subject")
        body = request.data.get("body")
        html_body = request.data.get("html_body", "").strip()

        if not all([recipient_email, subject, body]):
            return Response(
                {"detail": "recipient_email, subject, and body are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # _send_email uses EmailMultiAlternatives so HTML renders properly.
        # It also handles EmailLog creation and error catching internally.
        _send_email(
            recipient_email=recipient_email,
            subject=subject,
            text_body=body,
            html_body=html_body if html_body else body,
        )

        # Fetch the log entry that _send_email just created
        log = (
            EmailLog.objects
            .filter(recipient_email=recipient_email, subject=subject)
            .order_by("-sent_at")
            .first()
        )

        if log and log.status == EmailLog.Status.FAILED:
            return Response(
                {"detail": f"Email failed: {log.error_message}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            EmailLogSerializer(log).data,
            status=status.HTTP_200_OK,
        )


class EmailLogListView(generics.ListAPIView):
    serializer_class = EmailLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = EmailLog.objects.all().order_by("-sent_at")


# ─── Dealer: send notification to own user ────────────────────────────────────

class SendNotificationView(APIView):
    """
    POST /api/notifications/send/
    """
    permission_classes = [IsDealerOwnerOrManager]

    def post(self, request):
        recipient_id = request.data.get("recipient_id")
        title = request.data.get("title", "").strip()
        message = request.data.get("message", "").strip()
        notif_type = request.data.get("type", Notification.Type.SYSTEM)
        send_email_copy = bool(request.data.get("send_email_copy", False))

        errors = {}
        if not recipient_id:
            errors["recipient_id"] = "This field is required."
        if not title:
            errors["title"] = "This field is required."
        if not message:
            errors["message"] = "This field is required."
        if notif_type not in dict(Notification.Type.choices):
            errors["type"] = (
                f"Invalid type. Choices: "
                f"{', '.join(dict(Notification.Type.choices).keys())}"
            )
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response(
                {"recipient_id": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Super admins bypass same-dealer check
        if request.user.role == "super_admin":
            notification = Notification.objects.create(
                recipient=recipient,
                title=title,
                message=message,
                type=notif_type,
            )
            if send_email_copy:
                _send_dealer_email(
                    sender=request.user,
                    recipient=recipient,
                    title=title,
                    message=message,
                )
            return Response(
                NotificationSerializer(notification).data,
                status=status.HTTP_201_CREATED,
            )

        # Dealer owners / managers — same-dealer enforced
        try:
            notification = send_dealer_notification(
                sender=request.user,
                recipient=recipient,
                title=title,
                message=message,
                notif_type=notif_type,
                send_email_copy=send_email_copy,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED,
        )

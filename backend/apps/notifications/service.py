# apps/notifications/service.py
# ─────────────────────────────────────────────────────────────────────────────
# Central service for all outbound emails and in-app notifications.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .models import EmailLog, Notification
from templates.notifications.welcome_email import WelcomeEmail
from templates.notifications.dealer_notification_email import DealerNotificationEmail

logger = logging.getLogger(__name__)


# ─── Welcome / Credentials Email ─────────────────────────────────────────────

def send_welcome_email(user, plain_password: str) -> None:
    """
    Send a welcome email containing login credentials to a newly created user.

    Called from apps.accounts.views.RegisterView immediately after the user
    is saved, before the password is discarded from memory.
    """
    frontend_url = settings.FRONTEND_URL

    welcome = WelcomeEmail(
        full_name=user.full_name,
        email=user.email,
        plain_password=plain_password,
        role_display=user.get_role_display(),
        login_url=f"{frontend_url}/login",
        frontend_url=frontend_url,
    )
    subject, html_body, plain_body = welcome.get_email_parts()

    _send_email(
        recipient_email=user.email,
        subject=subject,
        text_body=plain_body,
        html_body=html_body,
    )

    Notification.objects.create(
        recipient=user,
        title="Welcome to SimTrack!",
        message=(
            f"Your account has been created with the role '{user.get_role_display()}'. "
            "Please log in and change your temporary password."
        ),
        type=Notification.Type.SYSTEM,
    )


# backend/apps/notifications/service.py

def send_password_reset_email(user, uid: str, token: str) -> None:
    """
    Sends a branded password reset email using the PasswordResetEmail template.
    """
    from templates.notifications.password_reset_email import PasswordResetEmail

    frontend_url = settings.FRONTEND_URL
    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"

    template = PasswordResetEmail(
        first_name=user.first_name,
        reset_link=reset_link,
        frontend_url=frontend_url,
        expiry_minutes=60,
    )
    subject, html_body, plain_body = template.get_email_parts()

    _send_email(
        recipient_email=user.email,
        subject=subject,
        text_body=plain_body,
        html_body=html_body,
    )

# ─── Dealer → User In-App (+ optional email) Notification ────────────────────


def send_dealer_notification(
    *,
    sender,
    recipient,
    title: str,
    message: str,
    notif_type: str = Notification.Type.SYSTEM,
    send_email_copy: bool = False,
) -> Notification:
    """
    Create an in-app Notification from a dealer owner/manager to a user
    under the same dealer. Optionally sends an email copy.
    """
    _assert_same_dealer(sender, recipient)

    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        type=notif_type,
    )

    if send_email_copy:
        _send_dealer_email(
            sender=sender,
            recipient=recipient,
            title=title,
            message=message,
        )

    return notification


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _send_dealer_email(*, sender, recipient, title: str, message: str) -> None:
    """
    Build and dispatch a dealer notification email using the class-based template.
    Extracted so it can be reused by both send_dealer_notification and
    SendNotificationView (super_admin path).
    """
    frontend_url = settings.FRONTEND_URL

    sender_initials = "".join(
        part[0] for part in sender.full_name.split()[:2]
    ).upper()

    email = DealerNotificationEmail(
        full_name=recipient.full_name,
        sender_name=sender.full_name,
        sender_initials=sender_initials,
        message=message,
        login_url=f"{frontend_url}/login",
        frontend_url=frontend_url,
        title=title,
    )
    email_subject, html_body, plain_body = email.get_email_parts()

    _send_email(
        recipient_email=recipient.email,
        subject=f"SimTrack: {email_subject}",
        text_body=plain_body,
        html_body=html_body,
    )


def _send_email(
    *,
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """
    Send an email and write an EmailLog record regardless of outcome.
    Never raises — failures are logged and recorded.
    """
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)

        EmailLog.objects.create(
            recipient_email=recipient_email,
            subject=subject,
            body=text_body,
            status=EmailLog.Status.SENT,
        )
        logger.info("Email sent to %s — %s", recipient_email, subject)

    except Exception as exc:  # noqa: BLE001
        EmailLog.objects.create(
            recipient_email=recipient_email,
            subject=subject,
            body=text_body,
            status=EmailLog.Status.FAILED,
            error_message=str(exc),
        )
        logger.error(
            "Failed to send email to %s — %s: %s",
            recipient_email, subject, exc,
        )


def _assert_same_dealer(sender, recipient) -> None:
    """
    Guard: ensure sender and recipient belong to the same dealer org.
    """
    from apps.dealers.models import Dealer, Branch, VanTeam, VanTeamMember

    def resolve(user):
        try:
            return user.dealer
        except Dealer.DoesNotExist:
            pass
        branch = Branch.objects.filter(manager=user).first()
        if branch:
            return branch.dealer
        team = VanTeam.objects.filter(leader=user).first()
        if team:
            return team.branch.dealer
        member = VanTeamMember.objects.filter(agent=user).first()
        if member:
            return member.team.branch.dealer
        return None

    sender_dealer = resolve(sender)
    recipient_dealer = resolve(recipient)

    if sender_dealer is None or recipient_dealer is None:
        raise ValueError("Could not resolve dealer for sender or recipient.")
    if sender_dealer.id != recipient_dealer.id:
        raise ValueError(
            "Sender and recipient do not belong to the same dealer.")

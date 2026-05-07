"""
Dealer Notification Email Template
backend/templates/notifications/dealer_notification_email.py
"""

from typing import Optional
from datetime import datetime
import html


class DealerNotificationEmail:
    """Professional email template for dealer notifications."""

    # Constants for styling
    COLORS = {
        'primary': '#7c3aed',
        'primary_light': '#a78bfa',
        'primary_dark': '#5b21b6',
        'background': '#f4f4f5',
        'surface': '#ffffff',
        'surface_alt': '#fafafa',
        'border': '#e4e4e7',
        'text_primary': '#18181b',
        'text_secondary': '#71717a',
        'text_muted': '#a1a1aa',
        'text_light': '#d1d5db',
        'header_bg': '#18181b',
    }

    FONTS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

    def __init__(
        self,
        full_name: str,
        sender_name: str,
        sender_initials: str,
        message: str,
        login_url: str,
        frontend_url: str,
        title: Optional[str] = None,
        include_unsubscribe: bool = True,
        year: Optional[int] = None,
    ):
        """
        Initialize the dealer notification email.

        Args:
            full_name: Recipient's full name
            sender_name: Name of the sender
            sender_initials: Initials of the sender (max 2-3 characters)
            message: The notification message content
            login_url: URL for login button
            frontend_url: Base URL of the frontend application
            title: Email subject and header title
            include_unsubscribe: Whether to include unsubscribe link
            year: Copyright year (defaults to current year)
        """
        self.full_name = self._sanitize_text(full_name)
        self.sender_name = self._sanitize_text(sender_name)
        self.sender_initials = self._sanitize_text(sender_initials.upper()[:3])
        self.message = self._format_message(message)
        self.login_url = login_url
        self.frontend_url = frontend_url
        self.title = title or "New Notification from SimTrack"
        self.include_unsubscribe = include_unsubscribe
        self.year = year or datetime.now().year

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Sanitize text for HTML output."""
        return html.escape(str(text))

    @staticmethod
    def _format_message(message: str) -> str:
        """Format message with proper line breaks and sanitization."""
        sanitized = html.escape(message)
        # Convert newlines to <br> tags
        return sanitized.replace('\n', '<br>')

    def _get_header_logo(self) -> str:
        """Generate the header logo SVG."""
        return f'''<div style="width:32px;height:32px;background:{self.COLORS['primary']};border-radius:8px;text-align:center;display:inline-flex;align-items:center;justify-content:center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>'''

    def _get_sender_badge(self) -> str:
        """Generate the sender information badge."""
        return f'''<table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};border-radius:999px;padding:6px 14px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:8px;vertical-align:middle;">
                        <div style="width:24px;height:24px;background:#ede9fe;border-radius:50%;text-align:center;display:inline-flex;align-items:center;justify-content:center;">
                          <span style="font-size:11px;font-weight:700;color:{self.COLORS['primary_dark']};">{self.sender_initials}</span>
                        </div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:13px;color:{self.COLORS['text_secondary']};">From <strong style="color:{self.COLORS['text_primary']};font-weight:600;">{self.sender_name}</strong></span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>'''

    def _get_message_box(self) -> str:
        """Generate the formatted message box."""
        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};border-left:3px solid {self.COLORS['primary']};border-radius:0 10px 10px 0;padding:20px 24px;">
                  <div style="font-size:15px;color:{self.COLORS['text_primary']};line-height:1.65;word-wrap:break-word;">
                    {self.message}
                  </div>
                </td>
              </tr>
            </table>'''

    def _get_cta_button(self) -> str:
        """Generate the call-to-action button."""
        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="{self.login_url}" style="display:inline-block;background:{self.COLORS['primary']};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;transition:all 0.3s ease;">
                    Open SimTrack →
                  </a>
                </td>
              </tr>
            </table>'''

    def _get_footer(self) -> str:
        """Generate the email footer."""
        unsubscribe_html = ''
        if self.include_unsubscribe:
            unsubscribe_html = f' &middot; <a href="{self.frontend_url}/unsubscribe" style="color:{self.COLORS['primary']};text-decoration:none;">Unsubscribe</a>'

        return f'''<table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;color:{self.COLORS['text_muted']};line-height:1.5;">
                    This email was sent by <strong style="color:{self.COLORS['text_secondary']};">SimTrack</strong><br>
                    SIM Distribution & Commission Management System
                  </p>
                  <p style="margin:0;font-size:11px;color:{self.COLORS['text_light']};">
                    © {self.year} SimTrack. All rights reserved.{unsubscribe_html}<br>
                    <a href="{self.frontend_url}" style="color:{self.COLORS['primary']};text-decoration:none;">{self.frontend_url}</a>
                  </p>
                </td>
              </tr>
            </table>'''

    def generate_html(self) -> str:
        """Generate the complete HTML email content."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>{self.title}</title>
  <style>
    @media only screen and (max-width: 600px) {{
      .container {{ width: 100% !important; }}
      .content {{ padding: 20px !important; }}
      .button {{ display: block !important; width: 100% !important; text-align: center !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:{self.COLORS['background']};font-family:{self.FONTS};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{self.COLORS['background']};padding:40px 20px;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:{self.COLORS['header_bg']};border-radius:16px 16px 0 0;padding:28px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    {self._get_header_logo()}
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Sim<span style="color:{self.COLORS['primary_light']};">Track</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td class="content" style="background:{self.COLORS['surface']};padding:40px 32px 32px;">
              
              <!-- Greeting -->
              <p style="margin:0 0 16px;font-size:20px;font-weight:600;color:{self.COLORS['text_primary']};">Hi {self.full_name},</p>
              
              <!-- Sender Badge -->
              {self._get_sender_badge()}
              
              <!-- Message Box -->
              {self._get_message_box()}
              
              <!-- CTA Button -->
              {self._get_cta_button()}
              
              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="border-top:1px solid {self.COLORS['border']};"></td></tr>
              </table>
              
              <!-- Additional Info -->
              <p style="margin:0;font-size:13px;color:{self.COLORS['text_muted']};line-height:1.6;">
                This notification was sent to you by <strong>{self.sender_name}</strong> via SimTrack. 
                Log in to view all your notifications and manage your preferences.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          {self._get_footer()}
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    def generate_plain_text(self) -> str:
        """Generate plain text version for email clients that don't support HTML."""
        return f"""{self.title}
{'=' * len(self.title)}

Hi {self.full_name},

From: {self.sender_name}
Message:
{self.message}

Open SimTrack: {self.login_url}

---
This notification was sent to you by {self.sender_name} via SimTrack.
Log in to view all your notifications.

© {self.year} SimTrack - {self.frontend_url}"""

    def get_email_parts(self) -> tuple[str, str, str]:
        """
        Returns (subject, html_content, plain_text_content) for the email.
        """
        return self.title, self.generate_html(), self.generate_plain_text()


# Backward compatibility function
def get_dealer_notification_email(
    full_name: str,
    sender_name: str,
    sender_initials: str,
    message: str,
    login_url: str,
    frontend_url: str,
    title: str = "New Notification from SimTrack",
) -> tuple[str, str]:
    """
    Legacy function for backward compatibility.
    Returns (subject, html_content) for a dealer notification email.

    Deprecated: Use DealerNotificationEmail class instead.
    """
    email = DealerNotificationEmail(
        full_name=full_name,
        sender_name=sender_name,
        sender_initials=sender_initials,
        message=message,
        login_url=login_url,
        frontend_url=frontend_url,
        title=title,
    )
    subject, html, _ = email.get_email_parts()
    return subject, html


# Usage example:
if __name__ == "__main__":
    # Modern usage with class
    email = DealerNotificationEmail(
        full_name="John Doe",
        sender_name="Admin Team",
        sender_initials="AT",
        message="Your monthly commission report is ready. Please log in to view the details and download the statement.",
        login_url="https://app.simtrack.com/login",
        frontend_url="https://app.simtrack.com",
        title="Monthly Commission Report Available"
    )

    subject, html, plain_text = email.get_email_parts()
    print(f"Subject: {subject}")
    print(f"HTML length: {len(html)} characters")
    print(f"Plain text length: {len(plain_text)} characters")

    # Legacy usage (backward compatible)
    subject_legacy, html_legacy = get_dealer_notification_email(
        full_name="Jane Smith",
        sender_name="Support Team",
        sender_initials="ST",
        message="Your account has been updated.",
        login_url="https://app.simtrack.com/login",
        frontend_url="https://app.simtrack.com"
    )

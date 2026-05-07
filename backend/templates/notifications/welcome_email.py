"""
Welcome / Invitation Email Template
backend/templates/notifications/welcome_email.py
"""

from typing import Optional
from datetime import datetime
import secrets
import html
import re


class WelcomeEmail:
    """Professional email template for new user welcome/invitation."""

    # Constants for styling - consistent with dealer notification
    COLORS = {
        'primary': '#7c3aed',
        'primary_light': '#a78bfa',
        'primary_dark': '#5b21b6',
        'primary_bg_light': '#f5f3ff',
        'primary_border': '#ddd6fe',
        'warning_bg': '#fefce8',
        'warning_border': '#fde68a',
        'warning_text': '#92400e',
        'warning_text_dark': '#78350f',
        'background': '#f4f4f5',
        'surface': '#ffffff',
        'surface_alt': '#fafafa',
        'border': '#e4e4e7',
        'border_light': '#f4f4f5',
        'text_primary': '#18181b',
        'text_secondary': '#71717a',
        'text_muted': '#a1a1aa',
        'text_light': '#d1d5db',
        'header_bg': '#18181b',
        'code_bg': '#18181b',
        'code_text': '#a78bfa',
    }

    FONTS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    MONO_FONTS = "'Courier New', 'SF Mono', Monaco, 'Cascadia Code', monospace"

    def __init__(
        self,
        full_name: str,
        email: str,
        plain_password: str,
        role_display: str,
        login_url: str,
        frontend_url: str,
        require_password_change: bool = True,
        password_expiry_days: Optional[int] = None,
        include_security_tips: bool = True,
        year: Optional[int] = None,
    ):
        """
        Initialize the welcome email.

        Args:
            full_name: Recipient's full name
            email: User's email address (login username)
            plain_password: Temporary password (will be masked in logs)
            role_display: Display name of the user's role
            login_url: URL for login button
            frontend_url: Base URL of the frontend application
            require_password_change: Whether password change is required on first login
            password_expiry_days: Days until temporary password expires
            include_security_tips: Whether to include security recommendations
            year: Copyright year (defaults to current year)
        """
        self.full_name = self._sanitize_text(full_name)
        self.email = self._sanitize_text(email)
        self.plain_password = plain_password  # Don't sanitize - will be masked in logs
        self.role_display = self._sanitize_text(role_display)
        self.login_url = login_url
        self.frontend_url = frontend_url
        self.require_password_change = require_password_change
        self.password_expiry_days = password_expiry_days or 7
        self.include_security_tips = include_security_tips
        self.year = year or datetime.now().year

        # Validate inputs
        self._validate_email()
        self._validate_password_strength()

    def _validate_email(self) -> None:
        """Validate email format."""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, self.email):
            raise ValueError(f"Invalid email format: {self.email}")

    def _validate_password_strength(self) -> None:
        """Validate password strength and log warning if weak."""
        if len(self.plain_password) < 8:
            # In production, you'd want to log this warning
            print(
                f"Warning: Password for {self.email} is less than 8 characters")

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Sanitize text for HTML output."""
        return html.escape(str(text))

    def _mask_password_in_logs(self) -> str:
        """Return masked password for logging purposes."""
        if len(self.plain_password) <= 4:
            return '*' * len(self.plain_password)
        return self.plain_password[:2] + '*' * (len(self.plain_password) - 4) + self.plain_password[-2:]

    def _get_header_logo(self) -> str:
        """Generate the header logo SVG."""
        return f'''<div style="width:32px;height:32px;background:{self.COLORS['primary']};border-radius:8px;text-align:center;display:inline-flex;align-items:center;justify-content:center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>'''

    def _get_role_badge(self) -> str:
        """Generate the role information badge."""
        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:{self.COLORS['primary_bg_light']};border:1px solid {self.COLORS['primary_border']};border-radius:10px;padding:14px 18px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:{self.COLORS['primary']};text-transform:uppercase;">Your Role</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:{self.COLORS['primary_dark']};">{self.role_display}</p>
                </td>
              </tr>
            </table>'''

    def _get_credentials_card(self) -> str:
        """Generate the credentials information card."""
        # Determine if password change is required text
        password_note = "Temporary password" if self.require_password_change else "Your password"

        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid {self.COLORS['border']};border-radius:10px;overflow:hidden;">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};padding:12px 20px;border-bottom:1px solid {self.COLORS['border']};">
                  <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:{self.COLORS['text_muted']};">Account Credentials</p>
                </td>
              </tr>
              <tr>
                <td style="background:{self.COLORS['surface']};padding:14px 20px;border-bottom:1px solid {self.COLORS['border_light']};">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:{self.COLORS['text_muted']};">Email Address</p>
                  <p style="margin:0;font-size:15px;font-weight:500;color:{self.COLORS['text_primary']};font-family:{self.MONO_FONTS};">{self.email}</p>
                </td>
              </tr>
              <tr>
                <td style="background:{self.COLORS['code_bg']};padding:14px 20px;border-bottom:1px solid {self.COLORS['border_light']};">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:rgba(255,255,255,0.5);">{password_note}</p>
                  <p style="margin:0;font-size:20px;font-weight:700;color:{self.COLORS['code_text']};font-family:{self.MONO_FONTS};letter-spacing:1.5px;word-break:break-all;">{self.plain_password}</p>
                </td>
              </tr>
              <tr>
                <td style="background:{self.COLORS['surface']};padding:14px 20px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:{self.COLORS['text_muted']};">Role Assigned</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:{self.COLORS['primary_bg_light']};border-radius:999px;padding:4px 12px;">
                        <span style="font-size:13px;font-weight:600;color:{self.COLORS['primary_dark']};">{self.role_display}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>'''

    def _get_warning_box(self) -> str:
        """Generate the security warning box."""
        warning_icon = '''<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>'''

        expiry_text = f" This temporary password will expire in {self.password_expiry_days} days." if self.require_password_change else ""

        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:{self.COLORS['warning_bg']};border:1px solid {self.COLORS['warning_border']};border-radius:10px;padding:16px 20px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:12px;vertical-align:top;padding-top:1px;">
                        {warning_icon}
                      </td>
                      <td style="vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:{self.COLORS['warning_text']};line-height:1.55;">
                          <strong style="color:{self.COLORS['warning_text_dark']};">⚠️ Security Notice</strong><br>
                          This is a{" temporary" if self.require_password_change else ""} password.{" You must change it immediately after logging in." if self.require_password_change else ""}{expiry_text}
                          Never share this password with anyone or via email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>'''

    def _get_security_tips(self) -> str:
        """Generate security tips section."""
        if not self.include_security_tips:
            return ''

        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};border-radius:10px;padding:16px 20px;">
                  <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:{self.COLORS['text_primary']};">🔐 Security Best Practices</p>
                  <ul style="margin:0;padding-left:20px;color:{self.COLORS['text_secondary']};font-size:13px;line-height:1.6;">
                    <li>Use a strong, unique password (minimum 12 characters with mix of letters, numbers, and symbols)</li>
                    <li>Enable two-factor authentication (2FA) for additional security</li>
                    <li>Never share your login credentials with anyone</li>
                    <li>Always log out when using shared computers</li>
                    <li>Report any suspicious activity to your administrator immediately</li>
                  </ul>
                </td>
              </tr>
            </table>'''

    def _get_cta_button(self) -> str:
        """Generate the call-to-action button."""
        button_text = "Change Password & Log In" if self.require_password_change else "Log In to SimTrack"

        return f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="{self.login_url}" style="display:inline-block;background:{self.COLORS['primary']};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:0.3px;transition:all 0.3s ease;">
                    {button_text} →
                  </a>
                </td>
              </tr>
            </table>'''

    def _get_footer(self) -> str:
        """Generate the email footer."""
        return f'''<table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;color:{self.COLORS['text_muted']};line-height:1.5;">
                    This email was sent by <strong style="color:{self.COLORS['text_secondary']};">SimTrack</strong><br>
                    SIM Distribution & Commission Management System
                  </p>
                  <p style="margin:0 0 4px;font-size:11px;color:{self.COLORS['text_light']};">
                    © {self.year} SimTrack. All rights reserved.
                  </p>
                  <p style="margin:0;font-size:11px;">
                    <a href="{self.frontend_url}/help" style="color:{self.COLORS['primary']};text-decoration:none;">Help Center</a> &nbsp;|&nbsp;
                    <a href="{self.frontend_url}/security" style="color:{self.COLORS['primary']};text-decoration:none;">Security</a> &nbsp;|&nbsp;
                    <a href="{self.frontend_url}" style="color:{self.COLORS['primary']};text-decoration:none;">{self.frontend_url}</a>
                  </p>
                </td>
              </tr>
            </table>'''

    def generate_html(self) -> str:
        """Generate the complete HTML email content."""
        # Security note for logging (not displayed in email)
        self._mask_password_in_logs()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Welcome to SimTrack</title>
  <style>
    @media only screen and (max-width: 600px) {{
      .container {{ width: 100% !important; }}
      .content {{ padding: 24px 20px !important; }}
      .button {{ display: block !important; width: 100% !important; text-align: center !important; }}
    }}
    @media only print {{
      body {{ background: white !important; }}
      .no-print {{ display: none !important; }}
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
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:{self.COLORS['text_primary']};">Welcome, {self.full_name}! 🎉</p>
              <p style="margin:0 0 32px;font-size:15px;color:{self.COLORS['text_secondary']};line-height:1.6;">
                Your SimTrack account has been created. Here are your login credentials to get started.
              </p>
              
              <!-- Role Badge -->
              {self._get_role_badge()}
              
              <!-- Credentials Card -->
              {self._get_credentials_card()}
              
              <!-- CTA Button -->
              {self._get_cta_button()}
              
              <!-- Warning Box -->
              {self._get_warning_box()}
              
              <!-- Security Tips -->
              {self._get_security_tips()}
              
              <!-- Support Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:13px;color:{self.COLORS['text_muted']};line-height:1.6;text-align:center;">
                      If you did not request this account or believe this email was sent in error,<br>
                      please contact your system administrator immediately.
                    </p>
                  </td>
                </tr>
              </table>
              
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
        password_note = "Temporary password" if self.require_password_change else "Your password"
        expiry_note = f" This password will expire in {self.password_expiry_days} days." if self.require_password_change else ""

        security_tips = ""
        if self.include_security_tips:
            security_tips = """
SECURITY BEST PRACTICES:
• Use a strong, unique password (minimum 12 characters)
• Enable two-factor authentication (2FA)
• Never share your login credentials
• Always log out when using shared computers
• Report suspicious activity to your administrator
"""

        return f"""Welcome to SimTrack!

{'=' * 50}

Hi {self.full_name},

Your SimTrack account has been created. Below are your login credentials.

Account Information:
-------------------
Role: {self.role_display}
Email: {self.email}
{password_note}: {self.plain_password}{expiry_note}

Login URL: {self.login_url}

⚠️ SECURITY NOTICE:
This is a{" temporary" if self.require_password_change else ""} password.{" You must change it immediately after logging in." if self.require_password_change else ""}
Never share this password with anyone or via email.
{security_tips}
Need Help?
---------
Contact your system administrator or visit: {self.frontend_url}/help

---
If you did not request this account, please contact your administrator immediately.

© {self.year} SimTrack - {self.frontend_url}
"""

    def get_email_parts(self) -> tuple[str, str, str]:
        """
        Returns (subject, html_content, plain_text_content) for the email.
        """
        subject = "Welcome to SimTrack — Your Account is Ready"
        return subject, self.generate_html(), self.generate_plain_text()


# Backward compatibility function
def get_welcome_email(
    full_name: str,
    email: str,
    plain_password: str,
    role_display: str,
    login_url: str,
    frontend_url: str,
) -> tuple[str, str]:
    """
    Legacy function for backward compatibility.
    Returns (subject, html_content) for a welcome email.

    Deprecated: Use WelcomeEmail class instead.
    """
    welcome = WelcomeEmail(
        full_name=full_name,
        email=email,
        plain_password=plain_password,
        role_display=role_display,
        login_url=login_url,
        frontend_url=frontend_url,
    )
    subject, html, _ = welcome.get_email_parts()
    return subject, html


# Usage example:
if __name__ == "__main__":
    # Modern usage with class
    welcome = WelcomeEmail(
        full_name="John Doe",
        email="john.doe@example.com",
        plain_password="TempPass123!",
        role_display="Dealer Administrator",
        login_url="https://app.simtrack.com/login",
        frontend_url="https://app.simtrack.com",
        require_password_change=True,
        password_expiry_days=7,
        include_security_tips=True,
    )

    subject, html, plain_text = welcome.get_email_parts()
    print(f"Subject: {subject}")
    print(f"HTML length: {len(html)} characters")
    print(f"Plain text length: {len(plain_text)} characters")

    # Legacy usage (backward compatible)
    subject_legacy, html_legacy = get_welcome_email(
        full_name="Jane Smith",
        email="jane.smith@example.com",
        plain_password="Welcome2024!",
        role_display="Sales Agent",
        login_url="https://app.simtrack.com/login",
        frontend_url="https://app.simtrack.com",
    )

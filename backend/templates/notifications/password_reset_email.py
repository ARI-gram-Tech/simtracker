# backend/templates/notifications/password_reset_email.py

from datetime import datetime
import html


class PasswordResetEmail:
    """Password reset email template — consistent with WelcomeEmail & DealerNotificationEmail."""

    COLORS = {
        'primary':        '#7c3aed',
        'primary_light':  '#a78bfa',
        'primary_dark':   '#5b21b6',
        'primary_bg':     '#f5f3ff',
        'primary_border': '#ddd6fe',
        'background':     '#f4f4f5',
        'surface':        '#ffffff',
        'surface_alt':    '#fafafa',
        'border':         '#e4e4e7',
        'text_primary':   '#18181b',
        'text_secondary': '#71717a',
        'text_muted':     '#a1a1aa',
        'text_light':     '#d1d5db',
        'header_bg':      '#18181b',
        'warning_bg':     '#fefce8',
        'warning_border': '#fde68a',
        'warning_text':   '#92400e',
    }

    FONTS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

    def __init__(
        self,
        first_name: str,
        reset_link: str,
        frontend_url: str,
        expiry_minutes: int = 60,
        year: int | None = None,
    ):
        self.first_name = html.escape(str(first_name))
        self.reset_link = reset_link
        self.frontend_url = frontend_url
        self.expiry_minutes = expiry_minutes
        self.expiry_label = f"{expiry_minutes} minutes" if expiry_minutes < 60 else f"{expiry_minutes // 60} hour{'s' if expiry_minutes > 60 else ''}"
        self.year = year or datetime.now().year

    def _header_logo(self) -> str:
        return f'''
        <div style="width:32px;height:32px;background:{self.COLORS['primary']};border-radius:8px;
                    display:inline-flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff"
               stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
        </div>'''

    def _lock_icon(self) -> str:
        return f'''
        <div style="width:56px;height:56px;background:{self.COLORS['primary_bg']};
                    border:2px solid {self.COLORS['primary_border']};border-radius:50%;
                    display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="{self.COLORS['primary']}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>'''

    def generate_html(self) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your SimTrack password</title>
  <style>
    @media only screen and (max-width:600px) {{
      .container {{ width:100% !important; }}
      .content   {{ padding:24px 20px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:{self.COLORS['background']};font-family:{self.FONTS};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{self.COLORS['background']};padding:40px 20px;">
    <tr><td align="center">
      <table class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:{self.COLORS['header_bg']};border-radius:16px 16px 0 0;padding:28px 32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:12px;vertical-align:middle;">{self._header_logo()}</td>
              <td style="vertical-align:middle;">
                <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
                  Sim<span style="color:{self.COLORS['primary_light']};">Track</span>
                </span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="content" style="background:{self.COLORS['surface']};padding:40px 32px 32px;">

            <!-- Icon + heading -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                {self._lock_icon()}
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:{self.COLORS['text_primary']};">
                  Reset your password
                </h1>
                <p style="margin:0;font-size:15px;color:{self.COLORS['text_secondary']};">
                  Hi {self.first_name}, we received a request to reset your SimTrack password.
                </p>
              </td></tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td style="border-top:1px solid {self.COLORS['border']};"></td></tr>
            </table>

            <!-- Expiry notice -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:{self.COLORS['primary_bg']};border:1px solid {self.COLORS['primary_border']};
                            border-radius:10px;padding:14px 18px;">
                  <p style="margin:0;font-size:14px;color:{self.COLORS['primary_dark']};line-height:1.55;">
                    🔒 This link is valid for <strong>{self.expiry_label}</strong> and can only be used once.
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="{self.reset_link}"
                   style="display:inline-block;background:{self.COLORS['primary']};color:#fff;
                          text-decoration:none;font-size:15px;font-weight:700;
                          padding:14px 40px;border-radius:10px;letter-spacing:0.3px;">
                  Reset Password →
                </a>
              </td></tr>
            </table>

            <!-- Fallback link -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};
                            border-radius:10px;padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.07em;
                             text-transform:uppercase;color:{self.COLORS['text_muted']};">
                    Button not working? Copy this link:
                  </p>
                  <p style="margin:0;font-size:12px;color:{self.COLORS['primary']};word-break:break-all;">
                    {self.reset_link}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr><td style="border-top:1px solid {self.COLORS['border']};"></td></tr>
            </table>

            <p style="margin:0;font-size:13px;color:{self.COLORS['text_muted']};line-height:1.6;text-align:center;">
              For security, this link expires in {self.expiry_label}.<br>
              Never share this link with anyone.
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:{self.COLORS['surface_alt']};border:1px solid {self.COLORS['border']};
                      border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:12px;color:{self.COLORS['text_muted']};line-height:1.5;">
              This email was sent by <strong style="color:{self.COLORS['text_secondary']};">SimTrack</strong><br>
              SIM Distribution & Commission Management System
            </p>
            <p style="margin:0;font-size:11px;color:{self.COLORS['text_light']};">
              © {self.year} SimTrack. All rights reserved. &nbsp;|&nbsp;
              <a href="{self.frontend_url}" style="color:{self.COLORS['primary']};text-decoration:none;">
                {self.frontend_url}
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    def generate_plain_text(self) -> str:
        return f"""Reset your SimTrack password
{'=' * 40}

Hi {self.first_name},

We received a request to reset your SimTrack password.

Click the link below to reset it (expires in {self.expiry_label}):

{self.reset_link}

If you didn't request this, you can safely ignore this email.
Never share this link with anyone.

---
© {self.year} SimTrack — {self.frontend_url}
"""

    def get_email_parts(self) -> tuple[str, str, str]:
        """Returns (subject, html_content, plain_text_content)."""
        return (
            "Reset your SimTrack password",
            self.generate_html(),
            self.generate_plain_text(),
        )

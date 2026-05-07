# backend/config/settings/development.py
from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# Accept requests from any origin in dev so you never have to add ports manually.
# This is safe because this file is never used in production.
CORS_ALLOW_ALL_ORIGINS = True
# Note: do NOT also set CORS_ALLOWED_ORIGINS here — the two settings conflict.
# CORS_ALLOW_ALL_ORIGINS=True already covers everything.

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")
ANYMAIL = {
    "BREVO_API_KEY": env("BREVO_API_KEY"),
}

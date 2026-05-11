# backend/config/settings/production.py
from .base import *

DEBUG = False

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

DATABASES = {
    "default": {
        "ENGINE":   "django.db.backends.postgresql",
        "NAME":     env("DB_NAME"),
        "USER":     env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST":     env("DB_HOST"),
        "PORT":     env("DB_PORT", default="5432"),
    }
}

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, only your real frontend domain is allowed.
# Set CORS_ALLOWED_ORIGINS in your production .env as a comma-separated list:
# CORS_ALLOWED_ORIGINS=https://app.simtrack.com,https://www.simtrack.com
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")
ANYMAIL = {
    "BREVO_API_KEY": env("BREVO_API_KEY"),
}

# ── Security hardening ────────────────────────────────────────────────────────
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_SSL_REDIRECT = True
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

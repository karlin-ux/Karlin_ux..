"""
Django settings for Karlin_ux.

Configuration is read from environment variables. See .env.example.
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.core.checks import register, CheckMessage, Error, Warning
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # Backend/
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", str(BASE_DIR.parent / "Frontend")))

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

def env_bool(name, default=False):
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}

def env_list(name, default=""):
    v = os.environ.get(name, default)
    return [i.strip() for i in v.split(",") if i.strip()]

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is not set.")

DEBUG = env_bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

# --- Production security validation ---
# Weak/default secret keys that must never be used in production
_INSECURE_SECRET_KEYS = {
    "",
    "karlin-dev-secret-key-change-me-1234567890abcdef",
    "replace-with-a-long-random-value",
    "test-secret-key-not-for-production",
    "django-insecure-",
}

def _validate_production_settings():
    """Validate that production settings are secure when DEBUG=False."""
    errors = []
    if DEBUG:
        return errors  # Development mode — skip strict validation

    # Secret key must be strong
    if SECRET_KEY in _INSECURE_SECRET_KEYS or len(SECRET_KEY) < 32:
        errors.append(
            "DJANGO_SECRET_KEY is missing, weak, or a known default. "
            "Set a strong random secret key (at least 32 characters) for production."
        )
    if SECRET_KEY.startswith("django-insecure-"):
        errors.append("DJANGO_SECRET_KEY must not use the django-insecure- prefix in production.")

    # ALLOWED_HOSTS must not be localhost-only
    if not ALLOWED_HOSTS or all(h in {"localhost", "127.0.0.1", "::1"} for h in ALLOWED_HOSTS):
        errors.append(
            "DJANGO_ALLOWED_HOSTS must include at least one non-localhost host in production."
        )

    # CSRF_TRUSTED_ORIGINS must be set for production
    if not CSRF_TRUSTED_ORIGINS:
        errors.append(
            "DJANGO_CSRF_TRUSTED_ORIGINS must be set in production for CSRF protection to work."
        )

    # Secure cookies should be enabled
    if not env_bool("DJANGO_SECURE_COOKIES", default=False):
        errors.append(
            "DJANGO_SECURE_COOKIES must be True in production (HTTPS required)."
        )

    # SSL redirect should be enabled
    if not env_bool("DJANGO_SECURE_SSL_REDIRECT", default=False):
        errors.append(
            "DJANGO_SECURE_SSL_REDIRECT must be True in production."
        )

    if errors:
        raise ImproperlyConfigured(
            "Production security validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
        )

_validate_production_settings()

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "config",
    "accounts",
    "workspaces",
    "showcase",
    "demo",
    "platform_admin",
    "audit",
    "contact",
    "media",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "config.middleware.RequestIDMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [FRONTEND_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database
POSTGRES_DB = os.environ.get("POSTGRES_DB", "karlin_ux")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "karlin_ux")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": POSTGRES_DB,
        "USER": POSTGRES_USER,
        "PASSWORD": POSTGRES_PASSWORD,
        "HOST": POSTGRES_HOST,
        "PORT": POSTGRES_PORT,
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "uploads"

# Request and upload size limits
# Align with MEDIA_MAX_UPLOAD_SIZE (default 10MB) for consistent behavior
MEDIA_MAX_UPLOAD_SIZE = int(os.environ.get("MEDIA_MAX_UPLOAD_SIZE", "10485760") or 10485760)
DATA_UPLOAD_MAX_MEMORY_SIZE = MEDIA_MAX_UPLOAD_SIZE
FILE_UPLOAD_MAX_MEMORY_SIZE = MEDIA_MAX_UPLOAD_SIZE

# WhiteNoise compressed static files storage
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "login": "100/min",
        "contact": "100/hour",
    },
}

# CORS
# In production, CORS_ALLOWED_ORIGINS should be explicitly set to the frontend origin.
# By default, we derive from CSRF_TRUSTED_ORIGINS for convenience, but operators
# should set DJANGO_CORS_ALLOWED_ORIGINS explicitly in production.
_cors_origins = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CORS_ALLOWED_ORIGINS = _cors_origins if _cors_origins else env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True
# Never allow wildcard origins with credentials
if "*" in CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must not contain '*' when CORS_ALLOW_CREDENTIALS is True.")

# Security
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", default=False)
CSRF_COOKIE_SECURE = env_bool("DJANGO_SECURE_COOKIES", default=False)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "0") or 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)

# Proxy SSL header — needed when running behind a reverse proxy (Caddy, nginx, etc.)
# Set DJANGO_SECURE_PROXY_SSL_HEADER=True in production behind a proxy.
if env_bool("DJANGO_SECURE_PROXY_SSL_HEADER", default=False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Content Security Policy (manual header via middleware not added; configure in proxy too)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "blob:")
CSP_CONNECT_SRC = ("'self'",)
CSP_FONT_SRC = ("'self'", "data:")
CSP_FRAME_ANCESTORS = ("'none'",)

# Custom user model
AUTH_USER_MODEL = "accounts.User"

# Email
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587") or 587)
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@localhost")
CONTACT_RECIPIENT_EMAIL = os.environ.get("CONTACT_RECIPIENT_EMAIL", "contact@localhost")

# Import production security checks (registers with Django's check framework)
try:
    from . import checks  # noqa: F401
except ImportError:
    pass

# Logging
_LOG_LEVEL = os.environ.get("DJANGO_LOG_LEVEL", "INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": "config.log_filter.RequestIDFilter",
        },
    },
    "formatters": {
        "standard": {
            "format": "[{asctime}] {levelname} {name} [{request_id}]: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "filters": ["request_id"],
        },
    },
    "root": {"handlers": ["console"], "level": _LOG_LEVEL},
    "loggers": {
        "django": {"handlers": ["console"], "level": _LOG_LEVEL, "propagate": False},
        "django.security": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
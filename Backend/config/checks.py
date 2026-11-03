"""
Django system checks for production security configuration.

These checks run during `python manage.py check` and provide warnings/errors
when production security settings are not properly configured.
"""
from django.core.checks import register, CheckMessage, Warning, Error
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


@register(deploy=True)
def check_production_security(app_configs, **kwargs):
    """Warn about insecure production settings."""
    errors = []
    warnings = []

    if settings.DEBUG:
        return []  # Development mode — skip

    # Secret key strength
    try:
        secret_key = settings.SECRET_KEY
    except ImproperlyConfigured:
        secret_key = ""
    if len(secret_key) < 32:
        errors.append(
            Error(
                "SECRET_KEY is too short for production (minimum 32 characters).",
                id="config.E001",
            )
        )

    # ALLOWED_HOSTS
    if not settings.ALLOWED_HOSTS or all(
        h in {"localhost", "127.0.0.1", "::1"} for h in settings.ALLOWED_HOSTS
    ):
        errors.append(
            Error(
                "ALLOWED_HOSTS must include at least one non-localhost host in production.",
                id="config.E002",
            )
        )

    # CSRF trusted origins
    if not settings.CSRF_TRUSTED_ORIGINS:
        errors.append(
            Error(
                "CSRF_TRUSTED_ORIGINS must be set in production.",
                id="config.E003",
            )
        )

    # Secure cookies
    if not getattr(settings, "SESSION_COOKIE_SECURE", False):
        errors.append(
            Error(
                "SESSION_COOKIE_SECURE must be True in production.",
                id="config.E004",
            )
        )
    if not getattr(settings, "CSRF_COOKIE_SECURE", False):
        errors.append(
            Error(
                "CSRF_COOKIE_SECURE must be True in production.",
                id="config.E005",
            )
        )

    # SSL redirect
    if not getattr(settings, "SECURE_SSL_REDIRECT", False):
        errors.append(
            Error(
                "SECURE_SSL_REDIRECT must be True in production.",
                id="config.E006",
            )
        )

    # HSTS
    hsts = getattr(settings, "SECURE_HSTS_SECONDS", 0)
    if hsts < 31536000:
        warnings.append(
            Warning(
                "SECURE_HSTS_SECONDS should be at least 31536000 (1 year) in production.",
                id="config.W001",
            )
        )

    # Content Security Policy
    warnings.append(
        Warning(
            "Content Security Policy is not enforced via middleware. "
            "Configure CSP headers in Caddy or add django-csp.",
            id="config.W002",
        )
    )

    return errors + warnings
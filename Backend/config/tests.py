"""
Tests for production security configuration.

These tests verify that production settings are properly validated
and that insecure configurations are rejected.
"""
import os
from unittest import mock

from django.test import TestCase, override_settings
from django.core.exceptions import ImproperlyConfigured
from django.test.utils import override_system_checks


class ProductionSecretKeyTests(TestCase):
    """Test that production rejects missing or weak secret keys."""

    def _run_settings_with_env(self, env_overrides):
        """Helper to test settings loading with environment overrides."""
        with mock.patch.dict(os.environ, env_overrides, clear=False):
            # Force re-import of settings by reloading the module
            import importlib
            import config.settings as settings_module
            # We can't easily reload settings in Django, so we test the
            # validation function directly instead.
            pass

    def test_weak_secret_key_rejected_in_production(self):
        """Production mode with a weak secret key should raise ImproperlyConfigured."""
        env = {
            "DJANGO_DEBUG": "False",
            "DJANGO_SECRET_KEY": "short",
            "DJANGO_ALLOWED_HOSTS": "example.com",
            "DJANGO_SECURE_COOKIES": "true",
            "DJANGO_SECURE_SSL_REDIRECT": "true",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "https://example.com",
        }
        with mock.patch.dict(os.environ, env, clear=False):
            # Temporarily set DEBUG to False by overriding the env
            os.environ["DJANGO_DEBUG"] = "False"
            try:
                import importlib
                # Re-execute the settings module validation by importing fresh
                # We test by calling the validation logic
                from django.conf import settings as django_settings
                # Since settings are already loaded, we test the check function
                from config.checks import check_production_security
                from django.core.checks import Error
                # Simulate production settings
                with override_settings(DEBUG=False, SECRET_KEY="short"):
                    errors = check_production_security(None)
                    self.assertTrue(len(errors) > 0)
                    self.assertTrue(any("SECRET_KEY" in str(e) for e in errors))
            finally:
                os.environ["DJANGO_DEBUG"] = "True"

    def test_missing_secret_key_rejected(self):
        """Production mode with empty secret key should raise ImproperlyConfigured."""
        from config.checks import check_production_security
        with override_settings(DEBUG=False, SECRET_KEY=""):
            errors = check_production_security(None)
            self.assertTrue(len(errors) > 0)

    def test_known_default_secret_key_rejected(self):
        """Production mode with a known default secret key should be rejected."""
        from config.checks import check_production_security
        with override_settings(DEBUG=False, SECRET_KEY="karlin-dev-secret-key-change-me-1234567890abcdef"):
            errors = check_production_security(None)
            self.assertTrue(len(errors) > 0)


class ProductionDebugTests(TestCase):
    """Test that production cannot run with DEBUG enabled via validation."""

    def test_debug_true_skips_production_checks(self):
        """When DEBUG=True, production security checks should return no errors."""
        from config.checks import check_production_security
        with override_settings(DEBUG=True):
            errors = check_production_security(None)
            self.assertEqual(len(errors), 0)


class ProductionHostTests(TestCase):
    """Test that invalid production hosts are rejected."""

    def test_localhost_only_hosts_rejected(self):
        """Production with only localhost hosts should be rejected."""
        from config.checks import check_production_security
        with override_settings(DEBUG=False, ALLOWED_HOSTS=["localhost", "127.0.0.1"]):
            errors = check_production_security(None)
            self.assertTrue(len(errors) > 0)
            self.assertTrue(any("ALLOWED_HOSTS" in str(e) for e in errors))

    def test_valid_hosts_accepted(self):
        """Production with a valid non-localhost host should pass host check."""
        from config.checks import check_production_security
        with override_settings(
            DEBUG=False,
            ALLOWED_HOSTS=["example.com"],
            SECRET_KEY="a-very-long-and-secure-secret-key-that-is-at-least-32-chars",
            SESSION_COOKIE_SECURE=True,
            CSRF_COOKIE_SECURE=True,
            SECURE_SSL_REDIRECT=True,
            CSRF_TRUSTED_ORIGINS=["https://example.com"],
            SECURE_HSTS_SECONDS=31536000,
        ):
            errors = check_production_security(None)
            # Only warnings (CSP) should remain, no errors
            from django.core.checks import Error
            actual_errors = [e for e in errors if isinstance(e, Error)]
            self.assertEqual(len(actual_errors), 0)


class ProductionCookieTests(TestCase):
    """Test that production requires secure cookies."""

    def test_insecure_session_cookie_rejected(self):
        from config.checks import check_production_security
        with override_settings(DEBUG=False, SESSION_COOKIE_SECURE=False):
            errors = check_production_security(None)
            self.assertTrue(any("SESSION_COOKIE_SECURE" in str(e) for e in errors))

    def test_insecure_csrf_cookie_rejected(self):
        from config.checks import check_production_security
        with override_settings(DEBUG=False, CSRF_COOKIE_SECURE=False):
            errors = check_production_security(None)
            self.assertTrue(any("CSRF_COOKIE_SECURE" in str(e) for e in errors))

    def test_no_ssl_redirect_rejected(self):
        from config.checks import check_production_security
        with override_settings(DEBUG=False, SECURE_SSL_REDIRECT=False):
            errors = check_production_security(None)
            self.assertTrue(any("SECURE_SSL_REDIRECT" in str(e) for e in errors))


class ProductionCSRFTests(TestCase):
    """Test CSRF configuration."""

    def test_empty_csrf_origins_rejected(self):
        from config.checks import check_production_security
        with override_settings(DEBUG=False, CSRF_TRUSTED_ORIGINS=[]):
            errors = check_production_security(None)
            self.assertTrue(any("CSRF_TRUSTED_ORIGINS" in str(e) for e in errors))


class CORSTests(TestCase):
    """Test CORS configuration."""

    def test_cors_no_wildcard_with_credentials(self):
        """CORS_ALLOWED_ORIGINS must not contain '*' with credentials."""
        from django.conf import settings
        # Verify the setting doesn't contain wildcard
        self.assertNotIn("*", getattr(settings, "CORS_ALLOWED_ORIGINS", []))

    def test_cors_credentials_enabled(self):
        """CORS_ALLOW_CREDENTIALS should be True for session auth."""
        from django.conf import settings
        self.assertTrue(getattr(settings, "CORS_ALLOW_CREDENTIALS", False))


class PersonalEmailTests(TestCase):
    """Test that personal email is not hardcoded."""

    def test_contact_recipient_not_hardcoded_personal(self):
        """CONTACT_RECIPIENT_EMAIL should not default to a personal email."""
        from django.conf import settings
        recipient = getattr(settings, "CONTACT_RECIPIENT_EMAIL", "")
        self.assertNotIn("yourheinskarl", recipient)
        self.assertNotIn("gmail.com", recipient)


class HealthEndpointTests(TestCase):
    """Test public health endpoints."""

    def test_liveness_returns_200(self):
        """Liveness endpoint should return 200 with status ok."""
        from django.test.client import Client
        client = Client()
        r = client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")

    def test_liveness_no_sensitive_info(self):
        """Liveness endpoint should not expose sensitive information."""
        from django.test.client import Client
        client = Client()
        r = client.get("/api/health/")
        data = r.json()
        # Should only contain status
        self.assertEqual(set(data.keys()), {"status"})
        # Should not contain any sensitive keys
        sensitive_keys = {"database", "host", "port", "password", "secret", "debug", "version", "settings"}
        self.assertTrue(sensitive_keys.isdisjoint(set(data.keys())))

    def test_readiness_returns_200_when_db_available(self):
        """Readiness endpoint should return 200 when database is available."""
        from django.test.client import Client
        client = Client()
        r = client.get("/api/health/ready/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ready")

    def test_readiness_no_sensitive_info(self):
        """Readiness endpoint should not expose sensitive information."""
        from django.test.client import Client
        client = Client()
        r = client.get("/api/health/ready/")
        data = r.json()
        # Should only contain status
        self.assertEqual(set(data.keys()), {"status"})
        sensitive_keys = {"database", "host", "port", "password", "secret", "debug", "version", "settings", "connection"}
        self.assertTrue(sensitive_keys.isdisjoint(set(data.keys())))

    def test_health_endpoints_no_auth_required(self):
        """Health endpoints should not require authentication."""
        from django.test.client import Client
        client = Client()
        r1 = client.get("/api/health/")
        r2 = client.get("/api/health/ready/")
        self.assertNotEqual(r1.status_code, 401)
        self.assertNotEqual(r1.status_code, 403)
        self.assertNotEqual(r2.status_code, 401)
        self.assertNotEqual(r2.status_code, 403)

class CrossOriginAuthConfigTests(TestCase):
    """Regression tests for cross-origin cookie/CORS/CSRF/session authentication."""

    FRONTEND_ORIGIN = "https://karlin-ux-frontend.onrender.com"
    OTHER_ORIGIN = "https://evil.example.com"

    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(email="corsuser@example.com", password="TestPass123!")

    @override_settings(
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        CSRF_COOKIE_HTTPONLY=False,
        SESSION_COOKIE_SAMESITE="None",
        CSRF_COOKIE_SAMESITE="None",
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_csrf_cookie_attributes_for_cross_site_https(self):
        client = Client(enforce_csrf_checks=False)
        r = client.get("/api/auth/csrf/", HTTP_ORIGIN=self.FRONTEND_ORIGIN)
        self.assertEqual(r.status_code, 200)
        self.assertIn("csrftoken", r.cookies)
        c = r.cookies["csrftoken"]
        self.assertEqual(c["samesite"], "None")
        self.assertTrue(c["secure"])
        # CSRF cookie is intentionally readable by JS for header-based double-submit patterns.
        self.assertIn(c["httponly"], ("", False))

    @override_settings(
        SESSION_COOKIE_SECURE=True,
        CSRF_COOKIE_SECURE=True,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="None",
        CSRF_COOKIE_SAMESITE="None",
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_session_cookie_attributes_for_cross_site_https(self):
        client = Client(enforce_csrf_checks=False)
        r = client.post(
            "/api/auth/login/",
            {"email": "corsuser@example.com", "password": "TestPass123!"},
            content_type="application/json",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
        )
        self.assertEqual(r.status_code, 200)
        self.assertIn("sessionid", r.cookies)
        c = r.cookies["sessionid"]
        self.assertEqual(c["samesite"], "None")
        self.assertTrue(c["secure"])
        self.assertTrue(c["httponly"])

    @override_settings(
        SESSION_COOKIE_SECURE=False,
        CSRF_COOKIE_SECURE=False,
        SESSION_COOKIE_SAMESITE="Lax",
        CSRF_COOKIE_SAMESITE="Lax",
        CORS_ALLOWED_ORIGINS=["http://localhost:5173"],
        CSRF_TRUSTED_ORIGINS=["http://localhost:5173"],
    )
    def test_local_development_cookie_settings_supported(self):
        client = Client(enforce_csrf_checks=False)
        r = client.get("/api/auth/csrf/", HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(r.status_code, 200)
        self.assertIn("csrftoken", r.cookies)
        c = r.cookies["csrftoken"]
        self.assertEqual(c["samesite"], "Lax")
        self.assertIn(c["secure"], ("", False))

    @override_settings(
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_cors_preflight_allows_exact_frontend_origin_with_credentials(self):
        client = Client()
        r = client.options(
            "/api/auth/login/",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken",
        )
        self.assertIn(r.status_code, (200, 204))
        self.assertEqual(r.get("Access-Control-Allow-Origin"), self.FRONTEND_ORIGIN)
        self.assertEqual(r.get("Access-Control-Allow-Credentials"), "true")

    @override_settings(
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_cors_rejects_disallowed_origin(self):
        client = Client()
        r = client.options(
            "/api/auth/login/",
            HTTP_ORIGIN=self.OTHER_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken",
        )
        self.assertNotEqual(r.get("Access-Control-Allow-Origin"), self.OTHER_ORIGIN)
        # Disallowed origins must not receive credentialed allow-origin for that origin.
        self.assertNotEqual(r.get("Access-Control-Allow-Credentials"), "true" if r.get("Access-Control-Allow-Origin") == self.OTHER_ORIGIN else "unexpected")

    @override_settings(
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_credentialed_response_only_for_exact_frontend_origin(self):
        client = Client(enforce_csrf_checks=False)
        r_ok = client.get("/api/auth/csrf/", HTTP_ORIGIN=self.FRONTEND_ORIGIN)
        self.assertEqual(r_ok.get("Access-Control-Allow-Origin"), self.FRONTEND_ORIGIN)
        self.assertEqual(r_ok.get("Access-Control-Allow-Credentials"), "true")

        r_bad = client.get("/api/auth/csrf/", HTTP_ORIGIN=self.OTHER_ORIGIN)
        self.assertNotEqual(r_bad.get("Access-Control-Allow-Origin"), self.OTHER_ORIGIN)
        self.assertNotEqual(r_bad.get("Access-Control-Allow-Credentials"), "true")

    @override_settings(
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_csrf_validation_enforced_for_session_authenticated_requests(self):
        client = Client(enforce_csrf_checks=True)
        # Obtain CSRF cookie and authenticate
        r = client.get("/api/auth/csrf/", HTTP_ORIGIN=self.FRONTEND_ORIGIN)
        self.assertEqual(r.status_code, 200)
        csrftoken = r.cookies.get("csrftoken").value
        login = client.post(
            "/api/auth/login/",
            {"email": "corsuser@example.com", "password": "TestPass123!"},
            content_type="application/json",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
            HTTP_X_CSRFTOKEN=csrftoken,
        )
        self.assertEqual(login.status_code, 200)

        # Unsafe authenticated request without CSRF token must be rejected.
        r_forbidden = client.post(
            "/api/auth/logout/",
            content_type="application/json",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
        )
        self.assertEqual(r_forbidden.status_code, 403)

        # Unsafe authenticated request with valid CSRF token must succeed.
        r_ok = client.post(
            "/api/auth/logout/",
            content_type="application/json",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
            HTTP_X_CSRFTOKEN=csrftoken,
        )
        self.assertEqual(r_ok.status_code, 200)

    @override_settings(
        CORS_ALLOW_CREDENTIALS=True,
        CORS_ALLOWED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
        CSRF_TRUSTED_ORIGINS=["https://karlin-ux-frontend.onrender.com"],
    )
    def test_session_authentication_with_credentials(self):
        client = Client(enforce_csrf_checks=True)
        r = client.get("/api/auth/csrf/", HTTP_ORIGIN=self.FRONTEND_ORIGIN)
        csrftoken = r.cookies.get("csrftoken").value
        login = client.post(
            "/api/auth/login/",
            {"email": "corsuser@example.com", "password": "TestPass123!"},
            content_type="application/json",
            HTTP_ORIGIN=self.FRONTEND_ORIGIN,
            HTTP_X_CSRFTOKEN=csrftoken,
        )
        self.assertEqual(login.status_code, 200)
        me = client.get("/api/auth/me/", HTTP_ORIGIN=self.FRONTEND_ORIGIN)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json().get("email"), "corsuser@example.com")

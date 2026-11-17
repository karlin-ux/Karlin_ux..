from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.core import mail
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, TransactionTestCase, override_settings
from django.test.client import Client
from django.utils import timezone

from accounts.models import DonationDonation, DonationProduct, EmailVerificationToken, User, Workspace
from accounts.views import (
    _email_cooldown_cache_key,
    _email_verification_in_cooldown,
    EmailVerificationConfirmIPThrottle,
    EmailVerificationConfirmScopedThrottle,
    EmailVerificationRequestIPThrottle,
    EmailVerificationRequestScopedThrottle,
    EmailVerificationResendIPThrottle,
    EmailVerificationResendScopedThrottle,
)
from rest_framework.settings import api_settings
from contextlib import contextmanager
from copy import deepcopy


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_register_creates_workspace(self):
        r = self.client.post(
            "/api/auth/register/",
            {"email": "a@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("detail"), "If registration is successful, you can sign in.")
        u = User.objects.get(email="a@b.com")
        self.assertFalse(u.is_superadmin)
        self.assertEqual(u.owned_workspaces.count(), 1)
        self.assertTrue(u.customer_profile is not None)
        # Registration must not establish an authenticated session.
        me = self.client.get("/api/auth/me/")
        self.assertIn(me.status_code, (401, 403))
        login = self.client.post(
            "/api/auth/login/",
            {"email": "a@b.com", "password": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)

    def test_superadmin_not_public(self):
        # cannot register as superadmin
        r = self.client.post(
            "/api/auth/register/",
            {"email": "x@y.com", "password": "TestPass123!", "password_confirm": "TestPass123!", "role": "superadmin"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("detail"), "If registration is successful, you can sign in.")
        u = User.objects.get(email="x@y.com")
        self.assertEqual(u.role, User.ROLE_STANDARD)
        self.assertIn(self.client.get("/api/auth/me/").status_code, (401, 403))


class IsolationTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "u1@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c1.post("/api/auth/login/", {"email": "u1@b.com", "password": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "u2@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/login/", {"email": "u2@b.com", "password": "TestPass123!"}, content_type="application/json")
        p1 = self.c1.get("/api/demo/products/").json()
        self.pid = (p1.get("results") or p1)[0]["id"]

    def test_cross_workspace_product_hidden(self):
        r = self.c2.get(f"/api/demo/products/{self.pid}/")
        self.assertEqual(r.status_code, 404)

    def test_platform_forbidden_for_standard(self):
        r = self.c1.get("/api/platform/users/")
        self.assertEqual(r.status_code, 403)


class SuperAdminTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)
        UserModel = get_user_model()
        self.owner = UserModel.objects.create_superuser(email="owner@test.com", password="OwnerPass123!")
        self.owner.role = UserModel.ROLE_SUPERADMIN
        self.owner.save()

    def test_owner_can_access_platform(self):
        self.client.login(username="owner@test.com", password="OwnerPass123!")
        r = self.client.get("/api/platform/users/")
        self.assertEqual(r.status_code, 200)

    def test_standard_cannot_access_platform(self):
        self.client.post("/api/auth/register/", {"email": "std@test.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.client.post("/api/auth/login/", {"email": "std@test.com", "password": "TestPass123!"}, content_type="application/json")
        r = self.client.get("/api/platform/users/")
        self.assertEqual(r.status_code, 403)

    def test_no_public_superadmin_registration(self):
        self.client.post("/api/auth/register/", {"email": "hack@test.com", "password": "TestPass123!", "password_confirm": "TestPass123!", "role": "superadmin"}, content_type="application/json")
        u = User.objects.get(email="hack@test.com")
        self.assertNotEqual(u.role, User.ROLE_SUPERADMIN)


class DataSeparationTests(TestCase):
    def setUp(self):
        self.c = Client(enforce_csrf_checks=False)
        self.c.post("/api/auth/register/", {"email": "w@test.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c.post("/api/auth/login/", {"email": "w@test.com", "password": "TestPass123!"}, content_type="application/json")

    def test_demo_dashboard_marked_simulated(self):
        r = self.c.get("/api/demo/dashboard/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("simulated"))

    def test_platform_analytics_not_simulated_label(self):
        # platform analytics requires superadmin; standard denied
        r = self.c.get("/api/platform/analytics/")
        self.assertEqual(r.status_code, 403)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EmailVerificationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def _create_unverified_user(self, email="verify@example.com"):
        r = self.client.post(
            "/api/auth/register/",
            {"email": email, "password": "TestPass123!", "password_confirm": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("detail"), "If registration is successful, you can sign in.")
        u = User.objects.get(email=email)
        self.assertFalse(u.is_verified)
        self.assertIsNone(u.email_verified_at)
        return u

    def test_successful_verification_marks_verified_and_sets_timestamp(self):
        user = self._create_unverified_user("ok@example.com")
        raw, token_obj = EmailVerificationToken.issue_for_user(user)
        self.assertNotEqual(raw, token_obj.token)
        self.assertEqual(token_obj.token, EmailVerificationToken.hash_token(raw))

        r = self.client.post(
            "/api/auth/verify-email/confirm/",
            {"token": raw},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        token_obj.refresh_from_db()
        self.assertTrue(user.is_verified)
        self.assertIsNotNone(user.email_verified_at)
        self.assertTrue(token_obj.used)

    def test_verification_confirm_via_path_token(self):
        user = self._create_unverified_user("path@example.com")
        raw, _ = EmailVerificationToken.issue_for_user(user)
        r = self.client.post(f"/api/auth/verify-email/{raw}/", content_type="application/json")
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_invalid_token_rejected(self):
        r = self.client.post(
            "/api/auth/verify-email/confirm/",
            {"token": "not-a-real-token"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("detail", r.json())

    def test_expired_token_rejected(self):
        user = self._create_unverified_user("expired@example.com")
        raw, token_obj = EmailVerificationToken.issue_for_user(user)
        token_obj.expires_at = timezone.now() - timedelta(minutes=1)
        token_obj.save(update_fields=["expires_at"])
        r = self.client.post(
            "/api/auth/verify-email/confirm/",
            {"token": raw},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        token_obj.refresh_from_db()
        user.refresh_from_db()
        self.assertFalse(token_obj.used)
        self.assertFalse(user.is_verified)

    def test_reused_token_rejected(self):
        user = self._create_unverified_user("reuse@example.com")
        raw, _ = EmailVerificationToken.issue_for_user(user)
        r1 = self.client.post("/api/auth/verify-email/confirm/", {"token": raw}, content_type="application/json")
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post("/api/auth/verify-email/confirm/", {"token": raw}, content_type="application/json")
        self.assertEqual(r2.status_code, 400)

    def test_token_is_stored_hashed_not_raw(self):
        user = self._create_unverified_user("hash@example.com")
        raw, token_obj = EmailVerificationToken.issue_for_user(user)
        token_obj.refresh_from_db()
        self.assertNotEqual(token_obj.token, raw)
        self.assertEqual(len(token_obj.token), 64)
        self.assertEqual(token_obj.token, EmailVerificationToken.hash_token(raw))

    def test_resend_invalidates_old_tokens_and_sends_safely(self):
        user = self._create_unverified_user("resend@example.com")
        old_raw, old_obj = EmailVerificationToken.issue_for_user(user)
        r = self.client.post("/api/auth/resend-verification/", {"email": user.email}, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("detail", r.json())
        old_obj.refresh_from_db()
        self.assertTrue(old_obj.used)
        # old token no longer valid
        r_old = self.client.post("/api/auth/verify-email/confirm/", {"token": old_raw}, content_type="application/json")
        self.assertEqual(r_old.status_code, 400)
        # exactly one new active token should exist and be usable
        active = EmailVerificationToken.objects.filter(user=user, used=False)
        self.assertEqual(active.count(), 1)

    def test_resend_and_request_do_not_enumerate_accounts(self):
        # Non-existent email
        r1 = self.client.post("/api/auth/resend-verification/", {"email": "nobody@example.com"}, content_type="application/json")
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post("/api/auth/verify-email/", {"email": "nobody@example.com"}, content_type="application/json")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r1.json().get("detail"), r2.json().get("detail"))
        # Existing verified email should get same generic response
        verified = self._create_unverified_user("known@example.com")
        verified.is_verified = True
        verified.email_verified_at = timezone.now()
        verified.save(update_fields=["is_verified", "email_verified_at"])
        r3 = self.client.post("/api/auth/resend-verification/", {"email": verified.email}, content_type="application/json")
        self.assertEqual(r3.status_code, 200)
        self.assertEqual(r1.json().get("detail"), r3.json().get("detail"))

    def test_legacy_unverified_user_can_still_login(self):
        # Existing/legacy unverified accounts must not be locked out by this remediation.
        user = self._create_unverified_user("legacy@example.com")
        self.assertFalse(user.is_verified)
        client = Client(enforce_csrf_checks=False)
        r = client.post(
            "/api/auth/login/",
            {"email": "legacy@example.com", "password": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("email"), "legacy@example.com")

    def test_registration_duplicate_email_generic_error(self):
        self._create_unverified_user("dup@example.com")
        client = Client(enforce_csrf_checks=False)
        r = client.post(
            "/api/auth/register/",
            {"email": "dup@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."})
        # Duplicate attempt must not authenticate as existing user.
        me = client.get("/api/auth/me/")
        self.assertIn(me.status_code, (401, 403))

    def test_unauthorized_sensitive_change_password_still_requires_auth(self):
        # Sensitive operation endpoint remains authenticated (verification policy does not open it).
        client = Client(enforce_csrf_checks=False)
        r = client.post("/api/auth/change-password/", {"old_password": "x", "new_password": "NewPass123!"}, content_type="application/json")
        self.assertIn(r.status_code, (401, 403))


class GoogleOAuthDisabledTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_google_login_disabled(self):
        r = self.client.get("/api/auth/google/")
        self.assertEqual(r.status_code, 501)
        self.assertIn("not available", r.json().get("detail", "").lower())

    def test_google_callback_disabled(self):
        r = self.client.get("/api/auth/google/callback/")
        self.assertEqual(r.status_code, 501)
        self.assertIn("not available", r.json().get("detail", "").lower())

    def test_username_password_auth_still_works(self):
        c = Client(enforce_csrf_checks=False)
        c.post("/api/auth/register/", {"email": "normal@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        # Registration does not establish a session.
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))
        r = c.post("/api/auth/login/", {"email": "normal@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)


class DonationIntegrityTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "donor1@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c1.post("/api/auth/login/", {"email": "donor1@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "donor2@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/login/", {"email": "donor2@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.user1 = User.objects.get(email="donor1@example.com")
        self.user2 = User.objects.get(email="donor2@example.com")
        self.product = DonationProduct.objects.create(
            name="Supporter",
            amount_cents=DonationProduct.DonationAmount.SUPPORTER,
            description="Support",
            is_active=True,
            display_order=1,
        )
        self.product2 = DonationProduct.objects.create(
            name="Generous",
            amount_cents=DonationProduct.DonationAmount.GENEROUS,
            description="Generous",
            is_active=True,
            display_order=2,
        )

    def test_donation_creation_binds_owner_and_trusted_amount_pending(self):
        r = self.c1.post(
            "/api/auth/donations/",
            {"product": self.product.id, "payment_method": "paypal", "amount_cents": 999999, "status": "confirmed", "user": self.user2.id},
            content_type="application/json",
        )
        self.assertIn(r.status_code, (200, 201))
        donation = DonationDonation.objects.get(id=r.json()["id"])
        self.assertEqual(donation.user_id, self.user1.id)
        self.assertEqual(donation.amount_cents, self.product.amount_cents)
        self.assertEqual(donation.status, DonationDonation.Status.PENDING)

    def test_price_manipulation_ignored_uses_product_amount(self):
        r = self.c1.post(
            "/api/auth/donations/",
            {"product": self.product2.id, "payment_method": "bitcoin", "amount_cents": 1},
            content_type="application/json",
        )
        self.assertIn(r.status_code, (200, 201))
        donation = DonationDonation.objects.get(id=r.json()["id"])
        self.assertEqual(donation.amount_cents, self.product2.amount_cents)
        self.assertNotEqual(donation.amount_cents, 1)

    def test_invalid_product_rejected(self):
        r = self.c1.post(
            "/api/auth/donations/",
            {"product": 999999, "payment_method": "paypal"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_donation_requires_authentication(self):
        anon = Client(enforce_csrf_checks=False)
        r = anon.post(
            "/api/auth/donations/",
            {"product": self.product.id, "payment_method": "paypal"},
            content_type="application/json",
        )
        self.assertIn(r.status_code, (401, 403))



@contextmanager
def _temporary_throttle_rates(throttle_classes, rates):
    """Temporarily apply effective DRF throttle rates to throttle classes.

    DRF throttle classes may cache parsed rate state at class level across tests.
    This sets scoped rates in api_settings.DEFAULT_THROTTLE_RATES and resets
    class-level parsed attributes so each request recalculates from settings.
    Restores all patched class attributes and settings in finally.
    """
    originals = []
    old_default_rates = deepcopy(getattr(api_settings, "DEFAULT_THROTTLE_RATES", {}))
    new_default_rates = dict(old_default_rates)
    new_default_rates.update(rates)
    try:
        api_settings.DEFAULT_THROTTLE_RATES = new_default_rates
        for cls in throttle_classes:
            originals.append((cls, {
                "rate": getattr(cls, "rate", None),
                "num_requests": getattr(cls, "num_requests", None),
                "duration": getattr(cls, "duration", None),
                "THROTTLE_RATES": deepcopy(getattr(cls, "THROTTLE_RATES", None)),
            }))
            cls.rate = None
            cls.num_requests = None
            cls.duration = None
            if hasattr(cls, "THROTTLE_RATES"):
                cls.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        # Confirm effective configured rates for instances used by these classes.
        for cls in throttle_classes:
            inst = cls()
            expected = new_default_rates.get(getattr(inst, "scope", None))
            if expected is not None:
                assert inst.get_rate() == expected
        yield
    finally:
        api_settings.DEFAULT_THROTTLE_RATES = old_default_rates
        for cls, attrs in reversed(originals):
            for name, value in attrs.items():
                setattr(cls, name, value)



class RegistrationEnumerationAndVerificationAbuseTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)
        from django.core.cache import cache
        cache.clear()

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def test_successful_and_duplicate_registration_responses_are_indistinguishable(self):
        payload = {"email": "enum-new@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}
        c1 = Client(enforce_csrf_checks=False)
        c2 = Client(enforce_csrf_checks=False)
        r_success = c1.post("/api/auth/register/", payload, content_type="application/json")
        r_dup = c2.post("/api/auth/register/", payload, content_type="application/json")
        self.assertEqual(r_success.status_code, 200)
        self.assertEqual(r_dup.status_code, 200)
        self.assertEqual(r_success.json(), r_dup.json())
        self.assertEqual(r_success.json(), {"detail": "If registration is successful, you can sign in."})
        self.assertEqual(User.objects.filter(email__iexact="enum-new@example.com").count(), 1)
        u = User.objects.get(email__iexact="enum-new@example.com")
        self.assertEqual(u.owned_workspaces.count(), 1)
        # Neither successful nor duplicate registration establishes an authenticated session.
        self.assertIn(c1.get("/api/auth/me/").status_code, (401, 403))
        self.assertIn(c2.get("/api/auth/me/").status_code, (401, 403))

    def test_concurrent_cooldown_claims_are_atomic_single_winner(self):
        """Competing cooldown claims: only one claimant should acquire cooldown in-process.

        Note: this demonstrates atomic claim behavior for the configured cache backend in this
        process (e.g. locmem is thread-safe here) but does NOT prove distributed atomicity
        across workers unless the deployment cache backend provides it.
        """
        import threading
        from django.core.cache import cache

        email = "compete-cooldown@example.com"
        cache.clear()
        # prime helper normalization path consistency
        key = _email_cooldown_cache_key(email)
        cache.delete(key)
        results = []
        barrier = threading.Barrier(5)

        def worker():
            barrier.wait()
            # False means cooldown claimed (not previously in cooldown), True means already in cooldown.
            results.append(_email_verification_in_cooldown(email, ttl_seconds=60))

        threads = [threading.Thread(target=worker) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(results.count(False), 1, f"Expected exactly one cooldown claim winner, got: {results}")
        self.assertEqual(results.count(True), 4)

    def test_login_and_password_change_still_functional_after_registration_hardening(self):
        c = Client(enforce_csrf_checks=False)
        c.post("/api/auth/register/", {"email": "relogin@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        # Registration does not create a session; normal login must still work.
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))
        login = c.post("/api/auth/login/", {"email": "relogin@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.assertEqual(login.status_code, 200)
        # change password requires auth and CSRF in production, but test client uses enforce_csrf_checks=False
        cp = c.post("/api/auth/change-password/", {"old_password": "TestPass123!", "new_password": "NewPass1234!"}, content_type="application/json")
        self.assertEqual(cp.status_code, 200)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_verification_request_and_resend_generic_for_existing_and_nonexistent(self):
        existing = "exists-verif@example.com"
        Client(enforce_csrf_checks=False).post("/api/auth/register/", {"email": existing, "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        from django.core.cache import cache
        cache.clear()
        c = Client(enforce_csrf_checks=False)
        r_non_req = c.post("/api/auth/verify-email/", {"email": "nobody-verif@example.com"}, content_type="application/json")
        cache.clear()
        r_exist_req = c.post("/api/auth/verify-email/", {"email": existing}, content_type="application/json")
        cache.clear()
        r_non_resend = c.post("/api/auth/resend-verification/", {"email": "nobody-verif@example.com"}, content_type="application/json")
        cache.clear()
        r_exist_resend = c.post("/api/auth/resend-verification/", {"email": existing}, content_type="application/json")
        for r in (r_non_req, r_exist_req, r_non_resend, r_exist_resend):
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json(), {"detail": "If the request is valid, a verification email will be sent."})

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_resend_cooldown_enforced_and_does_not_invalidate_valid_token_unnecessarily(self):
        email = "cooldown@example.com"
        Client(enforce_csrf_checks=False).post("/api/auth/register/", {"email": email, "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        user = User.objects.get(email=email)
        # Issue an initial token (simulating prior send) without triggering endpoint cooldown.
        old_raw, old_obj = EmailVerificationToken.issue_for_user(user)
        from django.core.cache import cache
        cache.clear()
        c = Client(enforce_csrf_checks=False)
        r1 = c.post("/api/auth/resend-verification/", {"email": email}, content_type="application/json")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json(), {"detail": "If the request is valid, a verification email will be sent."})
        old_obj.refresh_from_db()
        self.assertTrue(old_obj.used)  # first resend rotated token (legitimate resend outside cooldown)
        active_after_first = list(EmailVerificationToken.objects.filter(user=user, used=False))
        self.assertEqual(len(active_after_first), 1)
        new_token_hash = active_after_first[0].token
        # Immediate repeated resend attempt hits cooldown: generic response, no token rotation/invalidation.
        r2 = c.post("/api/auth/resend-verification/", {"email": email}, content_type="application/json")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json(), {"detail": "If the request is valid, a verification email will be sent."})
        active_after_cooldown = list(EmailVerificationToken.objects.filter(user=user, used=False))
        self.assertEqual(len(active_after_cooldown), 1)
        self.assertEqual(active_after_cooldown[0].token, new_token_hash)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_verification_tokens_expired_invalid_reused_and_valid(self):
        email = "tokenstates@example.com"
        Client(enforce_csrf_checks=False).post("/api/auth/register/", {"email": email, "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        user = User.objects.get(email=email)
        c = Client(enforce_csrf_checks=False)

        # invalid
        r_invalid = c.post("/api/auth/verify-email/confirm/", {"token": "bogus-token"}, content_type="application/json")
        self.assertEqual(r_invalid.status_code, 400)

        # expired
        raw_exp, tok_exp = EmailVerificationToken.issue_for_user(user)
        tok_exp.expires_at = timezone.now() - timedelta(minutes=5)
        tok_exp.save(update_fields=["expires_at"])
        r_exp = c.post("/api/auth/verify-email/confirm/", {"token": raw_exp}, content_type="application/json")
        self.assertEqual(r_exp.status_code, 400)

        # valid then reused
        raw_ok, tok_ok = EmailVerificationToken.issue_for_user(user)
        r_ok = c.post("/api/auth/verify-email/confirm/", {"token": raw_ok}, content_type="application/json")
        self.assertEqual(r_ok.status_code, 200)
        r_reuse = c.post("/api/auth/verify-email/confirm/", {"token": raw_ok}, content_type="application/json")
        self.assertEqual(r_reuse.status_code, 400)
        user.refresh_from_db()
        self.assertTrue(user.is_verified)

    def test_existing_unverified_user_can_still_login_after_hardening(self):
        c = Client(enforce_csrf_checks=False)
        c.post("/api/auth/register/", {"email": "still-login@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))
        c2 = Client(enforce_csrf_checks=False)
        r = c2.post("/api/auth/login/", {"email": "still-login@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_verification_endpoints_throttled_for_anonymous_abuse(self):
        from django.core.cache import cache
        from django.conf import settings as dj_settings

        rates = dict(dj_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({
            "email_verify_request": "100/min",
            "email_verify_request_ip": "2/min",
            "email_verify_resend": "100/min",
            "email_verify_resend_ip": "2/min",
            "email_verify_confirm": "100/min",
            "email_verify_confirm_ip": "2/min",
        })
        throttle_classes = [
            EmailVerificationRequestScopedThrottle,
            EmailVerificationRequestIPThrottle,
            EmailVerificationResendScopedThrottle,
            EmailVerificationResendIPThrottle,
            EmailVerificationConfirmScopedThrottle,
            EmailVerificationConfirmIPThrottle,
        ]
        with _temporary_throttle_rates(throttle_classes, rates):
            cache.clear()
            c = Client(enforce_csrf_checks=False)
            # request endpoint (IP throttle 2/min). Preserve IP throttle state; clear cooldown keys only.
            r1 = c.post("/api/auth/verify-email/", {"email": "a1@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.1")
            cache.delete(_email_cooldown_cache_key("a1@example.com"))
            r2 = c.post("/api/auth/verify-email/", {"email": "a2@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.1")
            cache.delete(_email_cooldown_cache_key("a2@example.com"))
            r3 = c.post("/api/auth/verify-email/", {"email": "a3@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.1")
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(r3.status_code, 429)

            cache.clear()
            c2 = Client(enforce_csrf_checks=False)
            s1 = c2.post("/api/auth/resend-verification/", {"email": "b1@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.2")
            cache.delete(_email_cooldown_cache_key("b1@example.com"))
            s2 = c2.post("/api/auth/resend-verification/", {"email": "b2@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.2")
            cache.delete(_email_cooldown_cache_key("b2@example.com"))
            s3 = c2.post("/api/auth/resend-verification/", {"email": "b3@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.2")
            self.assertEqual(s1.status_code, 200)
            self.assertEqual(s2.status_code, 200)
            self.assertEqual(s3.status_code, 429)

            cache.clear()
            c3 = Client(enforce_csrf_checks=False)
            t1 = c3.post("/api/auth/verify-email/confirm/", {"token": "bad1"}, content_type="application/json", REMOTE_ADDR="10.9.0.3")
            t2 = c3.post("/api/auth/verify-email/confirm/", {"token": "bad2"}, content_type="application/json", REMOTE_ADDR="10.9.0.3")
            t3 = c3.post("/api/auth/verify-email/confirm/", {"token": "bad3"}, content_type="application/json", REMOTE_ADDR="10.9.0.3")
            self.assertEqual(t1.status_code, 400)
            self.assertEqual(t2.status_code, 400)
            self.assertEqual(t3.status_code, 429)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_verification_resend_throttled_for_authenticated_abuse(self):
        from django.core.cache import cache
        from django.conf import settings as dj_settings

        rates = dict(dj_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({
            "email_verify_resend": "100/min",
            "email_verify_resend_ip": "2/min",
        })
        throttle_classes = [EmailVerificationResendScopedThrottle, EmailVerificationResendIPThrottle]
        with _temporary_throttle_rates(throttle_classes, rates):
            cache.clear()
            user = User.objects.create_user(email="authabuse@example.com", password="TestPass123!")
            c = Client(enforce_csrf_checks=False)
            c.force_login(user)
            r1 = c.post("/api/auth/resend-verification/", {"email": "x1@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.4")
            cache.delete(_email_cooldown_cache_key("x1@example.com"))
            r2 = c.post("/api/auth/resend-verification/", {"email": "x2@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.4")
            cache.delete(_email_cooldown_cache_key("x2@example.com"))
            r3 = c.post("/api/auth/resend-verification/", {"email": "x3@example.com"}, content_type="application/json", REMOTE_ADDR="10.9.0.4")
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(r3.status_code, 429)


class RegistrationConcurrencyTests(TransactionTestCase):
    """Genuine concurrent registration regression test (separate DB connections/threads).

    Limitation: reliable concurrent behavior depends on database/backend support (e.g.
    PostgreSQL). SQLite and some test environments may not support this reliably; in such
    environments this test may need to be treated as best-effort and verified on PostgreSQL.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def test_concurrent_registration_creates_single_account_and_workspace_without_internal_errors(self):
        import threading
        from django.db import connection, connections

        payload = {
            "email": "concurrent-reg@example.com",
            "password": "TestPass123!",
            "password_confirm": "TestPass123!",
        }
        results = []
        errors = []
        barrier = threading.Barrier(2)

        def worker():
            try:
                connections.close_all()
                c = Client(enforce_csrf_checks=False)
                barrier.wait()
                r = c.post("/api/auth/register/", payload, content_type="application/json")
                results.append({
                    "status": r.status_code,
                    "json": r.json(),
                    "me_status": c.get("/api/auth/me/").status_code,
                })
            except Exception as e:
                errors.append(repr(e))
            finally:
                connections.close_all()

        t1 = threading.Thread(target=worker)
        t2 = threading.Thread(target=worker)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        connection.close()

        self.assertEqual(errors, [], f"Unexpected internal errors during concurrent registration: {errors}")
        self.assertEqual(len(results), 2)
        for r in results:
            self.assertEqual(r["status"], 200)
            self.assertEqual(r["json"], {"detail": "If registration is successful, you can sign in."})
            # Registration must never establish a session.
            self.assertIn(r["me_status"], (401, 403))
            body_text = str(r["json"]).lower()
            self.assertNotIn("integrityerror", body_text)
            self.assertNotIn("traceback", body_text)
            self.assertNotIn("unique constraint", body_text)

        self.assertEqual(User.objects.filter(email__iexact="concurrent-reg@example.com").count(), 1)
        user = User.objects.get(email__iexact="concurrent-reg@example.com")
        self.assertEqual(Workspace.objects.filter(owner=user).count(), 1)


class FocusedSecurityRemediationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)
        from django.core.cache import cache
        cache.clear()
        self.existing_email = "existing@example.com"
        User.objects.create_user(email=self.existing_email, password="TestPass123!")

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def _register(self, email, password, confirm, client=None):
        c = client or self.client
        return c.post(
            "/api/auth/register/",
            {"email": email, "password": password, "password_confirm": confirm},
            content_type="application/json",
        )

    def _verify_register(self, email, password, confirm, client=None):
        c = client or self.client
        return c.post(
            "/api/auth/verify-email/",
            {"email": email, "password": password, "password_confirm": confirm},
            content_type="application/json",
        )

    def test_registration_combinations_no_enumeration(self):
        """Finding A: required registration combinations must not reveal account existence."""
        from django.core.cache import cache
        from django.conf import settings as dj_settings
        from rest_framework.throttling import ScopedRateThrottle

        # Ensure all 6 scenarios reach serializer/validation logic (not throttled) for this test only.
        rates = dict(dj_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({
            "login": "100/min",
            "email_verify_request": "100/min",
            "email_verify_request_ip": "100/min",
            "email_verify_resend": "100/min",
            "email_verify_resend_ip": "100/min",
            "email_verify_confirm": "100/min",
            "email_verify_confirm_ip": "100/min",
        })
        throttle_classes = [
            ScopedRateThrottle,
            EmailVerificationRequestScopedThrottle,
            EmailVerificationRequestIPThrottle,
            EmailVerificationResendScopedThrottle,
            EmailVerificationResendIPThrottle,
            EmailVerificationConfirmScopedThrottle,
            EmailVerificationConfirmIPThrottle,
        ]
        with _temporary_throttle_rates(throttle_classes, rates):
            cache.clear()
            combos = [
                # (label, existing_or_new, password, confirm, expect_kind)
                ("existing+valid", self.existing_email, "TestPass123!", "TestPass123!", "generic_success"),
                ("existing+invalid_password", self.existing_email, "short", "short", "validation"),
                ("existing+mismatched", self.existing_email, "TestPass123!", "Mismatch123!", "validation"),
                ("new+valid", "new-a@example.com", "TestPass123!", "TestPass123!", "generic_success"),
                ("new+invalid_password", "new-b@example.com", "short", "short", "validation"),
                ("new+mismatched", "new-c@example.com", "TestPass123!", "Mismatch123!", "validation"),
            ]
            results = {}
            for label, email, pw, confirm, kind in combos:
                c = Client(enforce_csrf_checks=False)
                r = self._register(email, pw, confirm, client=c)
                results[label] = r
                # Registration must never create an authenticated session.
                self.assertIn(c.get("/api/auth/me/").status_code, (401, 403), label)
                if kind == "generic_success":
                    self.assertEqual(r.status_code, 200, label)
                    self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."}, label)
                else:
                    # Invalid input rejected; response must not reveal whether submitted email exists.
                    self.assertEqual(r.status_code, 400, label)
                    body = r.json()
                    self.assertNotIn("exist", str(body).lower(), label)
                    self.assertNotIn("already", str(body).lower(), label)

            # Existing/new with same invalid input produce indistinguishable validation responses.
            self.assertEqual(results["existing+invalid_password"].status_code, results["new+invalid_password"].status_code)
            self.assertEqual(results["existing+invalid_password"].json(), results["new+invalid_password"].json())
            self.assertEqual(results["existing+mismatched"].status_code, results["new+mismatched"].status_code)
            self.assertEqual(results["existing+mismatched"].json(), results["new+mismatched"].json())
            # Success and duplicate are indistinguishable.
            self.assertEqual(results["existing+valid"].status_code, results["new+valid"].status_code)
            self.assertEqual(results["existing+valid"].json(), results["new+valid"].json())
            self.assertEqual(User.objects.filter(email__iexact=self.existing_email).count(), 1)
            self.assertEqual(User.objects.filter(email__iexact="new-a@example.com").count(), 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_legacy_registration_verification_combinations_no_enumeration(self):
        """Finding A: legacy registration-plus-verification endpoint protections."""
        combos = [
            ("existing+valid", self.existing_email, "TestPass123!", "TestPass123!", "generic_success"),
            ("existing+invalid_password", self.existing_email, "short", "short", "validation"),
            ("existing+mismatched", self.existing_email, "TestPass123!", "Mismatch123!", "validation"),
            ("new+valid", "new-ver-a@example.com", "TestPass123!", "TestPass123!", "generic_success"),
            ("new+invalid_password", "new-ver-b@example.com", "short", "short", "validation"),
            ("new+mismatched", "new-ver-c@example.com", "TestPass123!", "Mismatch123!", "validation"),
        ]
        generic = {"detail": "If the request is valid, a verification email will be sent."}
        results = {}
        for label, email, pw, confirm, kind in combos:
            c = Client(enforce_csrf_checks=False)
            r = self._verify_register(email, pw, confirm, client=c)
            results[label] = r
            self.assertIn(c.get("/api/auth/me/").status_code, (401, 403), label)
            if kind == "generic_success":
                self.assertEqual(r.status_code, 200, label)
                self.assertEqual(r.json(), generic, label)
            else:
                self.assertEqual(r.status_code, 400, label)
                body = r.json()
                self.assertNotIn("exist", str(body).lower(), label)
                self.assertNotIn("already", str(body).lower(), label)

        self.assertEqual(results["existing+invalid_password"].json(), results["new+invalid_password"].json())
        self.assertEqual(results["existing+mismatched"].json(), results["new+mismatched"].json())
        self.assertEqual(results["existing+valid"].json(), results["new+valid"].json())
        self.assertEqual(User.objects.filter(email__iexact="new-ver-a@example.com").count(), 1)

    def test_case_insensitive_duplicate_prevented_application_level(self):
        """Finding B: different capitalization cannot create duplicate accounts."""
        c = Client(enforce_csrf_checks=False)
        r = c.post(
            "/api/auth/register/",
            {"email": "EXISTING@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."})
        self.assertEqual(User.objects.filter(email__iexact=self.existing_email).count(), 1)
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

    def test_canonicalization_applied_to_new_user_creation_paths(self):
        # create_user canonicalizes (including normalization/lowercasing)
        u = User.objects.create_user(email="  MiXeD.Case@Example.COM  ", password="TestPass123!")
        self.assertEqual(u.email, "mixed.case@example.com")
        # direct manager create path also canonicalizes
        u2 = User.objects.create(email="Another.User@Example.COM", username="Another.User@Example.COM")
        u2.set_password("TestPass123!")
        u2.save()
        self.assertEqual(u2.email, "another.user@example.com")

    def test_unexpected_integrity_error_returns_generic_server_error_without_leakage(self):
        """Finding C: unrelated integrity failure must not return success-like response or leak details."""
        from django.db import IntegrityError

        client = Client(enforce_csrf_checks=False)
        with patch("accounts.views.RegisterSerializer.save", side_effect=IntegrityError("workspace_conflict_detail")):
            with self.assertLogs("accounts.views", level="ERROR") as cm:
                r = client.post(
                    "/api/auth/register/",
                    {"email": "unexpected-int@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
                    content_type="application/json",
                )
        self.assertEqual(r.status_code, 500)
        self.assertEqual(r.json(), {"detail": "Registration could not be completed. Please try again later."})
        self.assertFalse(User.objects.filter(email__iexact="unexpected-int@example.com").exists())
        self.assertIn(client.get("/api/auth/me/").status_code, (401, 403))
        joined = "\n".join(cm.output).lower()
        self.assertNotIn("password", joined)
        self.assertNotIn("testpass123", joined)

    def test_duplicate_integrity_error_after_race_returns_generic_success(self):
        """Finding C: genuine duplicate conflict during IntegrityError must return generic registration response."""
        from django.db import IntegrityError

        # Simulate race: precheck misses, save raises IntegrityError, post-rollback check sees duplicate.
        # Use a user created outside the request's rolled-back transaction context for the post-check.
        race_email = "race-dup@example.com"
        User.objects.create_user(email=race_email, password="TestPass123!")

        real_filter = User.objects.filter
        calls = {"n": 0}
        canonical = User.objects.canonicalize_email(race_email)

        def filter_side_effect(*args, **kwargs):
            if kwargs.get("email__iexact") == canonical:
                calls["n"] += 1
                class _QS:
                    def exists(self_inner):
                        # 1st check (pre-save): miss; 2nd check (after rollback): duplicate exists.
                        return calls["n"] >= 2
                return _QS()
            return real_filter(*args, **kwargs)

        client = Client(enforce_csrf_checks=False)
        with patch("accounts.views.User.objects.filter", side_effect=filter_side_effect):
            with patch("accounts.views.RegisterSerializer.save", side_effect=IntegrityError("duplicate key")):
                r = client.post(
                    "/api/auth/register/",
                    {"email": race_email, "password": "TestPass123!", "password_confirm": "TestPass123!"},
                    content_type="application/json",
                )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."})
        self.assertEqual(User.objects.filter(email__iexact=race_email).count(), 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_legacy_unexpected_integrity_error_returns_generic_server_error(self):
        from django.db import IntegrityError

        client = Client(enforce_csrf_checks=False)
        with patch("accounts.views.RegisterSerializer.save", side_effect=IntegrityError("boom")):
            r = client.post(
                "/api/auth/verify-email/",
                {"email": "legacy-unexpected@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
                content_type="application/json",
            )
        self.assertEqual(r.status_code, 500)
        self.assertEqual(r.json(), {"detail": "The request could not be completed. Please try again later."})
        self.assertFalse(User.objects.filter(email__iexact="legacy-unexpected@example.com").exists())


class CreateOwnerCommandTests(TestCase):
    def test_multiple_case_insensitive_matches_abort_without_modification(self):
        # Simulate legacy DB state: emails differing only by case with distinct usernames.
        # queryset.update bypasses model save/manager normalization for test-only legacy setup.
        u1 = User.objects.create_user(email="owner1@example.com", password="TestPass123!", username="legacy_owner_upper")
        u2 = User.objects.create_user(email="owner2@example.com", password="TestPass123!", username="legacy_owner_lower")
        User.objects.filter(pk=u1.pk).update(email="Owner@Example.com", username="legacy_owner_upper")
        User.objects.filter(pk=u2.pk).update(email="owner@example.com", username="legacy_owner_lower")
        u1.refresh_from_db()
        u2.refresh_from_db()
        before = list(
            User.objects.filter(email__iexact="owner@example.com")
            .order_by("pk")
            .values_list("pk", "role", "is_staff", "is_superuser", "email", "username", "password")
        )
        self.assertEqual(len(before), 2)
        out = StringIO()
        err = StringIO()
        with self.assertRaises(CommandError) as cm:
            call_command("create_owner", "--email=OWNER@example.com", "--password=NewOwnerPass123!", stdout=out, stderr=err)
        self.assertIn("Multiple accounts match", str(cm.exception))
        self.assertNotIn("owner@example.com", str(cm.exception).lower())
        after = list(
            User.objects.filter(email__iexact="owner@example.com")
            .order_by("pk")
            .values_list("pk", "role", "is_staff", "is_superuser", "email", "username", "password")
        )
        self.assertEqual(before, after)
        self.assertEqual(User.objects.filter(email__iexact="owner@example.com").count(), 2)

    def test_missing_required_input_raises_command_error(self):
        out = StringIO()
        err = StringIO()
        with self.assertRaises(CommandError):
            call_command("create_owner", "--email=owner@example.com", stdout=out, stderr=err)
        self.assertFalse(User.objects.filter(email__iexact="owner@example.com").exists())

    def test_single_matching_account_promoted(self):
        u = User.objects.create_user(email="solo@example.com", password="TestPass123!")
        out = StringIO()
        call_command("create_owner", "--email=SOLO@example.com", "--password=OwnerPass123!", stdout=out)
        u.refresh_from_db()
        self.assertEqual(u.role, User.ROLE_SUPERADMIN)
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.check_password("OwnerPass123!"))
        self.assertEqual(u.email, "solo@example.com")

    def test_no_matching_account_creates_owner(self):
        out = StringIO()
        call_command("create_owner", "--email=newowner@example.com", "--password=OwnerPass123!", stdout=out)
        u = User.objects.get(email="newowner@example.com")
        self.assertEqual(u.role, User.ROLE_SUPERADMIN)
        self.assertTrue(u.is_staff)
        self.assertTrue(u.is_superuser)
        self.assertTrue(u.check_password("OwnerPass123!"))
        self.assertEqual(User.objects.count(), 1)


class RegistrationTimingMitigationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)
        from django.core.cache import cache
        cache.clear()

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def test_register_duplicate_runs_dummy_hash_without_session_or_account_changes(self):
        User.objects.create_user(email="dup-time@example.com", password="TestPass123!")
        c = Client(enforce_csrf_checks=False)
        payload = {"email": "dup-time@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}
        with patch("accounts.views.make_password") as mp:
            r = c.post("/api/auth/register/", payload, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."})
        mp.assert_called_once_with("TestPass123!")
        self.assertEqual(User.objects.filter(email__iexact="dup-time@example.com").count(), 1)
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_legacy_verify_register_duplicate_runs_dummy_hash_without_session_or_account_changes(self):
        User.objects.create_user(email="legacy-dup-time@example.com", password="TestPass123!")
        c = Client(enforce_csrf_checks=False)
        payload = {"email": "legacy-dup-time@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}
        with patch("accounts.views.make_password") as mp:
            r = c.post("/api/auth/verify-email/", payload, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If the request is valid, a verification email will be sent."})
        mp.assert_called_once_with("TestPass123!")
        self.assertEqual(User.objects.filter(email__iexact="legacy-dup-time@example.com").count(), 1)
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

    def test_register_success_still_works_and_invalid_input_unchanged(self):
        c = Client(enforce_csrf_checks=False)
        with patch("accounts.views.make_password") as mp:
            r = c.post(
                "/api/auth/register/",
                {"email": "timing-ok@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
                content_type="application/json",
            )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If registration is successful, you can sign in."})
        self.assertTrue(User.objects.filter(email__iexact="timing-ok@example.com").exists())
        # Successful path performs real password hashing via serializer/model save; dummy mitigation not invoked.
        mp.assert_not_called()
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

        bad = Client(enforce_csrf_checks=False)
        r_bad = bad.post(
            "/api/auth/register/",
            {"email": "timing-bad@example.com", "password": "TestPass123!", "password_confirm": "Mismatch123!"},
            content_type="application/json",
        )
        self.assertEqual(r_bad.status_code, 400)
        self.assertFalse(User.objects.filter(email__iexact="timing-bad@example.com").exists())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_legacy_verify_register_success_still_works_and_invalid_input_unchanged(self):
        c = Client(enforce_csrf_checks=False)
        with patch("accounts.views.make_password") as mp:
            r = c.post(
                "/api/auth/verify-email/",
                {"email": "legacy-timing-ok@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
                content_type="application/json",
            )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), {"detail": "If the request is valid, a verification email will be sent."})
        self.assertTrue(User.objects.filter(email__iexact="legacy-timing-ok@example.com").exists())
        mp.assert_not_called()
        self.assertIn(c.get("/api/auth/me/").status_code, (401, 403))

        bad = Client(enforce_csrf_checks=False)
        r_bad = bad.post(
            "/api/auth/verify-email/",
            {"email": "legacy-timing-bad@example.com", "password": "TestPass123!", "password_confirm": "Mismatch123!"},
            content_type="application/json",
        )
        self.assertEqual(r_bad.status_code, 400)
        self.assertFalse(User.objects.filter(email__iexact="legacy-timing-bad@example.com").exists())


class BootstrapUserWorkspaceSignalTests(TestCase):
    def test_raw_post_save_does_not_bootstrap_user_workspace(self):
        from accounts.models import CustomerProfile, WorkspaceMembership
        from accounts.signals import bootstrap_user_workspace
        from demo.models import DemoProduct

        user = User.objects.create_user(email="raw-signal@example.com", password="TestPass123!")
        profile = user.customer_profile
        workspace = user.owned_workspaces.get()
        membership = WorkspaceMembership.objects.get(user=user, workspace=workspace)
        profile_pk = profile.pk
        workspace_pk = workspace.pk
        membership_pk = membership.pk
        demo_count = DemoProduct.objects.filter(workspace=workspace).count()

        profile.delete()
        membership.delete()
        workspace.delete()
        self.assertFalse(CustomerProfile.objects.filter(pk=profile_pk).exists())
        self.assertFalse(Workspace.objects.filter(pk=workspace_pk).exists())
        self.assertFalse(WorkspaceMembership.objects.filter(pk=membership_pk).exists())
        self.assertEqual(DemoProduct.objects.filter(workspace_id=workspace_pk).count(), 0)

        bootstrap_user_workspace(sender=User, instance=user, created=True, raw=True)

        self.assertFalse(CustomerProfile.objects.filter(user=user).exists())
        self.assertFalse(Workspace.objects.filter(owner=user).exists())
        self.assertFalse(WorkspaceMembership.objects.filter(user=user).exists())
        self.assertEqual(DemoProduct.objects.filter(workspace_id=workspace_pk).count(), 0)
        self.assertEqual(DemoProduct.objects.filter(workspace__owner=user).count(), 0)

    def test_ordinary_user_creation_bootstraps_workspace_records(self):
        from accounts.models import CustomerProfile, WorkspaceMembership
        from demo.models import DemoProduct

        user = User.objects.create_user(email="bootstrap-ok@example.com", password="TestPass123!")

        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())
        workspace = Workspace.objects.get(owner=user)
        self.assertTrue(WorkspaceMembership.objects.filter(user=user, workspace=workspace).exists())
        self.assertGreater(DemoProduct.objects.filter(workspace=workspace).count(), 0)

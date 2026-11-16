from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.core import mail
from django.test import TestCase, override_settings
from django.test.client import Client
from django.utils import timezone

from accounts.models import DonationDonation, DonationProduct, EmailVerificationToken, User, Workspace


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_register_creates_workspace(self):
        r = self.client.post(
            "/api/auth/register/",
            {"email": "a@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="a@b.com")
        self.assertFalse(u.is_superadmin)
        self.assertEqual(u.owned_workspaces.count(), 1)
        self.assertTrue(u.customer_profile is not None)

    def test_superadmin_not_public(self):
        # cannot register as superadmin
        r = self.client.post(
            "/api/auth/register/",
            {"email": "x@y.com", "password": "TestPass123!", "password_confirm": "TestPass123!", "role": "superadmin"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="x@y.com")
        self.assertEqual(u.role, User.ROLE_STANDARD)


class IsolationTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "u1@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "u2@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
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
        self.assertEqual(r.status_code, 201)
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
        self.assertEqual(r.status_code, 400)
        body = str(r.json())
        self.assertNotIn("already exists", body.lower())
        self.assertIn("could not be completed", body.lower())

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
        r = c.post("/api/auth/login/", {"email": "normal@example.com", "password": "TestPass123!"}, content_type="application/json")
        self.assertEqual(r.status_code, 200)


class DonationIntegrityTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "donor1@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "donor2@example.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
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

from django.test import TestCase
from django.test.client import Client

from accounts.models import User, Workspace


class AuthTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_register_creates_workspace(self):
        r = self.client.post("/api/auth/register/", {"email": "a@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="a@b.com")
        self.assertFalse(u.is_superadmin)
        self.assertEqual(u.owned_workspaces.count(), 1)
        self.assertTrue(u.customer_profile is not None)

    def test_superadmin_not_public(self):
        # cannot register as superadmin
        r = self.client.post("/api/auth/register/", {"email": "x@y.com", "password": "TestPass123!", "password_confirm": "TestPass123!", "role": "superadmin"}, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email="x@y.com")
        self.assertEqual(u.role, User.ROLE_STANDARD)


class IsolationTests(TestCase):
    def setUp(self):
        self.c1 = Client(enforce_csrf_checks=False)
        self.c2 = Client(enforce_csrf_checks=False)
        self.c1.post("/api/auth/register/", {"email": "u1@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        self.c2.post("/api/auth/register/", {"email": "u2@b.com", "password": "TestPass123!", "password_confirm": "TestPass123!"}, content_type="application/json")
        import json
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
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.owner = User.objects.create_superuser(email="owner@test.com", password="OwnerPass123!")
        self.owner.role = User.ROLE_SUPERADMIN
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
        from accounts.models import User
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

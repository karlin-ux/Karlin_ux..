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
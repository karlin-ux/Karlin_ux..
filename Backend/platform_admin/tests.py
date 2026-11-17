from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.test.client import Client
from django.utils import timezone

from platform_admin.models import PlatformAnalyticsEvent, PlatformAuditLog
from platform_admin.views import TrackEventIPThrottle, TrackEventScopedThrottle


User = get_user_model()


class TargetedSessionRevocationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)
        self.owner = User.objects.create_superuser(email="owner-sa@test.com", password="OwnerPass123!")
        self.owner.role = User.ROLE_SUPERADMIN
        self.owner.save()
        self.target = User.objects.create_user(email="target@test.com", password="TargetPass123!")
        self.other = User.objects.create_user(email="other@test.com", password="OtherPass123!")

    def _create_session_for_user(self, user):
        s = SessionStore()
        s["_auth_user_id"] = str(user.pk)
        s["_auth_user_backend"] = "django.contrib.auth.backends.ModelBackend"
        s["_auth_user_hash"] = user.get_session_auth_hash()
        s.create()
        return s.session_key

    def test_revoke_only_target_user_sessions(self):
        target_key = self._create_session_for_user(self.target)
        other_key = self._create_session_for_user(self.other)
        self.assertTrue(Session.objects.filter(session_key=target_key).exists())
        self.assertTrue(Session.objects.filter(session_key=other_key).exists())

        self.client.login(username="owner-sa@test.com", password="OwnerPass123!")
        r = self.client.post(f"/api/platform/users/{self.target.id}/revoke_sessions/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json().get("revoked_sessions"), 1)

        self.assertFalse(Session.objects.filter(session_key=target_key).exists())
        self.assertTrue(Session.objects.filter(session_key=other_key).exists())
        self.assertTrue(PlatformAuditLog.objects.filter(action="revoke_sessions", target=str(self.target.id)).exists())

    def test_standard_user_cannot_revoke_sessions(self):
        c = Client(enforce_csrf_checks=False)
        c.login(username="target@test.com", password="TargetPass123!")
        r = c.post(f"/api/platform/users/{self.other.id}/revoke_sessions/")
        self.assertEqual(r.status_code, 403)

    def test_unauthenticated_cannot_revoke_sessions(self):
        c = Client(enforce_csrf_checks=False)
        r = c.post(f"/api/platform/users/{self.other.id}/revoke_sessions/")
        self.assertIn(r.status_code, (401, 403))


class TrackEventViewTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_valid_page_view_event_accepted(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "page_view", "path": "/home", "metadata": {"source": "nav", "count": 1, "ok": True}},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("ok"))
        ev = PlatformAnalyticsEvent.objects.latest("id")
        self.assertEqual(ev.event_type, "page_view")
        self.assertEqual(ev.path, "/home")
        self.assertEqual(ev.metadata, {"source": "nav", "count": 1, "ok": True})

    def test_invalid_event_type_rejected(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "custom_bad", "path": "/home"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PlatformAnalyticsEvent.objects.count(), 0)

    def test_invalid_path_rejected(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "page_view", "path": "http://evil.example/"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_oversized_metadata_rejected(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "page_view", "path": "/home", "metadata": {"big": "x" * 500}},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PlatformAnalyticsEvent.objects.count(), 0)

    def test_nested_or_arbitrary_metadata_rejected(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "page_view", "path": "/home", "metadata": {"nested": {"a": 1}}},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_anonymous_requests_are_throttled(self):
        from django.conf import settings as dj_settings

        cache.clear()
        payload = {"event_type": "page_view", "path": "/t", "metadata": {}}
        rates = dict(dj_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({"track": "2/min", "track_ip": "100/min"})
        try:
            with override_settings(REST_FRAMEWORK={**dj_settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": rates}):
                r1 = self.client.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.10")
                r2 = self.client.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.10")
                r3 = self.client.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.10")
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(r3.status_code, 429)
        finally:
            cache.clear()

    def test_authenticated_requests_are_throttled(self):
        from django.conf import settings as dj_settings

        cache.clear()
        user = User.objects.create_user(email="trackauth@example.com", password="TestPass123!")
        c = Client(enforce_csrf_checks=False)
        c.force_login(user)
        payload = {"event_type": "page_view", "path": "/t-auth", "metadata": {}}
        rates = dict(dj_settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        rates.update({"track": "2/min", "track_ip": "100/min"})
        try:
            with override_settings(REST_FRAMEWORK={**dj_settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": rates}):
                r1 = c.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.11")
                r2 = c.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.11")
                r3 = c.post("/api/platform/track/", payload, content_type="application/json", REMOTE_ADDR="10.10.10.11")
            self.assertEqual(r1.status_code, 200)
            self.assertEqual(r2.status_code, 200)
            self.assertEqual(r3.status_code, 429)
            self.assertEqual(PlatformAnalyticsEvent.objects.filter(path="/t-auth", user=user).count(), 2)
        finally:
            cache.clear()

    def test_valid_requests_work_below_limit_and_analytics_functionality_intact(self):
        cache.clear()
        payload = {"event_type": "page_view", "path": "/below-limit", "metadata": {"source": "nav"}}
        r = self.client.post("/api/platform/track/", payload, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json().get("ok"))
        self.assertEqual(PlatformAnalyticsEvent.objects.filter(path="/below-limit").count(), 1)

    def test_invalid_payloads_remain_rejected(self):
        r = self.client.post(
            "/api/platform/track/",
            {"event_type": "page_view", "path": "http://evil.example/"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PlatformAnalyticsEvent.objects.count(), 0)

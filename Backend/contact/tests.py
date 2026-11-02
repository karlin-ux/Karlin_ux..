from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core import mail
from django.test.client import Client


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ContactTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=False)

    def test_contact_success_sends_email(self):
        r = self.client.post("/api/contact/submit/", {
            "name": "Test User", "email": "test@example.com",
            "subject": "Hello", "message": "This is a test message."
        }, content_type="application/json")
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["success"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("test@example.com", mail.outbox[0].body)

    def test_contact_validation(self):
        r = self.client.post("/api/contact/submit/", {
            "name": "A", "email": "bad", "message": "short"
        }, content_type="application/json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.json()["success"])

    def test_honeypot_rejected(self):
        r = self.client.post("/api/contact/submit/", {
            "name": "Test User", "email": "test@example.com",
            "message": "This is a test message.", "honeypot": "spam"
        }, content_type="application/json")
        self.assertEqual(r.status_code, 400)

    @patch("contact.views.send_mail", side_effect=Exception("smtp down"))
    def test_email_failure_reported(self, _mock):
        r = self.client.post("/api/contact/submit/", {
            "name": "Test User", "email": "test@example.com",
            "subject": "Hello", "message": "This is a test message."
        }, content_type="application/json")
        self.assertEqual(r.status_code, 502)
        self.assertFalse(r.json()["success"])
        from contact.models import ContactMessage
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertFalse(ContactMessage.objects.first().email_sent)
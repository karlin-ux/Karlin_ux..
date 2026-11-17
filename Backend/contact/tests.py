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

    @patch("contact.views.send_mail", side_effect=Exception("smtp://user:secret@mail.internal?password=hunter2"))
    def test_email_failure_reported_generically_without_leaking_logs_or_response(self, _mock):
        sensitive = ["smtp://user:secret@mail.internal", "password=hunter2", "hunter2", "mail.internal"]
        with self.assertLogs("contact", level="ERROR") as cm:
            r = self.client.post("/api/contact/submit/", {
                "name": "Test User", "email": "test@example.com",
                "subject": "Hello", "message": "This is a test message."
            }, content_type="application/json")
        self.assertEqual(r.status_code, 502)
        body = r.json()
        self.assertFalse(body["success"])
        self.assertIn("message_id", body)
        self.assertEqual(
            body["detail"],
            "Your message was received, but email delivery failed. Please try again later.",
        )
        # Response must not leak internal exception or infrastructure details.
        body_str = str(body)
        self.assertNotIn("smtp://", body_str)
        self.assertNotIn("mail.internal", body_str)
        self.assertNotIn("secret", body_str)
        self.assertNotIn("hunter2", body_str)
        self.assertNotIn("Exception", body_str)

        # Captured logs must not contain exception message/args, credentials, URLs, or traceback.
        log_text = "\n".join(cm.output)
        self.assertIn("Contact email delivery failed", log_text)
        self.assertIn("message_id=", log_text)
        self.assertIn("error_type=Exception", log_text)
        for s in sensitive:
            self.assertNotIn(s, log_text)
        self.assertNotIn("Traceback", log_text)
        self.assertNotIn("smtp credentials", log_text.lower())

        from contact.models import ContactMessage
        self.assertEqual(ContactMessage.objects.count(), 1)
        msg = ContactMessage.objects.first()
        self.assertFalse(msg.email_sent)
        self.assertEqual(msg.email_error, "delivery_failed")

    @patch("contact.views.send_mail", side_effect=RuntimeError("smtp://admin:TopSecret123@smtp.example.internal:587 AUTH failed"))
    def test_email_failure_logs_safe_context_without_sensitive_exception_details(self, _mock):
        sensitive = [
            "smtp://admin:TopSecret123@smtp.example.internal:587",
            "TopSecret123",
            "smtp.example.internal",
            "AUTH failed",
        ]
        with self.assertLogs("contact", level="ERROR") as cm:
            r = self.client.post("/api/contact/submit/", {
                "name": "Test User", "email": "test@example.com",
                "subject": "Hello", "message": "This is a test message."
            }, content_type="application/json")
        self.assertEqual(r.status_code, 502)
        body_str = str(r.json())
        for s in sensitive:
            self.assertNotIn(s, body_str)
        self.assertNotIn("traceback", body_str.lower())

        log_text = "\n".join(cm.output)
        self.assertIn("Contact email delivery failed", log_text)
        self.assertIn("error_type=RuntimeError", log_text)
        for s in sensitive:
            self.assertNotIn(s, log_text)
        self.assertNotIn("Traceback", log_text)
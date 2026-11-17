import logging

from django.conf import settings
from django.core.mail import send_mail
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import ContactMessage
from .serializers import ContactMessageSerializer

logger = logging.getLogger("contact")


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ScopedRateThrottle])
def contact_submit(request):
    ser = ContactMessageSerializer(data=request.data)
    if not ser.is_valid():
        return Response({"success": False, "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

    ip = _ip(request)
    msg = ContactMessage.objects.create(
        name=ser.validated_data["name"],
        email=ser.validated_data["email"],
        subject=ser.validated_data.get("subject", ""),
        message=ser.validated_data["message"],
        ip_address=ip,
    )

    recipient = getattr(settings, "CONTACT_RECIPIENT_EMAIL", "contact@localhost")
    subject = f"Contact form: {msg.subject or 'New message'}"
    body = f"From: {msg.name} <{msg.email}>\nIP: {ip}\n\n{msg.message}"
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=False)
        msg.email_sent = True
        msg.save(update_fields=["email_sent"])
        return Response({"success": True, "detail": "Message sent successfully."}, status=status.HTTP_201_CREATED)
    except Exception as exc:
        request_id = getattr(request, "request_id", "")
        # Log only safe, non-sensitive context; never log exception text/args/traceback.
        logger.error(
            "Contact email delivery failed message_id=%s request_id=%s error_type=%s",
            msg.id,
            request_id,
            type(exc).__name__,
        )
        # Preserve submitted message for operational follow-up without exposing internal error details.
        msg.email_error = "delivery_failed"
        msg.save(update_fields=["email_error"])
        return Response(
            {
                "success": False,
                "detail": "Your message was received, but email delivery failed. Please try again later.",
                "message_id": msg.id,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


contact_submit.throttle_scope = "contact"

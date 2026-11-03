import os

from django.conf import settings
from django.core.mail import send_mail
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import ContactMessage
from .serializers import ContactMessageSerializer


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
        msg.save()
        return Response({"success": True, "detail": "Message sent successfully."}, status=status.HTTP_201_CREATED)
    except Exception as e:
        msg.email_error = str(e)[:500]
        msg.save()
        return Response({"success": False, "detail": f"Message saved but email delivery failed: {msg.email_error}"}, status=status.HTTP_502_BAD_GATEWAY)


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
contact_submit.throttle_scope = "contact"

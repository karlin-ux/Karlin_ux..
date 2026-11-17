from django.db.models import Count
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_datetime
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle

from accounts.models import User
from .models import GlobalSetting, PlatformAnalyticsEvent, PlatformAuditLog, PlatformNotification, SecurityEvent
from .permissions import IsSuperAdmin
from .serializers import (
    GlobalSettingSerializer, PlatformAnalyticsEventSerializer, PlatformAuditLogSerializer,
    PlatformNotificationSerializer, PlatformUserSerializer, SecurityEventSerializer,
)

# Contact messages for Super Admin
from contact.models import ContactMessage
from rest_framework import serializers


class ContactMessageReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "email", "subject", "message", "ip_address", "created_at", "email_sent", "email_error"]

UserModel = get_user_model()


def _audit(request, action, target="", metadata=None, outcome="success"):
    PlatformAuditLog.objects.create(
        actor=request.user if request.user.is_authenticated else None,
        action=action,
        target=target,
        metadata=metadata or {},
        outcome=outcome,
        ip_address=_ip(request),
    )


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class PlatformUserViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperAdmin]
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = PlatformUserSerializer

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        if user.is_superadmin:
            return Response({"detail": "Cannot suspend super admin."}, status=400)
        user.is_active = False
        user.save()
        _audit(request, "suspend_user", target=str(user.id))
        return Response(PlatformUserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        _audit(request, "reactivate_user", target=str(user.id))
        return Response(PlatformUserSerializer(user).data)

    @action(detail=True, methods=["post"])
    def revoke_sessions(self, request, pk=None):
        user = self.get_object()
        from django.contrib.sessions.models import Session
        from django.utils import timezone

        # Targeted revocation: decode active sessions and remove only those belonging to the target user.
        # This preserves other users' sessions. If a session cannot be decoded safely, it is left untouched.
        revoked = 0
        target_id = str(user.pk)
        for session in Session.objects.filter(expire_date__gte=timezone.now()).iterator():
            try:
                data = session.get_decoded()
            except Exception:
                continue
            if str(data.get("_auth_user_id")) == target_id:
                session.delete()
                revoked += 1

        _audit(
            request,
            "revoke_sessions",
            target=str(user.id),
            metadata={"revoked_sessions": revoked, "target_user_id": target_id},
            outcome="success",
        )
        return Response({"detail": "Sessions revoked for target user.", "revoked_sessions": revoked})


class PlatformAnalyticsSummaryView(generics.GenericAPIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        events = PlatformAnalyticsEvent.objects.all()
        by_type = list(events.values("event_type").annotate(count=Count("id")))
        top_pages = list(events.values("path").annotate(count=Count("id")).order_by("-count")[:10])
        now = timezone.now()
        recent_regs = User.objects.filter(date_joined__gte=now - timedelta(days=30)).count() if False else User.objects.filter(created_at__gte=now - timedelta(days=30)).count()
        active_est = User.objects.filter(last_login__gte=now - timedelta(days=30)).count()
        from django.contrib.sessions.models import Session
        active_sessions = Session.objects.filter(expire_date__gte=now).count()
        return Response({
            "total_events": events.count(),
            "by_type": by_type,
            "top_pages": top_pages,
            "registered_accounts": User.objects.count(),
            "recent_registrations_30d": recent_regs,
            "active_users_estimate_30d": active_est,
            "active_sessions_estimate": active_sessions,
            "active_users_note": "Estimate based on users with last_login within 30 days. Not anonymous visitor tracking.",
            "measured": True,
        })


class PlatformAuditLogView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = PlatformAuditLog.objects.all()
    serializer_class = PlatformAuditLogSerializer


class SecurityEventView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = SecurityEvent.objects.all()
    serializer_class = SecurityEventSerializer


class PlatformNotificationView(generics.ListAPIView):
    permission_classes = [IsSuperAdmin]
    queryset = PlatformNotification.objects.all()
    serializer_class = PlatformNotificationSerializer


class GlobalSettingView(viewsets.ModelViewSet):
    permission_classes = [IsSuperAdmin]
    queryset = GlobalSetting.objects.all()
    serializer_class = GlobalSettingSerializer


class PlatformHealthView(generics.GenericAPIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from django.db import connection
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False
        # Log administrative health access
        import logging
        logger = logging.getLogger("django.security")
        logger.info("Super Admin health check accessed by %s", request.user.email)
        return Response({
            "database": "ok" if db_ok else "error",
        })


class PlatformMediaHealthView(generics.GenericAPIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from media.models import MediaAsset, MediaProcessingJob, WorkspaceStorageUsage
        from django.db.models import Sum
        assets = MediaAsset.objects.all()
        jobs = MediaProcessingJob.objects.all()
        storage = WorkspaceStorageUsage.objects.all().aggregate(s=Sum("total_bytes"))["s"] or 0
        return Response({
            "total_assets": assets.count(),
            "total_storage_bytes": storage,
            "image_count": assets.filter(category="image").count(),
            "document_count": assets.filter(category="document").count(),
            "video_count": assets.filter(category="video").count(),
            "processing_failures": jobs.filter(status="failed").count(),
            "upload_failures": jobs.filter(status="failed").count(),
            "measured": True,
        })


class ContactMessageViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperAdmin]
    queryset = ContactMessage.objects.all().order_by("-created_at")
    serializer_class = ContactMessageReadSerializer


class TrackEventScopedThrottle(ScopedRateThrottle):
    """Applies per-user throttling for authenticated requests and per-IP for anonymous requests."""

    scope = "track"


class TrackEventIPThrottle(SimpleRateThrottle):
    """Additional IP-based throttle for all requests to reduce multi-account/session-rotation abuse."""

    scope = "track_ip"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        if ident is None:
            return None
        return self.cache_format % {"scope": self.scope, "ident": ident}


class TrackEventView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [TrackEventScopedThrottle, TrackEventIPThrottle]
    throttle_scope = "track"

    ALLOWED_EVENT_TYPES = {"page_view"}
    MAX_PATH_LENGTH = 300
    MAX_USER_AGENT_LENGTH = 512
    MAX_METADATA_KEYS = 10
    MAX_METADATA_VALUE_LENGTH = 200

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        event_type = data.get("event_type", "page_view")
        if event_type not in self.ALLOWED_EVENT_TYPES:
            return Response({"detail": "Invalid event type."}, status=status.HTTP_400_BAD_REQUEST)

        path = data.get("path", "")
        if not isinstance(path, str):
            return Response({"detail": "Invalid path."}, status=status.HTTP_400_BAD_REQUEST)
        path = path.strip()
        if not path.startswith("/") or len(path) > self.MAX_PATH_LENGTH:
            return Response({"detail": "Invalid path."}, status=status.HTTP_400_BAD_REQUEST)

        raw_metadata = data.get("metadata", {})
        if raw_metadata in (None, ""):
            raw_metadata = {}
        if not isinstance(raw_metadata, dict):
            return Response({"detail": "Invalid metadata."}, status=status.HTTP_400_BAD_REQUEST)
        if len(raw_metadata) > self.MAX_METADATA_KEYS:
            return Response({"detail": "Metadata too large."}, status=status.HTTP_400_BAD_REQUEST)

        metadata = {}
        for k, v in raw_metadata.items():
            if not isinstance(k, str) or len(k) > 40:
                return Response({"detail": "Invalid metadata."}, status=status.HTTP_400_BAD_REQUEST)
            if isinstance(v, bool):
                metadata[k] = v
            elif isinstance(v, int) and not isinstance(v, bool):
                metadata[k] = v
            elif isinstance(v, str):
                if len(v) > self.MAX_METADATA_VALUE_LENGTH:
                    return Response({"detail": "Invalid metadata."}, status=status.HTTP_400_BAD_REQUEST)
                metadata[k] = v
            else:
                return Response({"detail": "Invalid metadata."}, status=status.HTTP_400_BAD_REQUEST)

        user_agent = (request.META.get("HTTP_USER_AGENT", "") or "")[: self.MAX_USER_AGENT_LENGTH]
        session_key = request.session.session_key or ""

        PlatformAnalyticsEvent.objects.create(
            event_type=event_type,
            path=path,
            session_key=session_key,
            user=request.user if request.user.is_authenticated else None,
            ip_address=_ip(request),
            user_agent=user_agent,
            metadata=metadata,
        )
        return Response({"ok": True})
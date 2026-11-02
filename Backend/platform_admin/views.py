from django.db.models import Count
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.models import User
from .models import GlobalSetting, PlatformAnalyticsEvent, PlatformAuditLog, PlatformNotification, SecurityEvent
from .permissions import IsSuperAdmin
from .serializers import (
    GlobalSettingSerializer, PlatformAnalyticsEventSerializer, PlatformAuditLogSerializer,
    PlatformNotificationSerializer, PlatformUserSerializer, SecurityEventSerializer,
)

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
        # best-effort: delete all sessions (cannot target user easily without session data)
        Session.objects.filter(expire_date__gte=timezone.now()).delete()
        _audit(request, "revoke_sessions", target=str(user.id))
        return Response({"detail": "Sessions revoked."})


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
        return Response({
            "database": "ok" if db_ok else "error",
            "debug": False,
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


class TrackEventView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        PlatformAnalyticsEvent.objects.create(
            event_type=request.data.get("event_type", "page_view"),
            path=request.data.get("path", ""),
            session_key=request.session.session_key or "",
            user=request.user if request.user.is_authenticated else None,
            ip_address=_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            metadata=request.data.get("metadata", {}) or {},
        )
        return Response({"ok": True})
from django.db.models import Count, Sum
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.models import Workspace
from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoAuditLog, DemoBooking, DemoCustomer,
    DemoManager, DemoMediaAsset, DemoNotification, DemoOrder, DemoPage, DemoProduct,
    DemoRole,
)
from .serializers import (
    DemoAnalyticsEventSerializer, DemoApplicationSerializer, DemoAuditLogSerializer,
    DemoBookingSerializer, DemoCustomerSerializer, DemoManagerSerializer,
    DemoMediaAssetSerializer, DemoNotificationSerializer, DemoOrderSerializer,
    DemoPageSerializer, DemoProductSerializer, DemoRoleSerializer,
)


def _user_workspace(user):
    if user.is_superadmin:
        return None
    return Workspace.objects.filter(owner=user).first()


class WorkspaceScopedMixin:
    permission_classes = [permissions.IsAuthenticated]

    def get_workspace(self):
        ws = _user_workspace(self.request.user)
        if ws is None:
            return None
        return ws

    def check_workspace(self):
        if self.get_workspace() is None:
            return False
        return True

    def get_queryset(self):
        ws = self.get_workspace()
        if ws is None:
            return self.queryset.model.objects.none()
        return self.queryset.filter(workspace=ws)

    def perform_create(self, serializer):
        ws = self.get_workspace()
        serializer.save(workspace=ws)


class DemoCustomerViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoCustomer.objects.all()
    serializer_class = DemoCustomerSerializer

    @action(detail=True, methods=["post"])
    def toggle_active(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save()
        return Response(DemoCustomerSerializer(obj).data)


class DemoProductViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoProduct.objects.all()
    serializer_class = DemoProductSerializer


class DemoOrderViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoOrder.objects.all()
    serializer_class = DemoOrderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_f = self.request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)
        return qs


class DemoBookingViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoBooking.objects.all()
    serializer_class = DemoBookingSerializer


class DemoApplicationViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoApplication.objects.all()
    serializer_class = DemoApplicationSerializer


class DemoNotificationViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoNotification.objects.all()
    serializer_class = DemoNotificationSerializer

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        obj = self.get_object()
        obj.is_read = True
        obj.save()
        return Response(DemoNotificationSerializer(obj).data)


class DemoPageViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoPage.objects.all()
    serializer_class = DemoPageSerializer


class DemoMediaAssetViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoMediaAsset.objects.all()
    serializer_class = DemoMediaAssetSerializer


class DemoRoleViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoRole.objects.all()
    serializer_class = DemoRoleSerializer


class DemoManagerViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoManager.objects.all()
    serializer_class = DemoManagerSerializer


class DemoAuditLogViewSet(WorkspaceScopedMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DemoAuditLog.objects.all()
    serializer_class = DemoAuditLogSerializer


class DemoAnalyticsEventViewSet(WorkspaceScopedMixin, viewsets.ReadOnlyModelViewSet):
    queryset = DemoAnalyticsEvent.objects.all()
    serializer_class = DemoAnalyticsEventSerializer

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def demo_dashboard(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    data = {
        "total_customers": DemoCustomer.objects.filter(workspace=ws).count(),
        "total_products": DemoProduct.objects.filter(workspace=ws).count(),
        "active_products": DemoProduct.objects.filter(workspace=ws, is_active=True).count(),
        "total_orders": DemoOrder.objects.filter(workspace=ws).count(),
        "orders_today": DemoOrder.objects.filter(workspace=ws).count(),
        "pending_orders": DemoOrder.objects.filter(workspace=ws, status="pending").count(),
        "completed_orders": DemoOrder.objects.filter(workspace=ws, status="completed").count(),
        "total_applications": DemoApplication.objects.filter(workspace=ws).count(),
        "pending_applications": DemoApplication.objects.filter(workspace=ws, status="new").count(),
        "total_bookings": DemoBooking.objects.filter(workspace=ws).count(),
        "pending_bookings": DemoBooking.objects.filter(workspace=ws, status="pending").count(),
        "total_revenue": str(DemoOrder.objects.filter(workspace=ws).aggregate(s=Sum("total"))["s"] or 0),
        "simulated": True,
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def demo_analytics_summary(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    events = DemoAnalyticsEvent.objects.filter(workspace=ws)
    return Response({
        "total_events": events.count(),
        "by_type": list(events.values("event_type").annotate(count=Count("id"))),
        "simulated": True,
    })

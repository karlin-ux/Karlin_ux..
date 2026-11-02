from django.db.models import Count, Sum
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from accounts.models import Workspace
from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoAuditLog, DemoBooking, DemoCustomer,
    DemoManager, DemoMediaAsset, DemoNotification, DemoOrder, DemoOrderItem, DemoOrderStatusEvent, DemoPage, DemoProduct,
    DemoRole, DemoService, DemoCart, DemoCartItem,
)
from .serializers import (
    DemoAnalyticsEventSerializer, DemoApplicationCustomerSerializer, DemoApplicationSerializer, DemoAuditLogSerializer,
    DemoBookingSerializer, DemoCustomerSerializer, DemoManagerSerializer,
    DemoMediaAssetSerializer, DemoNotificationSerializer, DemoOrderSerializer,
    DemoPageSerializer, DemoProductSerializer, DemoRoleSerializer, DemoServiceSerializer, DemoCartSerializer, DemoCartItemSerializer,
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

    def _validate_media(self, ws, data):
        from media.models import MediaAsset
        for field in ("primary_image",):
            val = data.get(field)
            if val is not None and val.workspace_id != ws.id:
                raise serializers.ValidationError({field: "Media must belong to the same workspace."})
        gallery = data.get("gallery")
        if gallery is not None:
            for m in gallery:
                if m.workspace_id != ws.id:
                    raise serializers.ValidationError({"gallery": "Media must belong to the same workspace."})

    def perform_create(self, serializer):
        ws = self.get_workspace()
        self._validate_media(ws, serializer.validated_data)
        serializer.save(workspace=ws)

    def perform_update(self, serializer):
        ws = self.get_workspace()
        self._validate_media(ws, serializer.validated_data)
        serializer.save()


class DemoServiceViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoService.objects.all()
    serializer_class = DemoServiceSerializer


class DemoOrderViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoOrder.objects.all()
    serializer_class = DemoOrderSerializer

    def perform_create(self, serializer):
        order = serializer.save(workspace=self.get_workspace())
        DemoOrderStatusEvent.objects.create(order=order, status=order.status, note="Created")
        DemoNotification.objects.create(workspace=order.workspace, recipient_type="admin", title="New order", message=f"Order {order.id} created")


    def get_queryset(self):
        qs = super().get_queryset()
        status_f = self.request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)
        return qs


class DemoBookingViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoBooking.objects.all()
    serializer_class = DemoBookingSerializer

    def perform_create(self, serializer):
        import datetime
        ws = self.get_workspace()
        data = serializer.validated_data
        date = data.get("date")
        time = data.get("time")
        if date < timezone.now().date():
            raise serializers.ValidationError({"date": "Cannot book in the past."})
        # conflict check
        qs = DemoBooking.objects.filter(workspace=ws, date=date, time=time).exclude(status="cancelled")
        if qs.exists():
            raise serializers.ValidationError({"time": "Time slot already booked."})
        booking = serializer.save(workspace=ws)
        DemoNotification.objects.create(workspace=ws, recipient_type="admin", title="New booking", message=f"{booking.service_name} on {booking.date}")



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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def checkout(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    if request.data.get("use_cart"):
        cart = _get_cart(ws)
        items = [{"product_id": str(i.product.id), "quantity": i.quantity} for i in cart.items.all()]
    else:
        items = request.data.get("items", [])
    if not isinstance(items, list) or not items:
        return Response({"detail": "No items."}, status=400)
    delivery_option = request.data.get("delivery_option", "collection")
    delivery_details = request.data.get("delivery_details", "") or ""
    customer_name = request.data.get("customer_name", "") or ""
    customer_email = request.data.get("customer_email", "") or request.user.email

    try:
        with transaction.atomic():
            order = DemoOrder.objects.create(
                workspace=ws,
                status="new",
                payment_status="unpaid",
                total=Decimal("0.00"),
                internal_notes=f"Customer: {customer_name} <{customer_email}>. Delivery: {delivery_option}. {delivery_details}",
            )
            total = Decimal("0.00")
            for it in items:
                pid = it.get("product_id")
                qty = int(it.get("quantity", 1))
                if qty < 1:
                    raise ValueError("Invalid quantity.")
                product = DemoProduct.objects.select_for_update().get(id=pid, workspace=ws)
                if not product.is_active or not product.is_published:
                    raise ValueError(f"Product unavailable: {product.name}")
                if product.stock < qty:
                    raise ValueError(f"Insufficient stock: {product.name}")
                unit_price = product.price
                DemoOrderItem.objects.create(
                    order=order, product=product, product_name=product.name,
                    quantity=qty, unit_price=unit_price,
                )
                total += unit_price * qty
                product.stock -= qty
                product.save()
            order.total = total
            order.save()
            DemoOrderStatusEvent.objects.create(order=order, status="new", note="Checkout")
            DemoNotification.objects.create(workspace=ws, recipient_type="admin", title="New order", message=f"Order {order.id} placed")
            # customer notification
            DemoNotification.objects.create(workspace=ws, recipient_type="customer", title="Order confirmed", message=f"Your order {order.id} is confirmed (simulated).")
    except DemoProduct.DoesNotExist:
        return Response({"detail": "Product not found."}, status=400)
    except ValueError as e:
        return Response({"detail": str(e)}, status=400)
    except Exception as e:
        return Response({"detail": "Checkout failed."}, status=400)

    if request.data.get("use_cart"):
        _get_cart(ws).items.all().delete()
    return Response(DemoOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class CustomerApplicationViewSet(WorkspaceScopedMixin, viewsets.ModelViewSet):
    queryset = DemoApplication.objects.all()
    serializer_class = DemoApplicationCustomerSerializer


def _get_cart(ws):
    cart, _ = DemoCart.objects.get_or_create(workspace=ws)
    return cart


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def get_cart(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    cart = _get_cart(ws)
    return Response(DemoCartSerializer(cart).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def add_to_cart(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    pid = request.data.get("product_id")
    qty = int(request.data.get("quantity", 1))
    if qty < 1:
        return Response({"detail": "Invalid quantity."}, status=400)
    try:
        product = DemoProduct.objects.get(id=pid, workspace=ws)
    except DemoProduct.DoesNotExist:
        return Response({"detail": "Product not found."}, status=404)
    if not product.is_active or not product.is_published:
        return Response({"detail": "Product unavailable."}, status=400)
    if product.stock < qty:
        return Response({"detail": "Insufficient stock."}, status=400)
    cart = _get_cart(ws)
    item, created = DemoCartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": qty})
    if not created:
        item.quantity += qty
        if item.quantity > product.stock:
            return Response({"detail": "Insufficient stock."}, status=400)
        item.save()
    return Response(DemoCartSerializer(cart).data)


@api_view(["PATCH"])
@permission_classes([permissions.IsAuthenticated])
def update_cart_item(request, pk):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    try:
        item = DemoCartItem.objects.get(id=pk, cart__workspace=ws)
    except DemoCartItem.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)
    qty = int(request.data.get("quantity", item.quantity))
    if qty < 1:
        item.delete()
        cart = _get_cart(ws)
        return Response(DemoCartSerializer(cart).data)
    if qty > item.product.stock:
        return Response({"detail": "Insufficient stock."}, status=400)
    item.quantity = qty
    item.save()
    cart = _get_cart(ws)
    return Response(DemoCartSerializer(cart).data)


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def remove_cart_item(request, pk):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    DemoCartItem.objects.filter(id=pk, cart__workspace=ws).delete()
    cart = _get_cart(ws)
    return Response(DemoCartSerializer(cart).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def clear_cart(request):
    ws = _user_workspace(request.user)
    if ws is None:
        return Response({"detail": "No workspace."}, status=403)
    cart = _get_cart(ws)
    cart.items.all().delete()
    return Response(DemoCartSerializer(cart).data)



from rest_framework import serializers

from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoAuditLog, DemoBooking, DemoCart, DemoCartItem, DemoCustomer,
    DemoManager, DemoMediaAsset, DemoNotification, DemoOrder, DemoOrderItem,
    DemoOrderStatusEvent, DemoPage, DemoPageRevision, DemoProduct, DemoRole, DemoService,
)


def _workspace_from_context(serializer):
    request = serializer.context.get("request")
    view = serializer.context.get("view")
    ws = None
    if view is not None and hasattr(view, "get_workspace"):
        ws = view.get_workspace()
    if ws is None and request is not None and hasattr(request.user, "is_authenticated") and request.user.is_authenticated:
        from accounts.models import Workspace
        ws = Workspace.objects.filter(owner=request.user).first()
    return ws


class WorkspaceScopedSerializerMixin:
    """Common workspace-scoped validation helpers for demo serializers."""

    def _get_workspace(self):
        if hasattr(self, "_cached_workspace"):
            return self._cached_workspace
        ws = _workspace_from_context(self)
        if ws is None and getattr(self, "instance", None) is not None and hasattr(self.instance, "workspace_id"):
            ws = self.instance.workspace
        self._cached_workspace = ws
        return ws

    def _validate_workspace_fk(self, obj, field_name, label="resource"):
        if obj is None:
            return obj
        ws = self._get_workspace()
        if ws is None or getattr(obj, "workspace_id", None) != ws.id:
            raise serializers.ValidationError({field_name: f"Selected {label} is not available."})
        return obj

    def _validate_workspace_m2m(self, objs, field_name, label="resource"):
        ws = self._get_workspace()
        if ws is None:
            if objs:
                raise serializers.ValidationError({field_name: f"Selected {label} is not available."})
            return objs
        for obj in objs or []:
            if getattr(obj, "workspace_id", None) != ws.id:
                raise serializers.ValidationError({field_name: f"Selected {label} is not available."})
        return objs


class DemoCustomerSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoCustomer
        fields = [
            "id", "name", "email", "phone", "category", "is_active",
            "registration_date", "last_activity", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "registration_date", "created_at", "updated_at"]


class DemoProductSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoProduct
        fields = [
            "id", "name", "description", "price", "stock", "category", "tags",
            "is_featured", "is_active", "is_published", "image", "variations",
            "primary_image", "gallery", "model_3d",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_primary_image(self, value):
        return self._validate_workspace_fk(value, "primary_image", "media asset")

    def validate_model_3d(self, value):
        return self._validate_workspace_fk(value, "model_3d", "media asset")

    def validate_gallery(self, value):
        return self._validate_workspace_m2m(value, "gallery", "media asset")


class DemoOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoOrderItem
        fields = ["id", "order", "product", "product_name", "quantity", "unit_price"]
        read_only_fields = fields


class DemoServiceSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoService
        fields = [
            "id", "name", "description", "duration_minutes", "operating_start", "operating_end",
            "slot_interval_minutes", "unavailable_dates", "price", "is_active", "image",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_image(self, value):
        return self._validate_workspace_fk(value, "image", "media asset")


class DemoOrderSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    items = DemoOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = DemoOrder
        fields = [
            "id", "customer", "status", "payment_status", "total",
            "internal_notes", "order_date", "items", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "payment_status", "total", "order_date", "items", "created_at", "updated_at"]

    def validate_customer(self, value):
        return self._validate_workspace_fk(value, "customer", "customer")

    def validate_status(self, value):
        instance = getattr(self, "instance", None)
        if instance is not None and value == instance.status:
            return value
        allowed = {choice[0] for choice in DemoOrder.STATUS_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Invalid order status.")
        return value

    def create(self, validated_data):
        # Server-authoritative order/payment values; checkout flow computes totals/items separately.
        validated_data["payment_status"] = DemoOrder._meta.get_field("payment_status").default or "unpaid"
        validated_data["total"] = 0
        validated_data.setdefault("status", "new")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Never allow client-controlled financial/payment mutation through generic CRUD.
        validated_data.pop("payment_status", None)
        validated_data.pop("total", None)
        validated_data.pop("order_date", None)
        return super().update(instance, validated_data)


class DemoOrderStatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoOrderStatusEvent
        fields = ["id", "order", "status", "note", "created_at"]
        read_only_fields = fields


class DemoBookingSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoBooking
        fields = [
            "id", "service", "service_name", "customer", "customer_name", "customer_email",
            "date", "time", "status", "notes", "duration_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_service(self, value):
        return self._validate_workspace_fk(value, "service", "service")

    def validate_customer(self, value):
        return self._validate_workspace_fk(value, "customer", "customer")

    def validate_status(self, value):
        instance = getattr(self, "instance", None)
        allowed = {choice[0] for choice in DemoBooking.STATUS_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Invalid booking status.")
        if instance is None:
            # New bookings enter through the normal pending flow.
            if value != "pending":
                raise serializers.ValidationError("New bookings must start as pending.")
            return value
        # Preserve legitimate management transitions; availability/overlap rules are enforced in the view.
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)

        # Determine effective service for this create/update.
        if "service" in attrs:
            service = attrs.get("service")
        else:
            service = getattr(instance, "service", None)

        if service is not None:
            # Server-authoritative values derived from the selected workspace service.
            attrs["service_name"] = service.name
            attrs["duration_minutes"] = service.duration_minutes or 30
        else:
            # Custom booking without a selected service: scheduling/overlap logic uses a 30-minute
            # default when no service is present, so persist the matching duration for consistency.
            attrs["duration_minutes"] = 30
            if "service_name" in attrs:
                name = (attrs.get("service_name") or "").strip()
                if not name:
                    raise serializers.ValidationError({"service_name": "Service name is required."})
                attrs["service_name"] = name
            elif instance is None:
                raise serializers.ValidationError({"service_name": "Service name is required."})
            # On updates without service_name provided, preserve the existing stored name.

        return attrs


class DemoApplicationSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoApplication
        fields = [
            "id", "application_type", "applicant_name", "applicant_email", "subject", "message",
            "status", "assigned_to", "internal_notes", "attachment", "attachments",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_status(self, value):
        allowed = {choice[0] for choice in DemoApplication.STATUS_CHOICES}
        if value not in allowed:
            raise serializers.ValidationError("Invalid application status.")
        return value

    def validate_attachments(self, value):
        return self._validate_workspace_m2m(value, "attachments", "attachment")


class DemoNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoNotification
        fields = ["id", "recipient_type", "title", "message", "is_read", "created_at"]
        read_only_fields = ["id", "created_at"]


class DemoPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoPage
        fields = [
            "id", "title", "slug", "content", "is_published", "scheduled_for",
            "seo_title", "seo_description", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DemoMediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoMediaAsset
        fields = [
            "id", "file", "original_name", "mime_type", "size",
            "alt_text", "description", "folder", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class DemoRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoRole
        fields = ["id", "name", "permissions", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DemoManagerSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = DemoManager
        fields = [
            "id", "name", "email", "role", "is_active", "last_activity",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_role(self, value):
        return self._validate_workspace_fk(value, "role", "role")


class DemoAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoAuditLog
        fields = ["id", "actor", "action", "target", "metadata", "created_at"]
        read_only_fields = fields


class DemoAnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoAnalyticsEvent
        fields = ["id", "event_type", "page", "metadata", "created_at"]
        read_only_fields = fields


class DemoApplicationCustomerSerializer(WorkspaceScopedSerializerMixin, serializers.ModelSerializer):
    # Compatibility: frontend uploads via /demo/media/ (DemoMediaAsset, integer PK) and submits attachment_ids.
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, write_only=True
    )

    class Meta:
        model = DemoApplication
        fields = [
            "id", "application_type", "applicant_name", "applicant_email", "subject", "message",
            "status", "attachments", "attachment_ids", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def _resolve_attachment_ids(self, ids):
        if not ids:
            return []
        ws = self._get_workspace()
        if ws is None:
            raise serializers.ValidationError({"attachments": "Selected attachment is not available."})

        # Preserve order and remove duplicates while normalizing to the real demo media PK type.
        unique_ids = list(dict.fromkeys(int(i) for i in ids))
        assets = list(DemoMediaAsset.objects.filter(id__in=unique_ids, workspace=ws))
        if len(assets) != len(unique_ids):
            # Missing, invalid-for-workspace, or cross-workspace IDs.
            raise serializers.ValidationError({"attachments": "Selected attachment is not available."})
        # Preserve requested order with strict ID matching (no silent omission).
        by_id = {int(a.id): a for a in assets}
        try:
            return [by_id[i] for i in unique_ids]
        except KeyError:
            raise serializers.ValidationError({"attachments": "Selected attachment is not available."})

    def validate_attachments(self, value):
        return self._validate_workspace_m2m(value, "attachments", "attachment")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        attachment_ids = attrs.pop("attachment_ids", None)
        if attachment_ids is not None:
            # attachment_ids takes precedence for compatibility with existing frontend payloads.
            attrs["attachments"] = self._resolve_attachment_ids(attachment_ids)
        return attrs


class DemoCartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = DemoCartItem
        fields = ["id", "product", "product_name", "unit_price", "quantity", "line_total"]
        read_only_fields = fields

    def get_line_total(self, obj):
        return str(obj.product.price * obj.quantity)


class DemoCartSerializer(serializers.ModelSerializer):
    items = DemoCartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = DemoCart
        fields = ["id", "items", "total", "updated_at"]
        read_only_fields = fields

    def get_total(self, obj):
        return str(sum((i.product.price * i.quantity for i in obj.items.all()), __import__("decimal").Decimal("0")))


class DemoPageRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoPageRevision
        fields = ["id", "page", "title", "content", "is_published", "created_by", "created_at"]
        read_only_fields = fields

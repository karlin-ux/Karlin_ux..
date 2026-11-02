from rest_framework import serializers
from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoAuditLog, DemoBooking, DemoCart, DemoCartItem, DemoCustomer,
    DemoManager, DemoMediaAsset, DemoNotification, DemoOrder, DemoOrderItem,
    DemoOrderStatusEvent, DemoPage, DemoProduct, DemoRole, DemoService,
)


class DemoCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoCustomer
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at", "registration_date"]


class DemoProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoProduct
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoOrderItem
        fields = "__all__"



class DemoServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoService
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoOrderSerializer(serializers.ModelSerializer):
    items = DemoOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = DemoOrder
        fields = "__all__"
        read_only_fields = ["workspace", "order_date"]



class DemoOrderStatusEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoOrderStatusEvent
        fields = "__all__"
        read_only_fields = ["created_at"]


class DemoBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoBooking
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoApplication
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoNotification
        fields = "__all__"
        read_only_fields = ["workspace", "created_at"]


class DemoPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoPage
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoMediaAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoMediaAsset
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoRole
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoManager
        fields = "__all__"
        read_only_fields = ["workspace", "created_at", "updated_at"]


class DemoAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoAuditLog
        fields = "__all__"
        read_only_fields = ["workspace", "created_at"]


class DemoAnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoAnalyticsEvent
        fields = "__all__"
        read_only_fields = ["workspace", "created_at"]

class DemoApplicationCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemoApplication
        fields = ["id", "application_type", "applicant_name", "applicant_email", "subject", "message", "status", "attachments", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]


class DemoCartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    unit_price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2, read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = DemoCartItem
        fields = ["id", "product", "product_name", "unit_price", "quantity", "line_total"]

    def get_line_total(self, obj):
        return str(obj.product.price * obj.quantity)


class DemoCartSerializer(serializers.ModelSerializer):
    items = DemoCartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = DemoCart
        fields = ["id", "items", "total", "updated_at"]

    def get_total(self, obj):
        return str(sum((i.product.price * i.quantity for i in obj.items.all()), __import__("decimal").Decimal("0")))

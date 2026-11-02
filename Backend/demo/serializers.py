from rest_framework import serializers
from .models import (
    DemoAnalyticsEvent, DemoApplication, DemoAuditLog, DemoBooking, DemoCustomer,
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
        fields = ["id", "application_type", "applicant_name", "applicant_email", "subject", "message", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

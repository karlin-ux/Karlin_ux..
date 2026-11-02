from rest_framework import serializers

from accounts.models import User
from .models import GlobalSetting, PlatformAnalyticsEvent, PlatformAuditLog, PlatformNotification, SecurityEvent


class PlatformUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "role", "is_active", "created_at", "is_superadmin"]


class PlatformAnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformAnalyticsEvent
        fields = "__all__"


class PlatformAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformAuditLog
        fields = "__all__"


class SecurityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityEvent
        fields = "__all__"


class PlatformNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformNotification
        fields = "__all__"


class GlobalSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSetting
        fields = "__all__"
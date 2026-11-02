from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class PlatformAnalyticsEvent(models.Model):
    """Genuine platform analytics events."""
    event_type = models.CharField(max_length=60)
    path = models.CharField(max_length=300, blank=True)
    session_key = models.CharField(max_length=64, blank=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["-created_at"]), models.Index(fields=["event_type", "-created_at"])]

    def __str__(self):
        return f"{self.event_type} {self.path}"


class PlatformAuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="platform_audit_logs")
    action = models.CharField(max_length=120)
    target = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    outcome = models.CharField(max_length=20, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["-created_at"])]

    def __str__(self):
        return f"{self.actor} {self.action}"


class SecurityEvent(models.Model):
    event_type = models.CharField(max_length=60)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="security_events_platform")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.event_type


class PlatformNotification(models.Model):
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    level = models.CharField(max_length=20, default="info")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class GlobalSetting(models.Model):
    key = models.CharField(max_length=120, unique=True)
    value = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
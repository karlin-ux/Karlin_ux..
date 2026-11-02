import uuid

from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class MediaAsset(models.Model):
    CATEGORY_IMAGE = "image"
    CATEGORY_DOCUMENT = "document"
    CATEGORY_VIDEO = "video"
    CATEGORY_OTHER = "other"
    CATEGORY_CHOICES = [
        (CATEGORY_IMAGE, "Image"),
        (CATEGORY_DOCUMENT, "Document"),
        (CATEGORY_VIDEO, "Video"),
        (CATEGORY_OTHER, "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey("accounts.Workspace", on_delete=models.CASCADE, related_name="media_assets")
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="media_assets")
    original_filename = models.CharField(max_length=255)
    storage_path = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.BigIntegerField(default=0)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    checksum = models.CharField(max_length=64, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["workspace", "-created_at"])]

    def __str__(self):
        return self.original_filename


class MediaVariant(models.Model):
    VARIANT_ORIGINAL = "original"
    VARIANT_THUMBNAIL = "thumbnail"
    VARIANT_PREVIEW = "preview"
    VARIANT_OPTIMIZED = "optimized"
    VARIANT_EDITED = "edited"
    VARIANT_CHOICES = [
        (VARIANT_ORIGINAL, "Original"),
        (VARIANT_THUMBNAIL, "Thumbnail"),
        (VARIANT_PREVIEW, "Preview"),
        (VARIANT_OPTIMIZED, "Optimized"),
        (VARIANT_EDITED, "Edited"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, related_name="variants")
    variant_type = models.CharField(max_length=20, choices=VARIANT_CHOICES)
    storage_path = models.CharField(max_length=500)
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.BigIntegerField(default=0)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.asset_id} {self.variant_type}"


class MediaProcessingJob(models.Model):
    STATUS_PENDING = "pending"
    STATUS_PROCESSING = "processing"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PROCESSING, "Processing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(MediaAsset, on_delete=models.CASCADE, related_name="jobs")
    job_type = models.CharField(max_length=60)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class WorkspaceStorageUsage(models.Model):
    workspace = models.OneToOneField("accounts.Workspace", on_delete=models.CASCADE, related_name="storage_usage")
    total_bytes = models.BigIntegerField(default=0)
    asset_count = models.IntegerField(default=0)
    image_count = models.IntegerField(default=0)
    document_count = models.IntegerField(default=0)
    video_count = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"StorageUsage({self.workspace_id})"
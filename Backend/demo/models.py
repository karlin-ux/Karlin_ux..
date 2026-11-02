import uuid

from django.db import models
from django.db.models import Q
from django.conf import settings

User = settings.AUTH_USER_MODEL


class WorkspaceOwned(models.Model):
    workspace = models.ForeignKey("accounts.Workspace", on_delete=models.CASCADE, related_name="%(class)s_set")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class DemoCustomer(WorkspaceOwned):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    category = models.CharField(max_length=40, default="standard")
    is_active = models.BooleanField(default=True)
    registration_date = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["workspace", "-created_at"])]

    def __str__(self):
        return self.name


class DemoProduct(WorkspaceOwned):
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=80, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    image = models.CharField(max_length=255, blank=True)  # storage path
    variations = models.JSONField(default=list, blank=True)
    primary_image = models.ForeignKey("media.MediaAsset", on_delete=models.SET_NULL, null=True, blank=True, related_name="product_primary")
    gallery = models.ManyToManyField("media.MediaAsset", blank=True, related_name="product_gallery")
    model_3d = models.ForeignKey("media.MediaAsset", on_delete=models.SET_NULL, null=True, blank=True, related_name="product_models")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name



class DemoService(models.Model):
    workspace = models.ForeignKey("accounts.Workspace", on_delete=models.CASCADE, related_name="demo_services")
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    operating_start = models.TimeField(default="09:00")
    operating_end = models.TimeField(default="17:00")
    slot_interval_minutes = models.PositiveIntegerField(default=30)
    unavailable_dates = models.JSONField(default=list, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    image = models.ForeignKey("media.MediaAsset", on_delete=models.SET_NULL, null=True, blank=True, related_name="service_images")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("workspace", "name")

    def __str__(self):
        return self.name


class DemoOrder(WorkspaceOwned):
    STATUS_CHOICES = [
        ("new", "New"), ("pending", "Pending"), ("processing", "Processing"),
        ("paid", "Paid"), ("shipped", "Shipped"), ("completed", "Completed"),
        ("cancelled", "Cancelled"), ("refunded", "Refunded"),
    ]
    customer = models.ForeignKey(DemoCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    payment_status = models.CharField(max_length=20, default="unpaid")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    internal_notes = models.TextField(blank=True)
    order_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-order_date"]

    def __str__(self):
        return f"Order {self.id}"


class DemoOrderItem(models.Model):
    order = models.ForeignKey(DemoOrder, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(DemoProduct, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=160)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class DemoBooking(WorkspaceOwned):
    STATUS_CHOICES = [
        ("pending", "Pending"), ("confirmed", "Confirmed"),
        ("rescheduled", "Rescheduled"), ("cancelled", "Cancelled"), ("completed", "Completed"),
    ]
    service = models.ForeignKey(DemoService, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    service_name = models.CharField(max_length=160)
    customer = models.ForeignKey(DemoCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    customer_name = models.CharField(max_length=120, blank=True)
    customer_email = models.EmailField(blank=True)
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-time"]
        indexes = [models.Index(fields=["workspace", "date"])]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "service", "date", "time"],
                condition=~Q(status="cancelled"),
                name="unique_booking_slot_noncancelled",
            ),
        ]

    def __str__(self):
        return f"{self.service_name} {self.date} {self.time}"


class DemoApplication(WorkspaceOwned):
    TYPE_CHOICES = [
        ("job", "Job"), ("service", "Service"), ("membership", "Membership"),
        ("enquiry", "Enquiry"), ("registration", "Registration"),
    ]
    STATUS_CHOICES = [
        ("new", "New"), ("reviewing", "Reviewing"), ("approved", "Approved"),
        ("rejected", "Rejected"), ("closed", "Closed"),
    ]
    application_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="enquiry")
    applicant_name = models.CharField(max_length=120)
    applicant_email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    assigned_to = models.CharField(max_length=120, blank=True)
    internal_notes = models.TextField(blank=True)
    attachment = models.CharField(max_length=255, blank=True)
    attachments = models.ManyToManyField("media.MediaAsset", blank=True, related_name="application_attachments")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.application_type}: {self.applicant_name}"


class DemoNotification(WorkspaceOwned):
    recipient_type = models.CharField(max_length=20, default="admin")  # admin/customer
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class DemoPage(WorkspaceOwned):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    content = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("workspace", "slug")

    def __str__(self):
        return self.title


class DemoMediaAsset(WorkspaceOwned):
    file = models.CharField(max_length=500)  # storage path
    original_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    size = models.BigIntegerField(default=0)
    alt_text = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    folder = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_name or self.file


class DemoRole(WorkspaceOwned):
    name = models.CharField(max_length=80)
    permissions = models.JSONField(default=dict, blank=True)  # module -> {view,create,edit,delete}
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("workspace", "name")

    def __str__(self):
        return self.name


class DemoManager(WorkspaceOwned):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    role = models.ForeignKey(DemoRole, on_delete=models.SET_NULL, null=True, blank=True, related_name="managers")
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DemoAuditLog(WorkspaceOwned):
    actor = models.CharField(max_length=120)
    action = models.CharField(max_length=120)
    target = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.actor} {self.action}"


class DemoAnalyticsEvent(models.Model):
    """Simulated workspace analytics events."""
    workspace = models.ForeignKey("accounts.Workspace", on_delete=models.CASCADE, related_name="demo_events")
    event_type = models.CharField(max_length=60)
    page = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["workspace", "-created_at"])]

class DemoOrderStatusEvent(models.Model):
    order = models.ForeignKey(DemoOrder, on_delete=models.CASCADE, related_name="status_events")
    status = models.CharField(max_length=20)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class DemoCart(models.Model):
    workspace = models.OneToOneField("accounts.Workspace", on_delete=models.CASCADE, related_name="cart")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart({self.workspace_id})"


class DemoCartItem(models.Model):
    cart = models.ForeignKey(DemoCart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(DemoProduct, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("cart", "product")

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"


class DemoPageRevision(models.Model):
    page = models.ForeignKey(DemoPage, on_delete=models.CASCADE, related_name="revisions")
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Revision {self.id} of {self.page_id}"

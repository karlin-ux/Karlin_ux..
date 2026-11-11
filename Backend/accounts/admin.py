from django.contrib import admin

from .models import User, EmailVerificationToken, DonationProduct, DonationDonation


@admin.register(DonationProduct)
class DonationProductAdmin(admin.ModelAdmin):
    """Admin for donation products - max 5 products enforced."""
    list_display = ("name", "amount_cents", "amount_dollars_display", "is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ["display_order", "name"]

    def amount_dollars_display(self, obj):
        return obj.amount_dollars
    amount_dollars_display.short_description = "Amount (USD)"

    def has_add_permission(self, request):
        """Enforce maximum of 5 donation products."""
        count = DonationProduct.objects.count()
        if count >= 5:
            return False
        return super().has_add_permission(request)


@admin.register(DonationDonation)
class DonationDonationAdmin(admin.ModelAdmin):
    """Admin for individual donation records."""
    list_display = ("__str__", "user", "product", "payment_method", "status", "created_at")
    list_filter = ("status", "payment_method", "created_at")
    search_fields = ("reference", "user__email", "product__name")
    readonly_fields = ("reference", "created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    """Admin for email verification tokens."""
    list_display = ("user", "is_expired_display", "is_used_display", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "token")
    readonly_fields = ("token", "created_at")

    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.short_description = "Expired"

    def is_used_display(self, obj):
        return obj.is_used()
    is_used_display.short_description = "Used"

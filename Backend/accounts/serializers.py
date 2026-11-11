from rest_framework import serializers

from .models import User, CustomerProfile, Workspace, DonationProduct, DonationDonation, EmailVerificationToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "role", "is_active", "created_at", "is_superadmin"]
        read_only_fields = ["id", "role", "is_active", "created_at", "is_superadmin"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=10)
    password_confirm = serializers.CharField(write_only=True)

    def validate_email(self, value):
        from .models import User
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        from .models import User
        user = User.objects.create_user(email=validated_data["email"], password=validated_data["password"])
        return user


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ["display_name", "preferences"]


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "settings", "created_at"]

# Donation Serializers
class DonationProductSerializer(serializers.ModelSerializer):
    """Serializer for donation products."""
    amount_dollars = serializers.SerializerMethodField()

    class Meta:
        model = DonationProduct
        fields = ["id", "name", "amount_cents", "amount_dollars", "description", "is_active", "display_order"]

    def get_amount_dollars(self, obj):
        return obj.amount_dollars


class DonationDonationSerializer(serializers.ModelSerializer):
    """Serializer for individual donation records."""
    product_name = serializers.CharField(source="product.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = DonationDonation
        fields = [
            "id", "reference", "product", "product_name", "amount_cents",
            "amount_dollars", "payment_method", "payment_method_display",
            "status", "status_display", "created_at", "updated_at"
        ]
        read_only_fields = ["reference", "created_at", "updated_at", "user_email", "payment_method_display", "status_display"]


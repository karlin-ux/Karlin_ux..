from rest_framework import serializers

from django.contrib.auth.password_validation import validate_password

from .models import (
    User,
    CustomerProfile,
    Workspace,
    DonationProduct,
    DonationDonation,
    EmailVerificationToken,
    PasswordResetToken,
)


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
        # Canonicalize for consistent handling, but do not perform account-existence checks here
        # (would enable enumeration, especially when combined with other validation errors).
        return User.objects.canonicalize_email(value)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

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


class GoogleCredentialAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(trim_whitespace=True)

    def validate_credential(self, value):
        if not value or len(value) > 4096:
            raise serializers.ValidationError("Invalid credential.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(trim_whitespace=True)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_token(self, value):
        if not value or len(value) > 512:
            raise serializers.ValidationError("Invalid reset token.")
        return value

    def validate(self, attrs):
        if attrs.get("new_password") != attrs.get("new_password_confirm"):
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        # Run Django's configured password validators
        try:
            validate_password(attrs.get("new_password") or "")
        except Exception as e:
            # Normalize validation errors
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(e, DjangoValidationError):
                raise serializers.ValidationError({"new_password": list(e.messages)})
            raise serializers.ValidationError({"new_password": ["Invalid password."]})
        return attrs

# Donation Serializers
class DonationProductSerializer(serializers.ModelSerializer):
    """Serializer for donation products."""
    amount_dollars = serializers.SerializerMethodField()

    class Meta:
        model = DonationProduct
        fields = ["id", "name", "amount_cents", "amount_dollars", "description", "is_active", "display_order"]

    def get_amount_dollars(self, obj):
        return f"{obj.amount_cents / 100:.2f}"


class DonationDonationSerializer(serializers.ModelSerializer):
    """Serializer for individual donation records."""
    product_name = serializers.CharField(source="product.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    amount_dollars = serializers.SerializerMethodField()

    class Meta:
        model = DonationDonation
        fields = [
            "id", "reference", "product", "product_name", "user_email",
            "amount_cents", "amount_dollars", "payment_method",
            "payment_method_display", "status", "status_display",
            "created_at", "updated_at"
        ]
        read_only_fields = [
            "reference", "amount_cents", "amount_dollars", "status",
            "created_at", "updated_at", "user_email", "product_name",
            "payment_method_display", "status_display",
        ]

    def get_amount_dollars(self, obj):
        return f"{obj.amount_cents / 100:.2f}"

    def validate_product(self, product):
        if not product.is_active:
            raise serializers.ValidationError("Selected donation product is not available.")
        return product

    def create(self, validated_data):
        request = self.context.get("request")
        product = validated_data["product"]
        # Bind ownership and trusted amount server-side; never trust client user/status/amount.
        donation = DonationDonation.objects.create(
            user=request.user,
            product=product,
            amount_cents=product.amount_cents,
            payment_method=validated_data["payment_method"],
            status=DonationDonation.Status.PENDING,
        )
        return donation


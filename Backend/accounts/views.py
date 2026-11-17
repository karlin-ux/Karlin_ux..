import hashlib
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils import timezone as dj_timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import User, CustomerProfile, Workspace, AccountSecurityEvent, DonationProduct, DonationDonation, EmailVerificationToken
from .serializers import CustomerProfileSerializer, RegisterSerializer, UserSerializer, WorkspaceSerializer, DonationProductSerializer, DonationDonationSerializer


def _reduce_registration_timing_difference(raw_password: str) -> None:
    """Perform dummy password hashing to reduce duplicate/success timing side-channel differences.

    Uses Django's configured password hasher. This reduces (but cannot guarantee elimination of)
    timing differences and must not be treated as constant-time behavior.
    """
    make_password(raw_password)


class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        generic_detail = {"detail": "If registration is successful, you can sign in."}
        generic_error = {"detail": "Registration could not be completed. Please try again later."}
        # Validate input (syntax/password/confirmation) without any account-existence checks.
        # Validation failures must not reveal whether the submitted email exists.
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        canonical_email = ser.validated_data["email"]
        raw_password = ser.validated_data["password"]
        try:
            with transaction.atomic():
                # Rely on DB/app uniqueness for duplicates; no distinguishable duplicate response.
                if User.objects.filter(email__iexact=canonical_email).exists():
                    # Reduce (not eliminate) timing side-channel differences vs successful registration.
                    _reduce_registration_timing_difference(raw_password)
                    return Response(generic_detail, status=status.HTTP_200_OK)
                ser.save()
        except IntegrityError:
            # Transaction rolled back. Distinguish genuine duplicate-email conflict from unrelated failures.
            try:
                duplicate_exists = User.objects.filter(email__iexact=canonical_email).exists()
            except Exception:
                logger.exception("Registration integrity handling failed during duplicate check.")
                return Response(generic_error, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            if duplicate_exists:
                # Reduce (not eliminate) timing side-channel differences vs successful registration.
                _reduce_registration_timing_difference(raw_password)
                return Response(generic_detail, status=status.HTTP_200_OK)
            logger.exception("Unexpected registration integrity failure.")
            return Response(generic_error, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception:
            logger.exception("Unexpected registration failure.")
            return Response(generic_error, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Do not establish an authenticated session for registration responses.
        return Response(generic_detail, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, username=email, password=password)
        if user is None:
            from platform_admin.models import SecurityEvent
            SecurityEvent.objects.create(event_type="login_failed", ip_address=_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", ""), metadata={"email": email})
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "Account is disabled."}, status=status.HTTP_403_FORBIDDEN)
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        from platform_admin.models import SecurityEvent
        SecurityEvent.objects.create(event_type="login_success", user=user, ip_address=_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", ""))
        from accounts.models import AccountSecurityEvent
        AccountSecurityEvent.objects.create(user=user, event_type=AccountSecurityEvent.EVENT_LOGIN_SUCCESS, ip_address=_ip(request), user_agent=request.META.get("HTTP_USER_AGENT", ""))
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out."})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = UserSerializer(request.user).data
        workspaces = Workspace.objects.filter(owner=request.user)
        data["workspaces"] = WorkspaceSerializer(workspaces, many=True).data
        return Response(data)


class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        profile = request.user.customer_profile
        data = request.data
        if "display_name" in data:
            profile.display_name = data.get("display_name", "")
        if "preferences" in data:
            profile.preferences = data.get("preferences", {}) or {}
        if "profile_picture" in data:
            from media.models import MediaAsset
            pid = data.get("profile_picture")
            if pid:
                try:
                    asset = MediaAsset.objects.get(id=pid, workspace__owner=request.user)
                    profile.profile_picture = asset
                except MediaAsset.DoesNotExist:
                    return Response({"detail": "Media not found."}, status=400)
            else:
                profile.profile_picture = None
        profile.save()
        return Response(CustomerProfileSerializer(profile).data)


class AccountDeletionRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from platform_admin.models import PlatformNotification
        PlatformNotification.objects.create(title="Account deletion requested", message=f"User {request.user.email} requested account deletion.", level="warning")
        return Response({"detail": "Deletion request recorded."})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old = request.data.get("old_password")
        new = request.data.get("new_password")
        if not request.user.check_password(old):
            return Response({"detail": "Old password incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new or "") < 10:
            return Response({"detail": "Password too short."}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new)
        request.user.save()
        login(request, request.user, backend="django.contrib.auth.backends.ModelBackend")
        return Response({"detail": "Password changed."})


# Google OAuth (disabled until safely and fully implemented/configured)
class GoogleOAuthUnavailableMixin:
    permission_classes = [permissions.AllowAny]

    def _unavailable(self, request=None):
        return Response(
            {"detail": "Google sign-in is not available."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )


class GoogleOAuthLoginView(GoogleOAuthUnavailableMixin, APIView):
    """Disabled: unfinished/insecure Google OAuth path must not be exposed as functional."""

    def get(self, request):
        return self._unavailable(request)

    def post(self, request):
        return self._unavailable(request)


class GoogleOAuthCallbackView(GoogleOAuthUnavailableMixin, APIView):
    """Disabled: unfinished/insecure Google OAuth path must not be exposed as functional."""

    def get(self, request):
        return self._unavailable(request)

    def post(self, request):
        return self._unavailable(request)


def _verification_frontend_url(raw_token: str) -> str:
    base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    return f"{base}/verify-email?token={raw_token}"


def _send_verification_email(user, raw_token: str) -> None:
    verification_url = _verification_frontend_url(raw_token)
    send_mail(
        subject="Verify your email address",
        message=f"Please verify your email address by visiting: {verification_url}",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@localhost"),
        recipient_list=[user.email],
        fail_silently=False,
    )


def _normalized_email_value(email) -> str:
    if not isinstance(email, str):
        return ""
    raw = email.strip()
    if not raw:
        return ""
    try:
        return User.objects.normalize_email(raw).lower()
    except Exception:
        return raw.lower()


def _email_cooldown_cache_key(email: str) -> str:
    """Cache key for normalized-email cooldown (SHA-256 of normalized value)."""
    normalized = _normalized_email_value(email)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return f"accounts:email-verification-cooldown:{digest}"


def _email_verification_in_cooldown(email: str, ttl_seconds: int = 60) -> bool:
    """Per-submitted-email cooldown control (uniform for existing/nonexistent emails).

    Uses atomic cache.add() to claim cooldown (no get/set race). Returns True when the
    email is already in cooldown, False when cooldown was successfully claimed.
    Atomicity is only as strong as the configured cache backend (local-memory cache is
    not distributed/production-safe across workers).
    """
    normalized = _normalized_email_value(email)
    # Invalid/empty input must not create arbitrary cooldown entries.
    if not normalized:
        return False
    key = _email_cooldown_cache_key(normalized)
    # cache.add is atomic on supported backends: True if added (not in cooldown), False if exists.
    added = cache.add(key, True, ttl_seconds)
    return not added


class EmailVerificationRequestScopedThrottle(ScopedRateThrottle):
    scope = "email_verify_request"


class EmailVerificationRequestIPThrottle(SimpleRateThrottle):
    scope = "email_verify_request_ip"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident} if ident else None


class EmailVerificationConfirmScopedThrottle(ScopedRateThrottle):
    scope = "email_verify_confirm"


class EmailVerificationConfirmIPThrottle(SimpleRateThrottle):
    scope = "email_verify_confirm_ip"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident} if ident else None


class EmailVerificationResendScopedThrottle(ScopedRateThrottle):
    scope = "email_verify_resend"


class EmailVerificationResendIPThrottle(SimpleRateThrottle):
    scope = "email_verify_resend_ip"

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident} if ident else None


class EmailVerificationRequestView(APIView):
    """Request/send an email verification token.

    - Accepts {"email": "..."} for an existing unverified account.
    - Preserves legacy behavior: if valid registration data is provided, creates the user
      (unverified) and sends a verification token. Standard /register/ flow remains available.
    - Responses avoid confirming whether an account exists.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailVerificationRequestScopedThrottle, EmailVerificationRequestIPThrottle]
    throttle_scope = "email_verify_request"

    def post(self, request, token=None):
        generic_detail = {"detail": "If the request is valid, a verification email will be sent."}
        # Dedicated confirm endpoint handles token confirmation.
        if token is not None:
            return Response({"detail": "Use the verification confirmation endpoint."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

        email = request.data.get("email")

        # Legacy/compat path: registration payload -> create unverified user and send token.
        # Must not reveal account existence via validation, status, body, or session behavior.
        if request.data.get("password") is not None and request.data.get("password_confirm") is not None:
            ser = RegisterSerializer(data=request.data)
            if not ser.is_valid():
                # Input validation failures (syntax/password/confirmation) only; no existence checks.
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

            canonical_email = ser.validated_data["email"]
            raw_password = ser.validated_data["password"]
            normalized_email = _normalized_email_value(canonical_email)
            if _email_verification_in_cooldown(normalized_email):
                return Response(generic_detail, status=status.HTTP_200_OK)
            try:
                with transaction.atomic():
                    existing = User.objects.filter(email__iexact=canonical_email).first()
                    if existing is not None:
                        # Reduce (not eliminate) timing side-channel differences vs successful registration.
                        _reduce_registration_timing_difference(raw_password)
                        # Duplicate registration attempt: indistinguishable generic response.
                        return Response(generic_detail, status=status.HTTP_200_OK)
                    user = ser.save()
                    if user.is_verified:
                        # Preserve consistent state if customized; do not lock out.
                        user.is_verified = False
                        user.email_verified_at = None
                        user.save(update_fields=["is_verified", "email_verified_at", "updated_at"])
                    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
                    raw_token, _ = EmailVerificationToken.issue_for_user(user)
            except IntegrityError:
                # Transaction rolled back. Distinguish genuine duplicate-email conflict from unrelated failures.
                try:
                    duplicate_exists = User.objects.filter(email__iexact=canonical_email).exists()
                except Exception:
                    logger.exception("Verification-registration integrity handling failed during duplicate check.")
                    return Response({"detail": "The request could not be completed. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                if duplicate_exists:
                    # Reduce (not eliminate) timing side-channel differences vs successful registration.
                    _reduce_registration_timing_difference(raw_password)
                    return Response(generic_detail, status=status.HTTP_200_OK)
                logger.exception("Unexpected verification-registration integrity failure.")
                return Response({"detail": "The request could not be completed. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception:
                logger.exception("Unexpected verification-registration failure.")
                return Response({"detail": "The request could not be completed. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            try:
                _send_verification_email(user, raw_token)
            except Exception:
                # Do not leak delivery/internal errors.
                pass
            # Non-enumerating response for registration+verification flow (success/duplicate indistinguishable).
            return Response(generic_detail, status=status.HTTP_200_OK)

        # Safe request-by-email path (no account enumeration).
        if not _email_verification_in_cooldown(email):
            normalized_email = _normalized_email_value(email)
            if normalized_email:
                try:
                    user = User.objects.get(email__iexact=normalized_email, is_active=True, is_verified=False)
                except User.DoesNotExist:
                    user = None
                if user is not None:
                    EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
                    raw_token, _ = EmailVerificationToken.issue_for_user(user)
                    try:
                        _send_verification_email(user, raw_token)
                    except Exception:
                        pass
        return Response(generic_detail, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(APIView):
    """Confirm email verification with a single-use, expiring, hashed token."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailVerificationConfirmScopedThrottle, EmailVerificationConfirmIPThrottle]
    throttle_scope = "email_verify_confirm"

    def post(self, request, token=None):
        raw_token = token or request.data.get("token")
        if not raw_token or not isinstance(raw_token, str):
            return Response({"detail": "Invalid or expired verification token."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            token_obj = EmailVerificationToken.find_valid_for_raw_token(raw_token)
            if token_obj is None:
                return Response({"detail": "Invalid or expired verification token."}, status=status.HTTP_400_BAD_REQUEST)

            user = token_obj.user
            # Mark token used first (single-use), then record verification timestamp.
            token_obj.mark_used()
            if not user.is_verified:
                user.is_verified = True
                user.email_verified_at = dj_timezone.now()
                user.save(update_fields=["is_verified", "email_verified_at", "updated_at"])
            # Invalidate any other outstanding tokens for this user.
            EmailVerificationToken.objects.filter(user=user, used=False).exclude(pk=token_obj.pk).update(used=True)

        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class ResendVerificationView(APIView):
    """Resend verification email safely (no account enumeration)."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [EmailVerificationResendScopedThrottle, EmailVerificationResendIPThrottle]
    throttle_scope = "email_verify_resend"

    def post(self, request):
        email = request.data.get("email", "")
        generic_detail = {"detail": "If the request is valid, a verification email will be sent."}

        if _email_verification_in_cooldown(email):
            return Response(generic_detail, status=status.HTTP_200_OK)

        normalized_email = _normalized_email_value(email)
        if not normalized_email:
            return Response(generic_detail, status=status.HTTP_200_OK)

        try:
            user = User.objects.get(email__iexact=normalized_email, is_active=True, is_verified=False)
        except User.DoesNotExist:
            return Response(generic_detail, status=status.HTTP_200_OK)

        EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
        raw_token, _ = EmailVerificationToken.issue_for_user(user)
        try:
            _send_verification_email(user, raw_token)
        except Exception:
            # Do not leak delivery/internal errors.
            pass
        return Response(generic_detail, status=status.HTTP_200_OK)


# Donation Product List
class DonationProductListView(generics.ListAPIView):
    """List available donation products."""
    queryset = DonationProduct.objects.filter(is_active=True)
    serializer_class = DonationProductSerializer
    permission_classes = [permissions.AllowAny]


# Donation Create
class DonationCreateView(generics.CreateAPIView):
    """Create a new donation record."""
    queryset = DonationDonation.objects.all()
    serializer_class = DonationDonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can only access their own donations
        return DonationDonation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Ownership, amount, and initial status are enforced server-side in the serializer.
        serializer.save()


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User, CustomerProfile, Workspace, AccountSecurityEvent, DonationProduct, DonationDonation, EmailVerificationToken
from .serializers import CustomerProfileSerializer, RegisterSerializer, UserSerializer, WorkspaceSerializer, DonationProductSerializer, DonationDonationSerializer


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
        ser.is_valid(raise_exception=True)
        user = ser.save()
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


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


# Google OAuth Login (initiate OAuth flow)
class GoogleOAuthLoginView(APIView):
    """Initiate Google OAuth 2.0 authorization code flow."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import urllib.parse
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        redirect_uri = getattr(settings, "GOOGLE_REDIRECT_URI", "")

        if not client_id or not redirect_uri:
            from django.core.exceptions import ImproperlyConfigured
            raise ImproperlyConfigured("Google OAuth credentials not configured.")

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
        auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
        from django.shortcuts import redirect
        return redirect(auth_url)


# Google OAuth Callback (handle authorization code)
class GoogleOAuthCallbackView(APIView):
    """Handle Google OAuth callback with authorization code."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import urllib.request, urllib.parse, json
        code = request.GET.get("code")
        if not code:
            return Response({"detail": "Missing authorization code"}, status=400)

        # Exchange authorization code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": getattr(settings, "GOOGLE_CLIENT_ID", ""),
            "client_secret": getattr(settings, "GOOGLE_CLIENT_SECRET", ""),
            "redirect_uri": getattr(settings, "GOOGLE_REDIRECT_URI", ""),
            "grant_type": "authorization_code",
        }
        req = urllib.request.Request(token_url, data=urllib.parse.urlencode(payload).encode())
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                token_data = json.loads(response.read().decode())
        except Exception:
            return Response({"detail": "Token exchange failed"}, status=400)

        id_token = token_data.get("id_token", "")
        if not id_token:
            return Response({"detail": "No ID token in response"}, status=400)

        # Authenticate using the ID token
        user = authenticate(request, credential=id_token)
        if user is None:
            return Response({"detail": "Google ID token validation failed"}, status=400)

        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        from rest_framework.response import Response
        from .serializers import UserSerializer
        serializer = UserSerializer(user)
        return Response(serializer.data)


# Email Verification Request
class EmailVerificationRequestView(APIView):
    """Send email verification request during registration."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import User, EmailVerificationToken
        from django.utils.crypto import get_random_string
        from django.utils import timezone as dj_timezone
        from django.core.mail import send_mail
        from rest_framework.response import Response

        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save(is_verified=False)

        token = get_random_string(64)
        EmailVerificationToken.objects.create(user=user, token=token,
                                              expires_at=dj_timezone.now() + dj_timezone.timedelta(hours=48))

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        verification_url = f"{frontend_base}/verify-email?token={token}"

        try:
            send_mail(
                subject="Verify your email address",
                message=f"Please click the link to verify your email address: {verification_url}",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@localhost"),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            EmailVerificationToken.objects.filter(user=user).delete()
            return Response({"detail": "Email could not be sent"}, status=500)

        serializer = UserSerializer(user)
        return Response({"detail": "Verification email sent", "user": serializer.data})


# Resend Verification
class ResendVerificationView(APIView):
    """Resend verification email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .models import User, EmailVerificationToken
        from django.utils.crypto import get_random_string
        from django.utils import timezone as dj_timezone

        email = request.data.get("email", "")
        try:
            user = User.objects.get(email__iexact=email, is_verified=False)
        except User.DoesNotExist:
            return Response({"detail": "If an account with that email exists, a verification email has been sent."})

        # Revoke old tokens
        EmailVerificationToken.objects.filter(user=user).delete()

        token = get_random_string(64)
        EmailVerificationToken.objects.create(user=user, token=token,
                                              expires_at=dj_timezone.now() + dj_timezone.timedelta(hours=48))

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        verification_url = f"{frontend_base}/verify-email?token={token}"

        try:
            send_mail(
                subject="Verify your email address",
                message=f"Please click the link to verify your email address: {verification_url}",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@localhost"),
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            EmailVerificationToken.objects.filter(user=user).delete()
            return Response({"detail": "Email could not be sent"}, status=500)

        return Response({"detail": "Verification email sent"})


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


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

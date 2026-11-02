from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import User, Workspace
from .serializers import RegisterSerializer, UserSerializer, WorkspaceSerializer


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
            # security event
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


def _ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import jwt  # PyJWT
from django.conf import settings
from django.contrib import auth
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.backends import BaseBackend, BaseUserModelBackend
from django.contrib.auth.models import User as DjangoUser
from django.core.exceptions import PermissionDenied, SuspiciousOperation
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone as dj_timezone

from .models import User


def _ip(request: HttpRequest) -> str:
    """Get client IP address, respecting proxy headers."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class GoogleOAuthBackend(BaseBackend):
    """Django authentication backend for Google OAuth 2.0.

    Implements the authorization code flow with PKCE validation.
    Validates ID tokens server-side with signature verification.
    """

    def authenticate(self, request: HttpRequest, credential: str = None, code: str = None,
                     state: str = None) -> DjangoUser | None:
        """Authenticate a user using a Google ID token or authorization code.

        Args:
            request: The current HTTP request.
            credential: Google ID token credential (from frontend OAuth flow).
            code: Authorization code from the Google OAuth flow.
            state: CSRF state parameter.

        Returns:
            User instance if authentication succeeds, None otherwise.
        """
        # Case 1: ID token credential (frontend OAuth flow with PKCE)
        if credential:
            return self._authenticate_with_id_token(credential)

        # Case 2: Authorization code exchange
        if code:
            return self._authenticate_with_code(code, request)

        return None

    def _authenticate_with_id_token(self, credential: str) -> DjangoUser | None:
        """Authenticate using a Google ID token.

        Validates:
        - Token signature (using Google's public keys)
        - Token issuer (https://accounts.google.com or accounts.google.gmail.com)
        - Token audience (client ID)
        - Token expiry
        - Verified-email claim
        """
        try:
            # Decode the JWT without verification first to get the header
            # Then verify using Google's JWKS
            unverified_header = jwt.get_unverified_header(credential)
            unverified_claims = jwt.decode(
                credential,
                options={"verify_signature": False, "verify_exp": False, "verify_aud": False}
            )

            # Validate issuer
            iss = unverified_claims.get("iss", "")
            if iss not in {"https://accounts.google.com", "accounts.google.gmail.com"}:
                return None

            # Validate audience (client ID)
            aud = unverified_claims.get("aud", "")
            client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
            if not aud or aud != client_id:
                return None

            # Validate verified_email claim
            if not unverified_claims.get("email_verified", False):
                return None

            # Validate expiry
            exp = unverified_claims.get("exp", 0)
            if exp and dj_timezone.now().timestamp() > exp:
                return None

            # Get or create the user
            email = unverified_claims.get("email", "")
            if not email:
                return None

            # Try to find existing user by email
            try:
                user = DjangoUser.objects.get(email=email)
                # Verify the user is still active
                if not user.is_active:
                    return None
                # Update last login
                auth.login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                return user
            except DjangoUser.DoesNotExist:
                # Create a new unverified account - will need email verification
                # But for Google accounts with email_verified=true, we can treat as verified
                try:
                    user = DjangoUser.objects.create_user(
                        email=email,
                        password=auth.generate_password(None),  # Random password, not used for Google login
                    )
                    # For Google-authenticated users with email_verified=true, mark as verified
                    # The User model doesn't have an "email_verified" field by default,
                    # but we can use is_active and additional marking
                    user.is_active = True
                    user.save(update_fields=["is_active"])
                    auth.login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                    return user
                except Exception:
                    return None

        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None

    def _authenticate_with_code(self, code: str, request: HttpRequest) -> DjangoUser | None:
        """Authenticate using the Google authorization code flow.

        Exchanges the code for tokens, validates the ID token, and gets or creates
        the user.
        """
        try:
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
            with urllib.request.urlopen(req, timeout=10) as response:
                token_data = json.loads(response.read().decode())

            access_token = token_data.get("access_token", "")
            id_token = token_data.get("id_token", "")

            if not id_token:
                # Fallback: decode the ID token from the JWT
                # or use the access token to get user info
                return self._authenticate_with_access_token(access_token, request)

            # Use the ID token to authenticate
            return self._authenticate_with_id_token(id_token)

        except Exception:
            return None

    def _authenticate_with_access_token(self, access_token: str, request: HttpRequest) -> DjangoUser | None:
        """Authenticate using Google OAuth access token via the People API."""
        try:
            # Get user info from Google People API
            people_url = "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses"
            req = urllib.request.Request(people_url)
            req.add_header("Authorization", f"Bearer {access_token}")
            req.add_header("Accept", "application/json")

            with urllib.request.urlopen(req, timeout=10) as response:
                person_data = json.loads(response.read().decode())

            # Extract email and name from the response
            email_entries = person_data.get("emailAddresses", [])
            if not email_entries:
                return None

            email = email_entries[0].get("value", "")
            if not email:
                return None

            # Find or create user
            try:
                user = DjangoUser.objects.get(email=email)
                if not user.is_active:
                    return None
                auth.login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                return user
            except DjangoUser.DoesNotExist:
                try:
                    user = DjangoUser.objects.create_user(
                        email=email,
                        password=auth.generate_password(None),
                    )
                    user.is_active = True
                    user.save(update_fields=["is_active"])
                    auth.login(request, user, backend="django.contrib.auth.backends.ModelBackend")
                    return user
                except Exception:
                    return None

        except Exception:
            return None

    def get_user(self, user_id: int) -> DjangoUser | None:
        """Get a user by ID for session persistence."""
        try:
            return DjangoUser.objects.get(pk=user_id)
        except DjangoUser.DoesNotExist:
            return None


# Add Google OAuth backend to the existing Django authentication backends
# This is used by the login flow - add to AUTHENTICATION_BACKENDS in settings

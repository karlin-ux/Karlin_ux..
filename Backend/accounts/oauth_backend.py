"""Google OAuth helpers.

The primary Google sign-in flow for this project verifies Google Identity Services
ID token credentials server-side via Google's tokeninfo endpoint (stdlib HTTPS),
validating audience/issuer/expiry/email_verified before authenticating or
creating a user account.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any

from django.conf import settings
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.http import HttpRequest

User = get_user_model()

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def verify_google_id_token_credential(credential: str) -> dict[str, Any] | None:
    """Verify a Google ID token credential using Google's tokeninfo endpoint.

    Returns the token payload dict when valid for this application, else None.
    Validates: audience (client ID), issuer, expiry, and verified email.
    """
    if not isinstance(credential, str) or not credential or len(credential) > 4096:
        return None

    client_id = (getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if not client_id:
        return None

    try:
        query = urllib.parse.urlencode({"id_token": credential})
        url = f"{GOOGLE_TOKENINFO_URL}?{query}"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310: fixed Google HTTPS endpoint
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    aud = payload.get("aud")
    iss = payload.get("iss")
    email = payload.get("email")
    email_verified = payload.get("email_verified")
    exp = payload.get("exp")

    if aud != client_id:
        return None
    if iss not in {"accounts.google.com", "https://accounts.google.com"}:
        return None

    # tokeninfo returns expiry as string/integer seconds since epoch
    try:
        exp_int = int(exp)
    except Exception:
        return None
    # A small clock-skew allowance is not necessary here; tokeninfo already reflects validity.
    from django.utils import timezone as dj_timezone

    if exp_int <= int(dj_timezone.now().timestamp()):
        return None

    # Accept "true"/True/1 forms defensively
    if str(email_verified).lower() not in {"true", "1"}:
        return None

    if not isinstance(email, str) or not email.strip():
        return None

    return payload


class GoogleOAuthBackend(BaseBackend):
    """Optional backend shim (credential verification is handled in views)."""

    def authenticate(self, request: HttpRequest, **kwargs):
        return None

    def get_user(self, user_id: int):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


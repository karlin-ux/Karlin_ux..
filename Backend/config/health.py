"""
Health check views for Karlin_ux.

Provides:
- Liveness check: /api/health/ (no auth, minimal, no DB query)
- Readiness check: /api/health/ready/ (no auth, checks DB connectivity)
"""
import uuid

from django.db import connection
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods


def liveness(request):
    """
    Liveness probe: is the application process running?

    Returns 200 OK with minimal payload. No database query.
    Safe for public access — no sensitive information.
    """
    return JsonResponse({"status": "ok"}, status=200)


def readiness(request):
    """
    Readiness probe: can the application serve requests?

    Verifies database connectivity with a short timeout.
    Returns 200 if ready, 503 if not.
    No sensitive information exposed.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return JsonResponse({"status": "ready"}, status=200)
    except Exception:
        return JsonResponse({"status": "not_ready"}, status=503)
"""
Request correlation ID middleware for Karlin_ux.

Adds a unique request ID to each request for log correlation.
Reads X-Request-ID from incoming request or generates a new UUID.
Adds X-Request-ID to the response headers.
"""
import uuid
import logging

from .log_filter import set_request_id

logger = logging.getLogger("django.request")


class RequestIDMiddleware:
    """Middleware that adds a correlation ID to each request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Read from incoming header or generate new
        request_id = request.META.get("HTTP_X_REQUEST_ID")
        if not request_id:
            request_id = uuid.uuid4().hex
        request.request_id = request_id
        set_request_id(request_id)

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response
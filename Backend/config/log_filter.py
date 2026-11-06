"""
Request ID filter for structured logging.

Adds the request ID (from RequestIDMiddleware) to log records.
"""
import threading

_request_id_local = threading.local()


def set_request_id(request_id):
    """Set the current request ID for logging."""
    _request_id_local.id = request_id


def get_request_id():
    """Get the current request ID."""
    return getattr(_request_id_local, "id", "-")


class RequestIDFilter:
    """Logging filter that adds request_id to log records."""

    def filter(self, record):
        record.request_id = get_request_id()
        return True
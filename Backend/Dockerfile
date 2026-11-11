# syntax=docker/dockerfile:1
# Multi-stage build for the Karlin_ux backend.
#
# Stage 1 builds Python dependencies in an isolated layer. The compiler
# toolchain never ships in the runtime image.
FROM python:3.12-slim-trixie AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build-only dependencies (psycopg[binary] and Pillow ship wheels, but the
# toolchain is kept here so source builds still work on other architectures).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: minimal runtime image
FROM python:3.12-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Apply Debian security updates available for the base image.
# psycopg[binary] bundles libpq, so libpq5/gosu are not installed here.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from the builder
COPY --from=builder /install /usr/local

# Create the runtime user before copying code so ownership is set in one layer.
RUN useradd -m -u 1001 appuser \
    && mkdir -p /app/staticfiles /app/uploads \
    && chown -R appuser:appuser /app

COPY --chown=appuser:appuser . .

# pip is a build-time tool and is not needed to run the application.
RUN rm -rf /usr/local/lib/python3.12/site-packages/pip \
           /usr/local/lib/python3.12/site-packages/pip-* \
           /usr/local/bin/pip /usr/local/bin/pip3 /usr/local/bin/pip3.12

# Never run the application as root.
USER appuser

EXPOSE 8000

# Health check (Django liveness endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/', timeout=5)" || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "30", "--graceful-timeout", "10"]

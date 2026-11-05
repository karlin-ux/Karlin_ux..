#!/bin/sh
set -e

# If running as root, fix volume permissions and drop to appuser
if [ "$(id -u)" = "0" ]; then
    chown -R appuser:appuser /app/uploads /app/staticfiles 2>/dev/null || true
    exec gosu appuser "$@"
fi

# Graceful shutdown handler
trap 'echo "Shutting down gracefully..."; exit 0' TERM INT

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "Running database migrations..."
  python manage.py migrate --noinput
fi

if [ "${COLLECT_STATIC}" = "true" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

if [ "${SEED_SHOWCASE}" = "true" ]; then
  echo "Seeding showcase data..."
  python manage.py seed_showcase || true
fi

echo "Starting application..."
exec "$@"
#!/bin/sh
set -e

# The container runs as the non-root appuser (see Dockerfile). Named volumes
# inherit ownership from the image directories, so no privilege drop is needed.

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

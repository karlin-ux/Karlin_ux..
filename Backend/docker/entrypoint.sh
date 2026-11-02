#!/bin/sh
set -e
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  python manage.py migrate --noinput
fi
if [ "${COLLECT_STATIC}" = "true" ]; then
  python manage.py collectstatic --noinput
fi
if [ "${SEED_SHOWCASE}" = "true" ]; then
  python manage.py seed_showcase || true
fi
exec "$@"

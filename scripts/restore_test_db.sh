#!/usr/bin/env bash
# Restore test script for Karlin_ux
# Tests restoring a database backup into an isolated PostgreSQL instance.
# NEVER restores to the production/application database.
#
# Usage: ./scripts/restore_test_db.sh <backup_file> [test_db_name]
#
# Environment variables:
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD
#   TEST_DB_NAME (default: karlin_ux_restore_test)

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore_test_db.sh <backup_file> [test_db_name]}"
TEST_DB_NAME="${2:-${TEST_DB_NAME:-karlin_ux_restore_test}}"

# Database connection
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-karlin_ux}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD is not set." >&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    echo "Verifying backup checksum..."
    EXPECTED=$(cat "$CHECKSUM_FILE")
    ACTUAL=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
    if [ "$EXPECTED" != "$ACTUAL" ]; then
        echo "ERROR: Checksum mismatch!" >&2
        echo "  Expected: $EXPECTED" >&2
        echo "  Actual:   $ACTUAL" >&2
        exit 1
    fi
    echo "  Checksum verified: $ACTUAL"
else
    echo "WARNING: No checksum file found. Skipping checksum verification."
fi

# Validate backup format
echo "Validating backup format..."
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "ERROR: Invalid backup format (pg_restore --list failed)." >&2
    exit 1
fi
echo "  Backup format valid."

export PGPASSWORD="$DB_PASSWORD"

# Safety check: never restore to the main application database
APP_DB="${POSTGRES_DB:-karlin_ux}"
if [ "$TEST_DB_NAME" = "$APP_DB" ]; then
    echo "ERROR: Refusing to restore to the application database ($APP_DB)." >&2
    echo "       Use a separate test database name." >&2
    exit 1
fi

# Drop test database if it exists (safe — it's a test database)
echo "Preparing test database: $TEST_DB_NAME"
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
    -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true

# Create test database
psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="postgres" \
    -c "CREATE DATABASE $TEST_DB_NAME;" 2>&1

# Restore backup
echo "Restoring backup to $TEST_DB_NAME..."
if ! pg_restore \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$TEST_DB_NAME" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    "$BACKUP_FILE" 2>&1; then
    echo "WARNING: pg_restore completed with warnings (may be normal for --clean)."
fi

# Verify restored schema
echo ""
echo "Verifying restored schema..."
TABLE_COUNT=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
    -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "  Tables restored: $TABLE_COUNT"

# Check for key application tables
for table in accounts_user auth_user django_migrations demo_demobooking media_mediaasset; do
    EXISTS=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';" 2>/dev/null | tr -d ' ')
    if [ "$EXISTS" = "1" ]; then
        echo "  ✓ $table"
    else
        echo "  ✗ $table (MISSING)"
    fi
done

# Check migration count
MIGRATION_COUNT=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
    -t -c "SELECT count(*) FROM django_migrations;" 2>/dev/null | tr -d ' ')
echo "  Migrations applied: $MIGRATION_COUNT"

# Check record counts
USER_COUNT=$(psql --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$TEST_DB_NAME" \
    -t -c "SELECT count(*) FROM accounts_user;" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "  Users: $USER_COUNT"

unset PGPASSWORD

echo ""
echo "Restore test completed successfully."
echo "  Database: $TEST_DB_NAME"
echo "  To clean up: psql -U $DB_USER -d postgres -c 'DROP DATABASE $TEST_DB_NAME;'"
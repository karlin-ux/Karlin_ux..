#!/usr/bin/env bash
# PostgreSQL backup script for Karlin_ux
# Usage: ./scripts/backup_db.sh [backup_dir]
#
# Environment variables (from .env or docker-compose):
#   POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT
#   BACKUP_DIR (default: ./backups/db)
#   BACKUP_RETENTION (default: 7)

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-${1:-./backups/db}}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/karlin_ux_db_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# Database connection (from environment)
DB_NAME="${POSTGRES_DB:-karlin_ux}"
DB_USER="${POSTGRES_USER:-karlin_ux}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# Validate password is set
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD is not set." >&2
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if backup file already exists (shouldn't, but safety check)
if [ -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file already exists: $BACKUP_FILE" >&2
    exit 1
fi

echo "Starting PostgreSQL backup..."
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Output: $BACKUP_FILE"

# Run pg_dump with custom format (compressed, restorable)
# PGPASSWORD is set via environment to avoid password in process list
export PGPASSWORD="$DB_PASSWORD"
if ! pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$BACKUP_FILE"; then
    echo "ERROR: pg_dump failed." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi
unset PGPASSWORD

# Verify backup integrity with pg_restore --list
echo "Verifying backup integrity..."
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "ERROR: Backup verification failed (pg_restore --list)." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Generate SHA-256 checksum
echo "Generating checksum..."
sha256sum "$BACKUP_FILE" | awk '{print $1}' > "$CHECKSUM_FILE"

# Report success
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup completed successfully."
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Checksum: $(cat "$CHECKSUM_FILE")"
echo "  Tables: $(pg_restore --list "$BACKUP_FILE" 2>/dev/null | grep -c 'TABLE DATA' || echo 'N/A')"
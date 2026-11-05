#!/usr/bin/env bash
# Media backup script for Karlin_ux
# Usage: ./scripts/backup_media.sh [backup_dir]
#
# Environment variables:
#   MEDIA_ROOT (default: Backend/uploads)
#   BACKUP_DIR (default: ./backups/media)

set -euo pipefail

# Configuration
MEDIA_ROOT="${MEDIA_ROOT:-${1:-Backend/uploads}}"
BACKUP_DIR="${BACKUP_DIR:-./backups/media}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/karlin_ux_media_${TIMESTAMP}.tar.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

# Validate media root exists
if [ ! -d "$MEDIA_ROOT" ]; then
    echo "ERROR: Media root does not exist: $MEDIA_ROOT" >&2
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if backup file already exists
if [ -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file already exists: $BACKUP_FILE" >&2
    exit 1
fi

echo "Starting media backup..."
echo "  Source: $MEDIA_ROOT"
echo "  Output: $BACKUP_FILE"

# Count files before backup
FILE_COUNT=$(find "$MEDIA_ROOT" -type f | wc -l)
echo "  Files to back up: $FILE_COUNT"

# Create tar.gz archive preserving directory structure and permissions
# Exclude temporary files and __pycache__
if ! tar -czf "$BACKUP_FILE" \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --exclude='__pycache__' \
    --exclude='.DS_Store' \
    -C "$(dirname "$MEDIA_ROOT")" \
    "$(basename "$MEDIA_ROOT")"; then
    echo "ERROR: tar backup failed." >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Generate SHA-256 checksum
echo "Generating checksum..."
sha256sum "$BACKUP_FILE" | awk '{print $1}' > "$CHECKSUM_FILE"

# Verify backup can be read
echo "Verifying backup integrity..."
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "ERROR: Backup verification failed (tar -tzf)." >&2
    rm -f "$BACKUP_FILE" "$CHECKSUM_FILE"
    exit 1
fi

# Report success
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
ARCHIVED_FILES=$(tar -tzf "$BACKUP_FILE" | grep -v '/$' | wc -l)
echo "Backup completed successfully."
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Files archived: $ARCHIVED_FILES"
echo "  Checksum: $(cat "$CHECKSUM_FILE")"
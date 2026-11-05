#!/usr/bin/env bash
# Media restore test script for Karlin_ux
# Tests restoring a media backup into an isolated directory.
# NEVER overwrites the existing media volume.
#
# Usage: ./scripts/restore_test_media.sh <backup_file> [restore_dir]

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore_test_media.sh <backup_file> [restore_dir]}"
RESTORE_DIR="${2:-/tmp/karlin_media_restore_test}"

# Validate backup file
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
        exit 1
    fi
    echo "  Checksum verified."
fi

# Verify backup can be read
echo "Verifying backup archive..."
if ! tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "ERROR: Cannot read backup archive." >&2
    exit 1
fi
echo "  Archive readable."

# Safety: never restore to the actual media directory
MEDIA_ROOT="${MEDIA_ROOT:-Backend/uploads}"
REAL_MEDIA=$(realpath "$MEDIA_ROOT" 2>/dev/null || echo "$MEDIA_ROOT")
REAL_RESTORE=$(realpath -m "$RESTORE_DIR" 2>/dev/null || echo "$RESTORE_DIR")
if [ "$REAL_RESTORE" = "$REAL_MEDIA" ]; then
    echo "ERROR: Refusing to restore to the actual media directory." >&2
    exit 1
fi

# Clean and create restore directory
echo "Restoring to isolated directory: $RESTORE_DIR"
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"

# Extract backup
echo "Extracting backup..."
if ! tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"; then
    echo "ERROR: Extraction failed." >&2
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Verify restored structure
echo ""
echo "Verifying restored structure..."
RESTORED_FILES=$(find "$RESTORE_DIR" -type f | wc -l)
echo "  Files restored: $RESTORED_FILES"

# Check for expected directory structure
if [ -d "$RESTORE_DIR/uploads" ] || [ -d "$RESTORE_DIR/$(basename "$MEDIA_ROOT")" ]; then
    echo "  ✓ Expected directory structure present"
else
    # Check if files were extracted directly
    if [ "$RESTORED_FILES" -gt 0 ]; then
        echo "  ✓ Files extracted (structure may vary)"
    else
        echo "  ✗ No files found in restored backup"
        exit 1
    fi
fi

# Verify file permissions
echo ""
echo "Sample restored files:"
find "$RESTORE_DIR" -type f | head -5 | while read -r f; do
    echo "  $(basename "$f") ($(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null) bytes)"
done

echo ""
echo "Media restore test completed successfully."
echo "  Restored to: $RESTORE_DIR"
echo "  To clean up: rm -rf $RESTORE_DIR"
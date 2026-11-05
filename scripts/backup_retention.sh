#!/usr/bin/env bash
# Backup retention script for Karlin_ux
# Usage: ./scripts/backup_retention.sh [backup_dir] [--dry-run]
#
# Removes old backups beyond the retention count.
# Only removes files matching the expected backup naming pattern.

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-${1:-./backups}}"
RETENTION_COUNT="${BACKUP_RETENTION:-7}"
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        *) BACKUP_DIR="$arg" ;;
    esac
done

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory does not exist: $BACKUP_DIR"
    exit 0
fi

echo "Backup retention: keeping $RETENTION_COUNT most recent backups per type."
echo "Directory: $BACKUP_DIR"
if [ "$DRY_RUN" = true ]; then
    echo "Mode: DRY RUN (no files will be deleted)"
fi

# Process database backups
for pattern in "karlin_ux_db_*.dump" "karlin_ux_media_*.tar.gz"; do
    # Find matching files, sorted by modification time (newest first)
    mapfile -t files < <(find "$BACKUP_DIR" -maxdepth 2 -type f -name "$pattern" -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)

    total=${#files[@]}
    if [ "$total" -le "$RETENTION_COUNT" ]; then
        echo "  $pattern: $total files (within retention, no cleanup needed)"
        continue
    fi

    to_delete=$((total - RETENTION_COUNT))
    echo "  $pattern: $total files, removing $to_delete oldest"

    # Delete oldest files (skip the most recent RETENTION_COUNT)
    for ((i=RETENTION_COUNT; i<total; i++)); do
        file="${files[$i]}"
        checksum="${file}.sha256"
        if [ "$DRY_RUN" = true ]; then
            echo "    [DRY RUN] Would delete: $file"
            [ -f "$checksum" ] && echo "    [DRY RUN] Would delete: $checksum"
        else
            echo "    Deleting: $file"
            rm -f "$file"
            if [ -f "$checksum" ]; then
                echo "    Deleting: $checksum"
                rm -f "$checksum"
            fi
        fi
    done
done

echo "Retention cleanup complete."
# Backup and Disaster Recovery

## Overview

Karlin_ux uses PostgreSQL for its database and local filesystem storage for media uploads.
This document describes the backup and recovery procedures.

## Recovery Point Objective (RPO) and Recovery Time Objective (RTO)

- **RPO**: Depends on backup frequency. With hourly database backups, maximum data loss is 1 hour.
- **RTO**: Depends on backup size and restore speed. Typical restore: 5-30 minutes.
- These are estimates, not guarantees. Actual values depend on infrastructure.

## Backup Architecture

### Database Backup
- Tool: `pg_dump` with custom format (`--format=custom`)
- Compression: Level 9
- Output: `.dump` file + `.sha256` checksum
- Verification: `pg_restore --list`

### Media Backup
- Tool: `tar` with gzip compression
- Output: `.tar.gz` file + `.sha256` checksum
- Verification: `tar -tzf`

### Backup Location
- Default: `./backups/db/` and `./backups/media/`
- Configurable via `BACKUP_DIR` environment variable
- **Never** store backups inside the database data directory or media volume

## Creating Backups

### Database Backup

```bash
# Using local PostgreSQL
POSTGRES_HOST=localhost POSTGRES_PORT=5432 POSTGRES_PASSWORD=yourpassword \
  ./scripts/backup_db.sh ./backups/db

# Using Docker Compose
docker compose exec db pg_dump -U karlin_ux -d karlin_ux -Fc > backup.dump
```

### Media Backup

```bash
./scripts/backup_media.sh ./backups/media
```

### Both Together (recommended for consistency)

```bash
# 1. Create database backup
./scripts/backup_db.sh ./backups/db

# 2. Create media backup immediately after
./scripts/backup_media.sh ./backups/media
```

**Note**: Database and media backups may represent slightly different points in time if uploads occur during backup. To minimize this risk, schedule backups during low-traffic periods or use a brief maintenance window.

## Backup Integrity Verification

### Database

```bash
# Verify checksum
sha256sum -c backups/db/karlin_ux_db_*.dump.sha256

# Verify backup can be read
pg_restore --list backups/db/karlin_ux_db_*.dump

# Full restore test (isolated)
./scripts/restore_test_db.sh backups/db/karlin_ux_db_*.dump
```

### Media

```bash
# Verify checksum
sha256sum -c backups/media/karlin_ux_media_*.tar.gz.sha256

# Verify archive can be read
tar -tzf backups/media/karlin_ux_media_*.tar.gz | head

# Full restore test (isolated)
./scripts/restore_test_media.sh backups/media/karlin_ux_media_*.tar.gz
```

## Backup Retention

```bash
# Dry run (show what would be deleted)
BACKUP_RETENTION=7 ./scripts/backup_retention.sh ./backups --dry-run

# Actually remove old backups (keep 7 most recent per type)
BACKUP_RETENTION=7 ./scripts/backup_retention.sh ./backups
```

**Default retention**: 7 backups per type (database and media separately).

**Recommendation**: Run retention cleanup daily via cron or systemd timer.

## Restore Procedures

### Database Restore (Isolated Test)

```bash
# Test restore into a separate database (never touches production)
./scripts/restore_test_db.sh backups/db/karlin_ux_db_YYYYMMDD_HHMMSS.dump

# Verify restored tables
psql -U karlin_ux -d karlin_ux_restore_test -c "SELECT count(*) FROM accounts_user;"
```

### Media Restore (Isolated Test)

```bash
# Test restore into a separate directory
./scripts/restore_test_media.sh backups/media/karlin_ux_media_YYYYMMDD_HHMMSS.tar.gz /tmp/restore_test

# Verify restored files
find /tmp/restore_test -type f | head
```

### Full Recovery (After Data Loss)

#### Database Recovery

1. Stop the application: `docker compose down` (or stop the web service)
2. Create a new empty database or drop the corrupted one:
   ```bash
   docker compose exec db psql -U karlin_ux -d postgres -c "DROP DATABASE IF EXISTS karlin_ux;"
   docker compose exec db psql -U karlin_ux -d postgres -c "CREATE DATABASE karlin_ux;"
   ```
3. Restore from backup:
   ```bash
   docker compose exec db pg_restore -U karlin_ux -d karlin_ux /path/to/backup.dump
   ```
4. Verify migrations: `docker compose exec web python manage.py migrate --noinput`
5. Restart: `docker compose up -d`

#### Media Recovery

1. Stop the application: `docker compose down`
2. Extract backup to the media volume:
   ```bash
   docker run --rm -v karlin_uploads:/target -v $(pwd)/backups/media:/source alpine \
     sh -c "cd /target && tar -xzf /source/karlin_ux_media_*.tar.gz --strip-components=1"
   ```
3. Restart: `docker compose up -d`

#### Combined Recovery

1. Restore database first (it contains metadata about media files)
2. Restore media second (files referenced by database records)
3. Verify: `docker compose exec web python manage.py check`
4. Test login and file access

## Backup Frequency Recommendations

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| Database | Hourly (during business hours) or daily | 7-30 backups |
| Media | Daily | 7-30 backups |
| Full system | Weekly | 4 backups |

## Known Limitations

1. **Point-in-time consistency**: Database and media backups may not be perfectly synchronized if uploads occur during backup. Schedule backups during low-traffic periods.
2. **No automated backup scheduling**: Backup scripts must be invoked manually or via cron/systemd. No built-in scheduler is provided.
3. **No external storage**: Backups are stored locally. For disaster recovery, copy backups to an external location (USB drive, cloud storage, etc.).
4. **No encryption**: Backup files are not encrypted. Store them in a secure location.
5. **No incremental backups**: Each backup is a full snapshot. For large databases, consider implementing incremental backups.
6. **PostgreSQL version compatibility**: Restores require the same or compatible PostgreSQL version.
7. **No automated testing in CI**: Restore tests must be run manually.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `karlin_ux` |
| `POSTGRES_USER` | Database user | `karlin_ux` |
| `POSTGRES_PASSWORD` | Database password | (required) |
| `POSTGRES_HOST` | Database host | `localhost` |
| `POSTGRES_PORT` | Database port | `5432` |
| `MEDIA_ROOT` | Media files directory | `Backend/uploads` |
| `BACKUP_DIR` | Backup output directory | `./backups` |
| `BACKUP_RETENTION` | Number of backups to keep | `7` |

## Security Notes

- Never commit backup files to Git (they are in `.gitignore`)
- Never store passwords in backup scripts
- Use environment variables for credentials
- Restrict access to backup files (they contain user data)
- Test restores regularly in isolated environments
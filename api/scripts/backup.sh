#!/usr/bin/env bash
# DLR Platform — Database & File Backup
# Run manually or via cron (the app also triggers this nightly via the scheduler).
#
# Usage:
#   ./scripts/backup.sh
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh
#
# Required env vars (read from .env if present):
#   DATABASE_URL — postgres connection string
#
# Optional env vars:
#   BACKUP_DIR       — where to store backups (default: ./backups)
#   BACKUP_RETAIN_DAYS — how many days to keep (default: 30)
#   UPLOADS_DIR      — path to uploaded files   (default: ./uploads)

set -euo pipefail

# Load .env if present
if [ -f "$(dirname "$0")/../.env" ]; then
  set -a && source "$(dirname "$0")/../.env" && set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
UPLOADS_DIR="${UPLOADS_DIR:-$(dirname "$0")/../uploads}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

# ── Database ─────────────────────────────────────────────────────────────────
echo "[backup] Dumping database..."
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL not set. Skipping database backup."
else
  DB_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
  pg_dump "$DATABASE_URL" | gzip > "$DB_FILE"
  echo "[backup] Database saved to: $DB_FILE ($(du -sh "$DB_FILE" | cut -f1))"
fi

# ── Uploaded files ────────────────────────────────────────────────────────────
echo "[backup] Archiving uploaded files..."
if [ -d "$UPLOADS_DIR" ]; then
  FILES_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
  tar -czf "$FILES_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
  echo "[backup] Uploads saved to: $FILES_FILE ($(du -sh "$FILES_FILE" | cut -f1))"
else
  echo "[backup] Uploads directory not found, skipping."
fi

# ── Retention: delete backups older than RETAIN_DAYS ─────────────────────────
echo "[backup] Removing backups older than ${RETAIN_DAYS} days..."
find "$BACKUP_DIR" -maxdepth 1 -name "*.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[backup] Done. Backups in: $BACKUP_DIR"

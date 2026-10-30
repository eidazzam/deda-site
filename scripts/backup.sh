#!/usr/bin/env bash
#
# Weekly Postgres dump. Add to root crontab on the VPS:
#
#   0 3 * * 0 /opt/deda/repo/scripts/backup.sh >> /var/log/deda-backup.log 2>&1
#
# Keeps the last 8 weeks worth (~2 months). Older dumps are pruned.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/deda/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-60}"

mkdir -p "$BACKUP_DIR"

# shellcheck disable=SC1091
. "$REPO_DIR/.env"

STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/deda_${STAMP}.sql.gz"

echo "→ Dumping ${POSTGRES_DB} → ${OUT}"
docker compose --project-directory "$REPO_DIR" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$OUT"

# Also tar the uploads directory once a week — small enough to keep with
# the dump, and it means a restore brings catalog + images together.
UPLOADS_OUT="$BACKUP_DIR/uploads_${STAMP}.tar.gz"
echo "→ Archiving uploads → ${UPLOADS_OUT}"
tar -czf "$UPLOADS_OUT" -C /opt/deda uploads

echo "→ Pruning files older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -type f \( -name 'deda_*.sql.gz' -o -name 'uploads_*.tar.gz' \) \
  -mtime "+${RETENTION_DAYS}" -print -delete

echo "→ Done."
ls -lh "$BACKUP_DIR" | tail -10

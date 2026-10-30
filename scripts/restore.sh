#!/usr/bin/env bash
#
# Restore a Postgres dump produced by backup.sh.
# Usage:  bash scripts/restore.sh /opt/deda/backups/deda_2026-05-22_0300.sql.gz
#
# This wipes the current database and replaces it with the dump.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="${1:-}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "Usage: $0 <path-to-dump.sql.gz>" >&2
  exit 1
fi

# shellcheck disable=SC1091
. "$REPO_DIR/.env"

read -r -p "About to restore $DUMP into $POSTGRES_DB. This wipes current data. Continue? [y/N] " confirm
case "$confirm" in
  y|Y|yes|YES) ;;
  *) echo "Cancelled."; exit 1;;
esac

echo "→ Restoring…"
gunzip -c "$DUMP" | docker compose --project-directory "$REPO_DIR" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "→ Done. Restart the api so Prisma reconnects:"
echo "    docker compose --project-directory $REPO_DIR restart api"

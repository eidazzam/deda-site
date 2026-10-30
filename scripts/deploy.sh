#!/usr/bin/env bash
#
# Pull the latest main, rebuild the images, run any pending Prisma
# migrations, and roll the containers. Run from /opt/deda/repo on
# the VPS — `bash scripts/deploy.sh`.
#
# Idempotent: re-running just no-ops the unchanged bits.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found in $REPO_DIR. Copy .env.production.example to .env and fill it in first." >&2
  exit 1
fi

echo "→ Pulling latest main…"
git pull --ff-only origin main

echo "→ Building images…"
docker compose build api web

echo "→ Starting postgres (if not already up)…"
docker compose up -d postgres

echo "→ Waiting for postgres to be healthy…"
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-deda}" >/dev/null 2>&1; then
    echo "  postgres is ready."
    break
  fi
  sleep 1
done

echo "→ Running Prisma migrations…"
docker compose run --rm api npx prisma migrate deploy

# Seed only on the very first deploy. The marker file lives on the host
# so a container rebuild doesn't re-seed and clobber real data.
if [ ! -f "$REPO_DIR/.seeded" ]; then
  echo "→ First deploy detected — seeding catalog…"
  # Use the compiled seed in the production image — tsx is a devDep
  # and gets pruned out, so we can't `npm run seed` (which runs tsx).
  docker compose run --rm api npm run seed:prod
  touch "$REPO_DIR/.seeded"
fi

echo "→ Rolling api + web…"
docker compose up -d api web

echo "→ Pruning unused images…"
docker image prune -f >/dev/null

echo ""
echo "Done. Containers:"
docker compose ps

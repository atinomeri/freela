#!/bin/sh
set -eu

UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
PORT_VALUE="${PORT:-3000}"
export UPLOADS_DIR

mkdir -p "$UPLOADS_DIR"
chown -R nodejs:nodejs "$UPLOADS_DIR"

# Run database migrations
echo "==> Starting database migrations..."
START_MIGRATION=$(date +%s)
if gosu nodejs npx prisma migrate deploy --config=./prisma.config.ts; then
  END_MIGRATION=$(date +%s)
  echo "==> Migrations completed in $((END_MIGRATION - START_MIGRATION))s"
else
  echo "==> ERROR: Migration failed. Check database connectivity and migration files."
  exit 1
fi

exec gosu nodejs npm start -- -H 0.0.0.0 -p "$PORT_VALUE"

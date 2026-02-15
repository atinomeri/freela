#!/bin/sh
set -eu

UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
PORT_VALUE="${PORT:-3000}"
export UPLOADS_DIR

mkdir -p "$UPLOADS_DIR"
chown -R nodejs:nodejs "$UPLOADS_DIR"

# Run database migrations
echo "Running database migrations..."
gosu nodejs npx prisma migrate deploy || echo "Migration warning (may already be up-to-date)"

exec gosu nodejs npm start -- -H 0.0.0.0 -p "$PORT_VALUE"

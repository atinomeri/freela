#!/bin/sh
set -eu

UPLOADS_DIR="${UPLOADS_DIR:-/data/uploads}"
PORT_VALUE="${PORT:-3000}"

mkdir -p "$UPLOADS_DIR"
chown -R nodejs:nodejs "$UPLOADS_DIR"

exec gosu nodejs npm start -- -H 0.0.0.0 -p "$PORT_VALUE"

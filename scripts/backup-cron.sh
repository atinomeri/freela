#!/bin/bash
# Automated Database Backup Script for Freela
# Deploy to VPS and add to crontab
# crontab -e: 0 3 * * * /root/freela/scripts/backup-cron.sh >> /var/log/freela-backup.log 2>&1

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/root/backups/freela}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MAX_BACKUPS="${MAX_BACKUPS:-60}"
NOTIFY_WEBHOOK="${NOTIFY_WEBHOOK:-}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PATH="${S3_PATH:-freela-backups}"

# Load environment from .env file if exists
if [ -f /root/freela/.env ]; then
  export $(grep -v '^#' /root/freela/.env | xargs)
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp for backup file
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/freela_$TIMESTAMP.dump"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

echo "================================"
echo "Freela Backup - $(date)"
echo "================================"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

# Extract database connection info for pg_dump
# Parse: postgresql://user:pass@host:port/dbname
if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_PASS="${BASH_REMATCH[2]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
  DB_NAME="${BASH_REMATCH[5]}"
else
  echo "ERROR: Could not parse DATABASE_URL"
  exit 1
fi

# Run pg_dump
echo "Starting backup..."
START_TIME=$(date +%s)

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="$BACKUP_FILE"

# Compress backup
echo "Compressing..."
gzip "$BACKUP_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)

echo "Backup completed: $BACKUP_FILE_GZ"
echo "Size: $BACKUP_SIZE"
echo "Duration: ${DURATION}s"

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE_GZ" "s3://$S3_BUCKET/$S3_PATH/$(basename $BACKUP_FILE_GZ)"
  echo "S3 upload complete"
fi

# Cleanup old backups (local)
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "freela_*.dump.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# Also limit by count (keep at most MAX_BACKUPS)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/freela_*.dump.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
  ls -1t "$BACKUP_DIR"/freela_*.dump.gz | tail -n $DELETE_COUNT | xargs rm -f
  echo "Removed $DELETE_COUNT old backups"
fi

# Cleanup old S3 backups (if configured)
if [ -n "$S3_BUCKET" ]; then
  # Delete S3 objects older than retention period
  aws s3 ls "s3://$S3_BUCKET/$S3_PATH/" --recursive | \
    awk -v date="$(date -d "-$RETENTION_DAYS days" +%Y-%m-%d)" '$1 < date {print $4}' | \
    xargs -I {} aws s3 rm "s3://$S3_BUCKET/{}" 2>/dev/null || true
fi

# Send notification webhook (if configured)
if [ -n "$NOTIFY_WEBHOOK" ]; then
  PAYLOAD=$(cat <<EOF
{
  "text": "✅ Freela backup completed",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Freela Database Backup*\n• File: \`$(basename $BACKUP_FILE_GZ)\`\n• Size: $BACKUP_SIZE\n• Duration: ${DURATION}s\n• Time: $(date)"
      }
    }
  ]
}
EOF
)
  curl -s -X POST -H 'Content-type: application/json' \
    --data "$PAYLOAD" \
    "$NOTIFY_WEBHOOK" > /dev/null
fi

echo "Backup job finished at $(date)"
echo ""

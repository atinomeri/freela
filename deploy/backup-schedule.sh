#!/bin/bash

# Production database backup script
# Usage: ./backup-schedule.sh [--daily|--weekly|--hourly]
# Recommended: Add to crontab for automated backups

set -e

BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_DIR=${BACKUP_DIR:-/data/backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/freela_db_$TIMESTAMP.sql.gz"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"
}

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log "Starting database backup..."

# Docker-based backup (uses POSTGRES_* env vars from docker-compose)
if command -v docker &> /dev/null && docker compose ps &> /dev/null; then
  log "Using Docker Compose for backup..."
  
  # Check if database is running
  if ! docker compose ps db | grep -q "Up"; then
    log "ERROR: Database container is not running"
    exit 1
  fi
  
  # Run pg_dump via docker
  if docker compose exec -T db \
    pg_dump \
      -U "${POSTGRES_USER:-postgres}" \
      "${POSTGRES_DB:-freela}" \
      2>/dev/null | gzip > "$BACKUP_FILE"; then
    
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✓ Backup completed: $BACKUP_FILE ($SIZE)"
    
    # Verify backup integrity
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
      log "✓ Backup integrity verified"
    else
      log "⚠ WARNING: Backup file may be corrupted"
    fi
  else
    log "ERROR: pg_dump failed"
    exit 1
  fi
else
  log "ERROR: Docker or docker-compose not found, or not in compose directory"
  exit 1
fi

# Clean up old backups (retention policy)
log "Cleaning up old backups (keeping last $BACKUP_RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "freela_db_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
OLD_COUNT=$(find "$BACKUP_DIR" -name "freela_db_*.sql.gz" | wc -l)
log "✓ Retained $OLD_COUNT backup file(s)"

# Optional: Upload to remote storage
if [ -n "$BACKUP_REMOTE_URL" ]; then
  log "Uploading backup to remote storage..."
  if curl -X POST -F "file=@$BACKUP_FILE" "$BACKUP_REMOTE_URL" 2>/dev/null; then
    log "✓ Remote backup uploaded"
  else
    log "⚠ Remote backup upload failed (continuing locally)"
  fi
fi

log "Backup process completed successfully"

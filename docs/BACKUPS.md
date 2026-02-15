# Database Backup System

## Overview

Freela includes automated PostgreSQL backup with:
- Daily automated backups via cron
- Compression (gzip)
- Retention policy (30 days default)
- S3 upload support
- Slack/webhook notifications
- Backup verification

## Quick Start

### Manual Backup (Local)

```bash
# Set database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/freela"

# Run backup
node scripts/pg-backup.mjs

# Backup saved to: ./backups/freela_2024-02-15_03-00-00.dump
```

### Manual Backup (VPS via Docker)

```bash
ssh root@76.13.144.121

cd /root/freela

# Backup from Docker container
docker compose exec -T db pg_dump -U freela freela \
  --no-owner --no-privileges --format=custom \
  > backups/freela_$(date +%Y-%m-%d_%H-%M-%S).dump
```

---

## Automated Backups (Cron)

### Setup on VPS

```bash
# 1. SSH into VPS
ssh root@76.13.144.121

# 2. Create backup directory
mkdir -p /root/backups/freela

# 3. Make script executable
chmod +x /root/freela/scripts/backup-cron.sh

# 4. Add to crontab
crontab -e
```

Add this line for daily 3 AM backups:
```cron
0 3 * * * /root/freela/scripts/backup-cron.sh >> /var/log/freela-backup.log 2>&1
```

### Alternative Schedules

```cron
# Every 6 hours
0 */6 * * * /root/freela/scripts/backup-cron.sh

# Twice daily (3 AM and 3 PM)
0 3,15 * * * /root/freela/scripts/backup-cron.sh

# Weekly (Sunday 2 AM)
0 2 * * 0 /root/freela/scripts/backup-cron.sh
```

---

## Configuration

Environment variables for `backup-cron.sh`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | required | PostgreSQL connection string |
| `BACKUP_DIR` | `/root/backups/freela` | Local backup directory |
| `RETENTION_DAYS` | `30` | Days to keep backups |
| `MAX_BACKUPS` | `60` | Maximum backup files to keep |
| `S3_BUCKET` | (empty) | AWS S3 bucket for offsite |
| `S3_PATH` | `freela-backups` | Path prefix in S3 |
| `NOTIFY_WEBHOOK` | (empty) | Slack webhook URL |

### Example .env

```bash
# /root/freela/.env
DATABASE_URL=postgresql://freela:password@db:5432/freela
BACKUP_DIR=/root/backups/freela
RETENTION_DAYS=30
S3_BUCKET=my-backup-bucket
NOTIFY_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## S3 Offsite Backups

### Setup AWS CLI

```bash
# Install AWS CLI
apt-get update && apt-get install -y awscli

# Configure credentials
aws configure
# Enter: AWS Access Key ID
# Enter: AWS Secret Access Key
# Enter: Region (e.g., eu-central-1)
```

### Create S3 Bucket

```bash
aws s3 mb s3://freela-backups-prod

# Enable versioning (optional)
aws s3api put-bucket-versioning \
  --bucket freela-backups-prod \
  --versioning-configuration Status=Enabled
```

### Set Environment

```bash
export S3_BUCKET=freela-backups-prod
export S3_PATH=database
```

---

## Restoration

### Restore from Local Backup

```bash
# Stop app
docker compose down

# Restore database
docker compose up -d db
sleep 5

# Drop and recreate database
docker compose exec -T db psql -U freela -c "DROP DATABASE IF EXISTS freela;"
docker compose exec -T db psql -U freela -c "CREATE DATABASE freela;"

# Restore from dump
gunzip -c backups/freela_2024-02-15_03-00-00.dump.gz | \
  docker compose exec -T db pg_restore -U freela -d freela --no-owner --no-privileges

# Start app
docker compose up -d
```

### Restore from S3

```bash
# Download from S3
aws s3 cp s3://freela-backups-prod/database/freela_2024-02-15_03-00-00.dump.gz ./

# Then follow local restore steps above
```

### Using pg-restore.mjs Script

```bash
# Set environment
export DATABASE_URL="postgresql://freela:password@localhost:5432/freela"

# Restore
node scripts/pg-restore.mjs backups/freela_2024-02-15_03-00-00.dump
```

---

## Verification

### List and Verify Backups

```bash
node scripts/verify-backup.mjs
```

Output:
```
=================================
  Freela Backup Verification
=================================

Found 15 backup(s) in ./backups:

┌─────────────────────────────────────────────┬──────────┬─────────────────────┐
│ Filename                                    │ Size     │ Created             │
├─────────────────────────────────────────────┼──────────┼─────────────────────┤
│ freela_2024-02-15_03-00-00.dump.gz         │ 2.5 MB   │ 2024-02-15 03:00:00 │
│ freela_2024-02-14_03-00-00.dump.gz         │ 2.4 MB   │ 2024-02-14 03:00:00 │
│ ...                                         │          │                     │
└─────────────────────────────────────────────┴──────────┴─────────────────────┘

Total backup size: 35.2 MB

--- Latest Backup ---
Verifying: ./backups/freela_2024-02-15_03-00-00.dump.gz
   Size: 2.5 MB
   Created: 2024-02-15 03:00:00
   ✓ Gzip integrity OK
   ✓ Valid pg_dump format (156 objects)
   ✅ Backup verification passed
```

### Verify Specific Backup

```bash
node scripts/verify-backup.mjs backups/freela_2024-02-15_03-00-00.dump.gz
```

---

## Notifications

### Slack Webhook

1. Go to Slack → Apps → Incoming Webhooks
2. Create webhook for channel (e.g., `#backups`)
3. Copy webhook URL
4. Set environment:
```bash
export NOTIFY_WEBHOOK="https://hooks.slack.com/services/T00/B00/xxxx"
```

### Telegram Notification

Create helper script:

```bash
#!/bin/bash
# scripts/telegram-notify.sh
TOKEN="your-bot-token"
CHAT_ID="your-chat-id"
MESSAGE=$1

curl -s -X POST "https://api.telegram.org/bot$TOKEN/sendMessage" \
  -d chat_id="$CHAT_ID" \
  -d text="$MESSAGE" \
  -d parse_mode="Markdown"
```

---

## Monitoring

### Check Last Backup

```bash
# On VPS
ls -la /root/backups/freela/ | tail -5
```

### Check Cron Logs

```bash
tail -50 /var/log/freela-backup.log
```

### Health Check Endpoint

The app's `/api/health` endpoint can be extended to check backup freshness.

---

## Troubleshooting

### "pg_dump: command not found"

```bash
# Install PostgreSQL client
apt-get update && apt-get install -y postgresql-client-16
```

### "connection refused"

Check database is running:
```bash
docker compose ps
docker compose logs db
```

### "permission denied"

```bash
chmod +x scripts/backup-cron.sh
chown root:root scripts/backup-cron.sh
```

### S3 Upload Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check bucket access
aws s3 ls s3://your-bucket/
```

---

## Disaster Recovery Plan

1. **Immediate** (< 1 hour)
   - Restore from latest local backup
   - Notify users of brief downtime

2. **Local backup unavailable** (< 4 hours)
   - Download from S3
   - Restore and verify

3. **No backups available** (worst case)
   - Contact hosting support
   - Attempt WAL recovery
   - Check if any team member has local copy

### Recovery Checklist

- [ ] Downloaded backup file
- [ ] Verified backup integrity
- [ ] Stopped application
- [ ] Restored database
- [ ] Ran migrations (if needed)
- [ ] Verified data integrity
- [ ] Started application
- [ ] Tested critical flows
- [ ] Notified stakeholders

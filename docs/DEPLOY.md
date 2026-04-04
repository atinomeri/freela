# Deploy Checklist (Freela)

## Required environment variables
- `NEXTAUTH_URL` (production domain, e.g. `https://your-domain.com`)
- `NEXTAUTH_SECRET` (strong random secret)
- `DATABASE_URL` (Postgres connection string)
- `REDIS_URL` (Redis connection string, required for multi-instance realtime)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (SMTP config, required for password reset in production)
- `SENTRY_DSN` (optional but recommended: error monitoring)

## Security/ops environment variables (recommended)
- `TRUST_PROXY_HEADERS=true` (trust X-Forwarded-For/X-Real-IP behind reverse proxy)
- `RATE_LIMIT_STRICT=true` (fail-closed if Redis is unavailable in production)
- `HEALTH_CHECK_TOKEN=<secret>` (allows full `/api/health` details with header `x-health-secret`)

## Recommended setup (Option 1)
**App on VPS + Managed Postgres**
- Keep the Next.js app on your VPS (systemd/Docker/PM2).
- Use a managed Postgres provider for the database (backups, monitoring, simpler ops).
- Set `DATABASE_URL` on the VPS to the managed Postgres connection string.

### DATABASE_URL examples
Without SSL (local/dev):
```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
```

With SSL (common for managed Postgres):
```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public&sslmode=require
```

## Migrations (production)
```bash
npm run prisma:migrate:deploy
```

### Tracking Stats/Report Recovery Runbook (2026-04)

Use this when desktop tracking report/stats fail due to schema drift:

1. Ensure latest code is deployed (commit includes migration `20260404143000_add_campaign_report_desktop_user_id`).
2. Rebuild and roll app container:

```bash
cd /root/freela/deploy
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps --wait --wait-timeout 400 app
```

3. Confirm migrations inside app container:

```bash
cd /root/freela/deploy
docker compose -f docker-compose.prod.yml exec -T app npx prisma migrate status --config=./prisma.config.ts
```

Expected result: `Database schema is up to date!`

4. Verify runtime:

```bash
curl https://freela.ge/api/health
```

5. Optional smoke flow (desktop path):
report -> pixel -> click -> stats for a temporary campaign ID.
Expected: report 200, pixel 200, click 302, stats 200 with campaign totals.

## Build & start
```bash
npm run build
npm run start
```

## Backups
- Install Postgres client tools on the VPS (`pg_dump`, `pg_restore`).
- Use `pg_dump` regularly (store backups off the VPS):
```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Or use the project helper script (custom-format dump):
```bash
npm run db:backup
```

Restore (DANGER: overwrites data in the target DB):
```bash
npm run db:restore -- --file=./backups/<file>.dump
```

## Notes
- Ensure `NEXTAUTH_URL` matches your public domain exactly (https + host).
- Set `DATABASE_URL` to a production Postgres instance.
- Configure SMTP so password reset emails can be sent (set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and optionally `SMTP_USER`/`SMTP_PASS`).
- Configure `SENTRY_DSN` so production errors are reported (recommended).
- In production, serve the app behind HTTPS (recommended): the app enables secure auth cookies and sets HSTS.
- Monitoring: use `/api/health` for uptime checks (returns 200 when DB/Redis checks are OK, otherwise 503).
- `/api/health` is public but minimal; for full details send `x-health-secret: $HEALTH_CHECK_TOKEN`.
- Uploads: chat attachments are stored on disk (default `./data/uploads`). On VPS, mount this as a persistent volume or set `UPLOADS_DIR` to a persistent path.

# Deploy Checklist (Freela)

## Required environment variables
- `NEXTAUTH_URL` (production domain, e.g. `https://your-domain.com`)
- `NEXTAUTH_SECRET` (strong random secret)
- `DATABASE_URL` (Postgres connection string)
- `REDIS_URL` (Redis connection string, required for multi-instance realtime)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` (SMTP config, required for password reset in production)
- `SENTRY_DSN` (optional but recommended: error monitoring)

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
- Uploads: chat attachments are stored on disk (default `./data/uploads`). On VPS, mount this as a persistent volume or set `UPLOADS_DIR` to a persistent path.

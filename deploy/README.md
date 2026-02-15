# Production deploy (Hostinger KVM VPS)

This app is a **Next.js SSR/API** service and needs **PostgreSQL + Redis + persistent uploads**.

## 0) DNS

Point your domain to the VPS public IP:

- `A @ -> <VPS_IP>`
- (optional) `A www -> <VPS_IP>`

## 1) Install Docker on the VPS

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Install compose plugin:

```bash
sudo apt install -y docker-compose-plugin
```

## 2) Copy project to VPS

Option A: git clone:

```bash
git clone <YOUR_REPO_URL> freela
cd freela/deploy
```

Option B: upload the folder via SFTP and `cd deploy`.

## 3) Configure environment

Create `deploy/.env` from template:

```bash
cp .env.prod.example .env
nano .env
```

Required:

- `DOMAIN`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `REDIS_URL`

Recommended:

- `RATE_LIMIT_STRICT=true` (fail-closed if Redis is unavailable)
- `TRUST_PROXY_HEADERS=true` (trust X-Forwarded-For/X-Real-IP behind Caddy)
- `HEALTH_CHECK_TOKEN` (unlock full `/api/health` details with `x-health-secret`)

## 4) Start services

From `deploy/`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Run DB migrations:

```bash
docker compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy
```

## 5) Verify

- Open `https://<DOMAIN>`
- Health check:
  - `https://<DOMAIN>/api/health`
  - Full details (optional): `curl -H "x-health-secret: $HEALTH_CHECK_TOKEN" https://<DOMAIN>/api/health`

## Updates

One-command update (recommended):

```bash
cd freela
chmod +x deploy/update-host.sh
./deploy/update-host.sh --health-url "https://<DOMAIN>/api/health"
```

Windows PowerShell (runs deploy remotely over SSH):

```powershell
./deploy/update-host.ps1 -Host "<VPS_IP_OR_DOMAIN>" -User "<SSH_USER>" -AppDir "~/freela" -HealthUrl "https://<DOMAIN>/api/health"
```

Optional flags:

- `--no-pull` (use current checked-out commit)
- `--no-migrate` (skip `prisma migrate deploy`)
- `--no-build-gate` (skip pre-deploy `docker compose build app` check)

Note: `update-host.sh` enforces a GitHub-first flow and deploys only from `main`. If host branch has uncommitted changes or local commits not pushed to upstream, it aborts and asks you to push first.

Manual alternative:

```bash
cd freela
git pull
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy
```

## GitHub Actions auto deploy

This repository includes `.github/workflows/deploy.yml`.
It deploys automatically after `CI Fast` succeeds on `main` (and supports manual `workflow_dispatch`).

CI is split into two workflows:

- `CI Fast` (`.github/workflows/ci.yml`) runs on push/PR with lint + unit tests + build.
- `CI Full` (`.github/workflows/ci-full.yml`) runs critical Playwright smoke on `main` push, and full Playwright smoke on nightly schedule or manual run.

Add these repository secrets in GitHub:

- `VPS_HOST` (example: `76.13.144.121`)
- `VPS_USER` (example: `root`)
- `VPS_SSH_PORT` (example: `22`)
- `VPS_APP_DIR` (example: `/root/freela`)
- `VPS_SSH_PRIVATE_KEY` (private key content for the deploy user)
- Optional (recommended): `VPS_HOST_KEY` (pinned host key line for `known_hosts`, example: `76.13.144.121 ssh-ed25519 AAAA...`)
- Optional: `DEPLOY_HEALTHCHECK_URL` (example: `https://your-domain.com/api/health`)

Notes:

- The server must already have Docker + compose and the project checked out.
- The deploy user must have access to run `docker compose` and write in `VPS_APP_DIR`.
- Generate/pin host key from a trusted machine:
  - `ssh-keyscan -p 22 76.13.144.121`
- If `VPS_HOST_KEY` is not set, workflow uses `ssh-keyscan` fallback.

## Backups (recommended)

- Use `scripts/pg-backup.mjs` on a schedule, or run `pg_dump` from the VPS.
- Keep `uploads` volume backed up (contains chat attachments).

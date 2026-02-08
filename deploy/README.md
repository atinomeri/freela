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

## Updates

```bash
cd freela
git pull
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run prisma:migrate:deploy
```

## Backups (recommended)

- Use `scripts/pg-backup.mjs` on a schedule, or run `pg_dump` from the VPS.
- Keep `uploads` volume backed up (contains chat attachments).


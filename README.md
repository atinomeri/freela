# Freela — ფრილანსის პლატფორმა (Georgia)

Next.js (App Router) + TypeScript + Prisma + PostgreSQL + TailwindCSS.

Freela არის ფრილანსის მარკეტპლეისი ქართული ბაზრისთვის: პროექტები, ფრილანსერები (სტატიკური კატეგორიებით), ჩატი, ფაილების გაგზავნა და შეფასებები.

## სწრაფი გაშვება (Local)

### 1) დამოკიდებულებები

```bash
npm install
```

### 2) ინფრასტრუქტურა (Postgres + Redis)

```bash
npm run db:up
```

### 3) გარემოს ცვლადები

შექმენი `.env.local` (პროექტის root-ში) და მინიმუმ მიუთითე:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_strong_secret
DATABASE_URL=postgresql://freela:freela_password@localhost:5432/freela?schema=public
REDIS_URL=redis://localhost:6379

# Security/ops (recommended for production)
# TRUST_PROXY_HEADERS=true (enable X-Forwarded-For/X-Real-IP trust behind proxy)
# RATE_LIMIT_STRICT=true (fail-closed if Redis is unavailable in production)
# HEALTH_CHECK_TOKEN=your_health_token (unlock full /api/health details with x-health-secret)
```

ნიმუში იხილე `.env.example`.

### 4) Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5) გაშვება

```bash
npm run dev
```

გახსენი `http://localhost:3000`.

## ენები (i18n)

საიტი მუშაობს 3 ენაზე: `ka`, `en`, `ru` (cookie: `NEXT_LOCALE`).
თარგმანები ინახება `messages/*.json` ფაილებში.

## ფაილები (ჩატი)

ფაილები ინახება ლოკალურად `data/uploads` დირექტორიაში (ან `UPLOADS_DIR`-ში თუ მითითებულია).
ჩამოტვირთვა შესაძლებელია მხოლოდ საუბრის მონაწილეებისთვის.

## სასარგებლო ბრძანებები

- DB up/down/reset: `npm run db:up`, `npm run db:down`, `npm run db:reset`
- Prisma Studio: `npm run prisma:studio`
- Lint: `npm run lint`
- Build: `npm run build`
- E2E: `npm run test:e2e`

## Production notes (მოკლედ)

- დააყენე რეალური `NEXTAUTH_URL` და ძლიერი `NEXTAUTH_SECRET`
- აუცილებელია `DATABASE_URL` და (multi-instance realtime-ისთვის) `REDIS_URL`
- Email (password reset): `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASS` (სურვილისამებრ)
- Observability (optional): `SENTRY_DSN`
- Security (recommended): `TRUST_PROXY_HEADERS=true`, `RATE_LIMIT_STRICT=true`, `HEALTH_CHECK_TOKEN` for `/api/health`

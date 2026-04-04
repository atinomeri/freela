# Freela Project Overview

Updated: 2026-04-04

This document describes the current state of the Freela repository and its two production domains:

1. The public marketplace web app (freelancers, employers, projects, chat, admin).
2. The desktop-mailer backend APIs (desktop auth, quotas, tracking, updates, unsubscribe sync).

## 1. Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript (strict mode)
- ORM/DB: Prisma 7 + PostgreSQL
- Cache/infra: Redis (rate limiting, queue/realtime support)
- Auth (web): NextAuth session/cookies
- Auth (desktop): JWT bearer tokens via dedicated desktop tables
- Styling/UI: TailwindCSS + component layer in `src/components`
- Error monitoring: Sentry integration (optional)

## 2. System Boundaries

Freela is one codebase with two isolated user domains:

### Web Marketplace Domain

- Uses `User`, `Profile`, `Project`, `Proposal`, `Thread`, `Message`, `Notification` and related site models.
- Auth is session-based (`next-auth`) and role-based (`EMPLOYER | FREELANCER | ADMIN`).
- Main pages are under `src/app/*` and web APIs under `src/app/api/*`.

### Desktop Mailer Domain

- Uses separate models: `DesktopUser`, `DesktopRefreshToken`, `DesktopQuota`, `CampaignReport`.
- Auth is bearer JWT (`Authorization: Bearer ...`) via `src/lib/desktop-auth.ts`.
- Main endpoints are under `src/app/api/desktop/*`.

### Tracking/Unsubscribe Domain

- Tracking events are written to `EmailTrackingEvent`.
- Unsubscribe state is written to `UnsubscribedEmail` and can be scoped to `desktopUserId`.
- Desktop and admin access rules are enforced server-side on stats/reporting routes.

## 3. Data Model Highlights (Prisma)

Core site entities:

- `User`, `Profile`, `Project`, `Proposal`, `Thread`, `Message`, `MessageAttachment`
- `Notification`, `Review`, `SitePage`, `SitePageContent`, `SupportThread`, `SupportMessage`

Desktop entities:

- `DesktopUser`
- `DesktopRefreshToken`
- `DesktopQuota`
- `CampaignReport`

Shared operational entities:

- `EmailTrackingEvent`
- `UnsubscribedEmail`
- `AppRelease`

Schema reference: `prisma/schema.prisma`

## 4. API Surface (Current)

Major groups:

- Web auth/account: `/api/auth/*`, `/api/register`, `/api/profile*`, `/api/password-reset/*`
- Marketplace: `/api/projects*`, `/api/proposals/*`, `/api/freelancers`
- Messaging/realtime: `/api/threads*`, `/api/realtime`, `/api/notifications*`
- Admin: `/api/admin/*`
- Desktop auth/billing: `/api/desktop/auth/*`, `/api/desktop/account/me`, `/api/desktop/quota/*`
- Desktop ops: `/api/tracking/*`, `/api/updates/check`, `/api/unsubscribed`

OpenAPI baseline lives in `docs/openapi.yaml` (web-centric). Desktop-specific endpoint behavior is additionally documented in `mails/BACKEND_API_SPEC.md`.

## 5. Security and Ownership Rules (Implemented)

### Tracking Stats

- `/api/tracking/stats` requires desktop bearer auth or admin session.
- Desktop callers are restricted to their own campaigns (`desktopUserId` ownership, with legacy fallback check by `hwid/email`).

### Tracking Report

- `/api/tracking/report` requires desktop bearer auth.
- Existing campaign reports cannot be overwritten by another desktop user.

### Pixel/Click Tracking PII Handling

- Pixel/click routes decode recipient email for runtime processing, then store only `emailHash`.
- IP is stored as hash (`ipAddress` field contains hashed value when present).
- Plain recipient email is not written on the current path.

### Unsubscribe API

- `/api/unsubscribed` supports:
  - Desktop bearer JWT (scoped records)
  - Admin web session
  - Legacy internal secret (compatibility mode)

## 6. Realtime

- SSE endpoint: `/api/realtime`
- Events emitted for message delivery and notification updates.
- Current connection map is process-local; multi-instance setups should use Redis/event bus strategy.

## 7. Local Development

From `freela/`:

1. `npm install`
2. `npm run db:up`
3. Create `.env.local` from `.env.example`
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run dev`

Useful scripts:

- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run build`

## 8. Known Technical Follow-ups

- `tsconfig.json` still has a TypeScript deprecation warning around `compilerOptions.baseUrl` (future TS 7 migration item).
- `/api/updates/check` currently returns placeholder `sha256` and `file_size` until these fields are stored in `AppRelease`.
- Ensure secrets are kept in environment variables only; do not store plaintext credentials in workspace-level JSON config files.

## 9. Related Documents

- `README.md` (quick start)
- `docs/SECURITY.md` (security hardening notes)
- `docs/DEPLOY.md` and `DEPLOY-QUICK-START.md` (deployment)
- `TRACKING-API-USAGE.md` (desktop tracking integration)

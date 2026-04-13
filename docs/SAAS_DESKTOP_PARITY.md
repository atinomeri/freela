# SaaS vs Desktop Functional Parity

Updated: 2026-04-13
Source baseline: `mails/TECHNICAL_DOCUMENTATION_EN.md` (desktop app)

This checklist tracks backend/business-function parity between:
- Desktop Freela Mailer (`mails/`)
- SaaS Freela Mailer (`freela/`)

UI/visual parity is intentionally out of scope.

## Legend
- `DONE`: Implemented and running in SaaS.
- `PARTIAL`: Implemented with scope differences.
- `MISSING`: Not yet implemented in SaaS.

## Core account/billing/tracking
- `DONE` Desktop auth/register/refresh/account endpoints
- `DONE` Quota reserve/report billing flow
- `DONE` Tracking pixel/click/report/stats
- `DONE` Unsubscribe sync and token verification

## Campaign & contacts
- `DONE` Campaign CRUD + status lifecycle
- `DONE` Contact list CRUD + CSV/XLSX import + dedupe
- `DONE` Placeholder personalization (`[[Column]]`)
- `DONE` Server-side queue + worker sending
- `DONE` Scheduled send (`scheduledAt`, one-time)
- `DONE` Daily batch scheduling mode (`scheduleMode=DAILY`, `dailyLimit`, `dailySendTime`, offset-based continuation)

## SMTP
- `DONE` Per-user SMTP configuration (encrypted password)
- `DONE` SMTP pool accounts (multiple senders)
- `DONE` Pool rotation in worker
- `PARTIAL` Proxy support fields and proxy URL wiring exist; runtime behavior depends on SMTP provider/proxy compatibility.

## Compliance/suppression
- `DONE` Unsubscribe suppression before send
- `DONE` Bounce-based suppression on send failures (`source=bounce`)
- `DONE` Manual unsubscribe management in admin
- `DONE` IMAP bounce scan API (`/api/desktop/bounce/scan`) using SMTP/pool credentials

## Pre-send quality checks
- `DONE` Spam preflight scoring API (`/api/desktop/preflight/spam-check`)
- `DONE` Deliverability DNS checks API (`/api/desktop/preflight/deliverability`) for MX/SPF/DKIM/DMARC

## Templates & composition
- `DONE` Built-in template library
- `DONE` Custom template CRUD
- `DONE` Apply template on campaign create
- `PARTIAL` Desktop rich-text editor tools are not 1:1 mirrored; SaaS currently stores HTML payload and templates.

## Campaign history parity
- `DONE` Campaign history export endpoint (`GET /api/desktop/campaigns/history/export`)
- `DONE` Failed-recipient export endpoint (`GET /api/desktop/campaigns/:id/failed?format=csv`)
- `DONE` Retry-from-failed workflow (`POST /api/desktop/campaigns/:id/retry`)
- `DONE` Delete campaign history entry (`DELETE /api/desktop/campaigns/:id/history`)

## Warmup
- `DONE` Sender warmup tracker persistence (`DesktopWarmupSender`)
- `DONE` Optional warmup-aware send limits in worker (`CAMPAIGN_WARMUP_*`)
- `DONE` Warmup inspection/reset API (`GET/POST /api/desktop/warmup`)

## Outstanding parity gaps
- `PARTIAL` Desktop-only local GUI tooling (rich editor widgets, local dialogs, and window-native UX) intentionally not mirrored in SaaS backend scope.

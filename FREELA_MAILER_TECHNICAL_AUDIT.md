# Freela Mailer - Full Technical Audit

Audit date: 2026-04-12
Codebase: `c:\Users\admin\Desktop\freela project\freela`

## API Map

Source of truth: `src/app/api/**/route.ts`
- Route files: 62
- Method-endpoints: 71

### Mailer/Desktop domain (core)

#### POST /api/desktop/auth/register
- Purpose: Create desktop user account (individual/company)
- Request body: `userType` + identity fields + `phone`, `email`, `password`
- Response: `201` with `{ accessToken, refreshToken, expiresIn, user:{id,email,balance} }`
- Auth required: No

#### POST /api/desktop/auth/login
- Purpose: Desktop login
- Request body: `{ email, password }`
- Response: `{ accessToken, refreshToken, expiresIn, user:{id,email,balance} }`
- Auth required: No

#### POST /api/desktop/auth/refresh
- Purpose: Rotate refresh token and issue new access token
- Request body: `{ refreshToken }`
- Response: `{ accessToken, refreshToken, expiresIn }`
- Auth required: No (refresh token required)

#### GET /api/desktop/account/me
- Purpose: Return desktop account info
- Request: `Authorization: Bearer <desktop_access_token>`
- Response: `{ email, balance }`
- Auth required: Yes (desktop JWT)

#### POST /api/desktop/quota/reserve
- Purpose: Reserve send quota and deduct balance up front
- Request body: `{ count }`
- Response success: `{ quota_id, allowed, charged, expires_at, balance }`
- Response insufficient: `402` with `{ error, balance, max_allowed }`
- Auth required: Yes (desktop JWT)

#### POST /api/desktop/quota/report
- Purpose: Report quota usage and refund failed sends
- Request body: `{ quota_id, sent, failed }`
- Response: `{ refunded, balance }`
- Auth required: Yes (desktop JWT)

#### POST /api/admin/topup
- Purpose: Admin balance top-up for DesktopUser
- Request body: `{ email, amount }`
- Response: `{ email, new_balance }`
- Auth required: Yes (admin web session)

#### POST /api/license/activate
- Purpose: Activate/bind license to HWID
- Request body: `{ key, hwid }`
- Response: `{ valid, tier, expires_at }` or `{ valid:false, error }`
- Auth required: No

#### POST /api/license/validate
- Purpose: Validate existing license/HWID mapping
- Request body: `{ key, hwid }`
- Response: `{ valid:true, tier, expires_at }` or `{ valid:false }`
- Auth required: No

#### GET /api/tracking/pixel
- Purpose: Register OPEN event
- Request query: `data=<base64_email>&cid=<campaign_id?>`
- Response: 1x1 GIF (HTTP 200)
- Auth required: No

#### GET /api/tracking/click
- Purpose: Register CLICK event + redirect
- Request query: `url=<base64_url>&email=<base64_email>&cid=<campaign_id?>`
- Response: HTTP 302 redirect
- Auth required: No

#### POST /api/tracking/report
- Purpose: Upsert campaign aggregate report
- Request body: `{ campaign_id, hwid, license_key, total, sent, failed, started_at, finished_at, events }`
- Response: `{ ok:true }`
- Auth required: Yes (desktop JWT)

#### GET /api/tracking/stats
- Purpose: Campaign stats (dedup opens/clicks + sent/failed + unsub count)
- Request query: optional `campaign_id`
- Response: `{ campaign_id,total_sent,opened,clicked,bounced,unsubscribed,open_rate,click_rate }`
- Auth required: Yes (desktop JWT or admin session)

#### GET /api/tracking/events
- Purpose: Return distinct recipient hashes for OPEN/CLICK
- Request query: `campaign_id`, `type=OPEN|CLICK`
- Response: `{ campaign_id, type, hashes }`
- Auth required: Yes (desktop JWT or admin session)

#### GET /api/unsubscribed
- Purpose: Sync unsubscribed records
- Request: desktop/admin auth (legacy secret supported)
- Response: `{ count, items:[{id,email,source,timestamp}] }`
- Auth required: Yes

#### DELETE /api/unsubscribed
- Purpose: Remove unsubscribe record by `id` or `email`
- Request body: `{ id }` or `{ email }`
- Response: `{ success:true, deleted }`
- Auth required: Yes

#### POST /api/updates/check
- Purpose: Check for desktop updates
- Request body: `{ version, platform }` (`platform` currently unused)
- Response: `{ available:false }` or `{ available:true, version, download_url, changelog, sha256, file_size, mandatory }`
- Auth required: No

#### GET /api/app/version
- Purpose: Public latest app version endpoint
- Request: none
- Response: `{ version, url, release_notes }`
- Auth required: No

### Full endpoint inventory (all backend endpoints in repo)

```
DELETE /api/unsubscribed
GET /api/app/version
GET /api/auth/[...nextauth]
GET /api/avatars
GET /api/csrf
GET /api/desktop/account/me
GET /api/files/[id]
GET /api/freelancers
GET /api/health
GET /api/notifications
GET /api/profile
GET /api/profile/personal
GET /api/profile/subscription
GET /api/projects
GET /api/realtime
GET /api/reviews
GET /api/support/chat
GET /api/threads
GET /api/threads/[id]/messages
GET /api/tracking/click
GET /api/tracking/events
GET /api/tracking/pixel
GET /api/tracking/stats
GET /api/unsubscribed
PATCH /api/notifications/[id]
PATCH /api/profile
PATCH /api/profile/personal
PATCH /api/projects/[id]/complete
PATCH /api/projects/[id]/status
PATCH /api/proposals/[id]
POST /api/admin/content
POST /api/admin/pages/[id]/delete
POST /api/admin/pages/[id]/update
POST /api/admin/pages/create
POST /api/admin/pages/toggle
POST /api/admin/projects/[id]/complete
POST /api/admin/projects/[id]/delete
POST /api/admin/projects/[id]/open
POST /api/admin/reviews/[id]/approve
POST /api/admin/support/threads/[id]/messages
POST /api/admin/support/threads/[id]/status
POST /api/admin/topup
POST /api/admin/users/[id]/delete
POST /api/admin/users/[id]/disable
POST /api/admin/users/[id]/role
POST /api/admin/users/[id]/verify-email
POST /api/auth/[...nextauth]
POST /api/desktop/auth/login
POST /api/desktop/auth/refresh
POST /api/desktop/auth/register
POST /api/desktop/quota/report
POST /api/desktop/quota/reserve
POST /api/license/activate
POST /api/license/validate
POST /api/notifications/mark-all-read
POST /api/password-reset/confirm
POST /api/password-reset/request
POST /api/profile/avatar
POST /api/profile/subscription
POST /api/projects
POST /api/projects/[id]/apply
POST /api/push/subscribe
POST /api/push/unsubscribe
POST /api/register
POST /api/reviews
POST /api/support/chat
POST /api/threads/[id]/ack
POST /api/threads/[id]/messages
POST /api/threads/create
POST /api/tracking/report
POST /api/updates/check
```

## System Behavior

### 1) Sending Logic
- Campaign sending itself is desktop-side.
- Backend does not run bulk campaign SMTP workflow.
- Backend server-side email exists only for platform transactional notifications (password reset, project notifications).
- Classification: Hybrid platform, desktop-owned campaign execution.

### 2) Campaign Management
- Backend stores aggregate campaign results in `CampaignReport`.
- No campaign CRUD/lifecycle model (`draft/pending/sending/completed`) in backend.
- No scheduler or state machine for campaign progression.

### 3) Contacts Management
- No contacts/lists tables in backend schema.
- No API for contact upload/list CRUD/segmentation.
- Contacts are effectively local desktop data.

### 4) Tracking System
- Opens and clicks are captured by `/api/tracking/pixel` and `/api/tracking/click`.
- Events saved in `EmailTrackingEvent`.
- Recipient identity stored as `emailHash` (hash-based), not plaintext on current write path.
- Stats endpoint deduplicates by distinct `emailHash`.
- Event collection is near real-time; `sent/failed` totals are report-based (batch from desktop).

### 5) Billing / Quota
- Balance: `DesktopUser.balance`.
- Reservation: atomic DB transaction with row lock (`FOR UPDATE`) then creates `DesktopQuota`.
- Reporting: validates totals and refunds failed sends.
- Weak points for SaaS scaling:
  - `sent/failed` values are client-reported.
  - No immutable billing ledger / payment transaction model.
  - Manual admin top-up only.
  - No idempotency key on report operations.
  - No automatic quota-expiry reconciliation worker.

### 6) Unsubscribe
- Unsubscribe page accepts plain email/base64 payload and optional `email|desktopUserId` format.
- No strict cryptographic signature validation in active decode logic.
- Data stored in `UnsubscribedEmail`, optionally scoped by `desktopUserId`.
- Sync exposed via `GET/DELETE /api/unsubscribed` (desktop/admin + legacy secret compatibility).

## Database

### Database Type
- PostgreSQL (Prisma datasource provider is `postgresql`).

### Mailer-related tables and purpose
- `DesktopUser`: desktop auth identity + balance.
- `DesktopRefreshToken`: refresh token persistence/rotation.
- `DesktopQuota`: quota reservation/refund state.
- `CampaignReport`: aggregate campaign reporting and ownership scope.
- `EmailTrackingEvent`: open/click event log.
- `UnsubscribedEmail`: suppression list, sender-scoped via `desktopUserId`.
- `LicenseKey`: license validity and HWID binding.
- `AppRelease`: desktop release metadata for updates.

### Key relationships
- `DesktopUser` 1:N `DesktopRefreshToken`
- `DesktopUser` 1:N `DesktopQuota`
- `DesktopUser` 1:N `CampaignReport`
- `DesktopUser` 1:N `UnsubscribedEmail`
- `CampaignReport.campaignId` is unique.
- `EmailTrackingEvent` has no FK to campaign owner/tenant entities.

### Multi-user / SaaS suitability
- Multi-user basics are present (per-desktop-user auth and scoped access checks).
- Full multi-tenant SaaS model is incomplete (missing tenant model and complete ownership normalization across all campaign artifacts).

## SaaS Readiness

1. Backend SaaS-ready: Partially.
2. Estimated SaaS implementation coverage: ~35%.
3. Biggest architectural gaps:
- No backend campaign domain/lifecycle API.
- No backend contacts/lists/suppression management domain.
- No server-side send engine + durable queue workers.
- Billing is not ledger-driven and not payment-integrated.
- Unsubscribe/tracking token authenticity is weak.

## Critical Missing Pieces

- Campaign API and lifecycle state machine.
- Backend contacts/lists API and storage.
- Server-side sending engine.
- Queue/worker system for dispatch/retry/scheduling.
- Delivery webhook ingestion (bounces/complaints).
- Billing ledger + payment integration.
- Strong tenant/owner boundaries across tracking and campaign entities.
- Signed/tamper-proof tracking and unsubscribe tokens.

## Recommendations

### Reuse (do not rewrite)
- Desktop auth stack (`DesktopUser`, JWT access/refresh rotation).
- Quota reservation/refund mechanics (`DesktopQuota`) as a base.
- Tracking ingestion + hash-based privacy strategy.
- Unsubscribe storage model (`UnsubscribedEmail` with `desktopUserId` scope).
- Existing health/rate-limit/auth infrastructure.

### Move to backend
- Campaign execution orchestration.
- Campaign state transitions and audit trail.
- Contact resolution and suppression enforcement pre-send.
- Delivery accounting from provider events (instead of client-only reporting).
- Unsubscribe token generation/validation logic.

### Build from scratch
- Campaign service (entities + CRUD + lifecycle).
- Contacts/lists service (import, dedupe, segmentation).
- Worker queue topology for email jobs.
- Provider adapter layer + webhook processors.
- Billing ledger/payment subsystem.
- Tenant isolation model with strict ownership FK enforcement.

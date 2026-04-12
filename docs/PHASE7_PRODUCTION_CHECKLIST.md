# Phase 7 Production Checklist

Date: 2026-04-12
Scope: unsubscribe token signing, auth hardening, ownership safety

## 1. Server Environment

Set these variables on the `freela` backend:

1. `INTERNAL_API_SECRET=<strong-random-secret>`
2. `UNSUBSCRIBE_TOKEN_SECRET=<strong-random-secret>`
3. `UNSUBSCRIBE_ALLOW_LEGACY=false`
4. `UNSUBSCRIBED_ALLOW_QUERY_SECRET=false`
5. `UNSUBSCRIBED_ALLOW_SECRET_DELETE=false`

Reference: `.env.example`

## 2. Secret Alignment Rule

`UNSUBSCRIBE_TOKEN_SECRET` must match the secret used by desktop mailer for unsubscribe token signing.

Recommended compatibility mode:

1. Use the same value for both:
2. `INTERNAL_API_SECRET == UNSUBSCRIBE_TOKEN_SECRET`

This keeps API fallback and token verification aligned.

## 3. Desktop Mailer Configuration

Set these values in desktop app settings:

1. `unsubscribe_url=https://<your-domain>/unsub?email=[[Email_B64]]`
2. `unsubscribe_api_url=https://<your-domain>/api/unsubscribed`
3. `unsubscribe_api_secret=<same-shared-secret>`

## 4. Security Flags Policy

Keep these disabled in production:

1. `UNSUBSCRIBE_ALLOW_LEGACY=false`
2. `UNSUBSCRIBED_ALLOW_QUERY_SECRET=false`
3. `UNSUBSCRIBED_ALLOW_SECRET_DELETE=false`

Enable only as temporary migration flags with a rollback window.

## 5. Deploy Verification

Run post-deploy smoke checks:

1. Open a real unsubscribe link from a test campaign and confirm success.
2. Tamper token signature and confirm `/unsub` rejects the link.
3. Call `GET /api/unsubscribed` with desktop JWT and verify owner-scoped list only.
4. Call `GET /api/unsubscribed?secret=...` and verify it returns `401` when query-secret flag is false.
5. Call `DELETE /api/unsubscribed` with secret bearer and verify it returns `403` when secret-delete flag is false.
6. Confirm admin session still has global access to `/api/unsubscribed`.

## 6. Rotation and Incident Procedure

If secret leakage is suspected:

1. Rotate `UNSUBSCRIBE_TOKEN_SECRET` and `INTERNAL_API_SECRET` immediately.
2. Restart backend services.
3. Reconfigure desktop clients with new shared secret.
4. Keep legacy flags disabled unless an emergency migration window is required.
5. Re-run all smoke checks.

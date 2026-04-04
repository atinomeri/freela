# Email Tracking API Usage Guide

Updated: 2026-04-04

This guide describes how the desktop sender should integrate with Freela tracking endpoints.

Base URL:

- `https://freela.ge/api/tracking/pixel`
- `https://freela.ge/api/tracking/click`
- `https://freela.ge/api/tracking/report`
- `https://freela.ge/api/tracking/stats`

## 1. Open Tracking (Pixel)

Endpoint:

- `GET /api/tracking/pixel?data={base64_email}&cid={campaign_id}`

Parameters:

- `data` (required): base64-encoded recipient email
- `cid` (optional): campaign ID used for stats grouping

Behavior:

1. Returns a 1x1 transparent GIF.
2. Writes `OPEN` event to `EmailTrackingEvent`.
3. Stores `emailHash` and hashed IP (when available).
4. Does not store plaintext recipient email on the current write path.

## 2. Click Tracking

Endpoint:

- `GET /api/tracking/click?url={base64_url}&email={base64_email}&cid={campaign_id}`

Parameters:

- `url` (required): destination URL in base64
- `email` (required): recipient email in base64
- `cid` (optional): campaign ID

Behavior:

1. Decodes and validates destination URL.
2. Writes `CLICK` event using `emailHash` and hashed IP.
3. Redirects with HTTP 302 to the final URL.

## 3. Campaign Report (Desktop Auth Required)

Endpoint:

- `POST /api/tracking/report`

Auth:

- `Authorization: Bearer <desktop_access_token>`

Body example:

```json
{
  "campaign_id": "campaign_2026_04_04_001",
  "hwid": "client-identifier",
  "license_key": null,
  "total": 500,
  "sent": 487,
  "failed": 13,
  "started_at": 1775282400,
  "finished_at": 1775283000,
  "events": []
}
```

Behavior:

- Requires desktop JWT.
- Enforces campaign ownership on upsert (no cross-user overwrite).
- Stores `desktopUserId` for scoped statistics.

## 4. Campaign Stats (Desktop or Admin Auth)

Endpoint:

- `GET /api/tracking/stats?campaign_id={id}`

Auth:

- Desktop bearer JWT, or
- Admin web session

Behavior:

- Returns deduplicated counts based on distinct `emailHash`.
- For desktop callers, applies ownership checks and scope filtering.

Example response:

```json
{
  "campaign_id": "campaign_2026_04_04_001",
  "total_sent": 487,
  "opened": 45,
  "clicked": 20,
  "bounced": 13,
  "unsubscribed": 2,
  "open_rate": 9.24,
  "click_rate": 4.11
}
```

## 5. Integration Example (Node/TypeScript)

```ts
function b64(v: string): string {
  return Buffer.from(v, "utf-8").toString("base64");
}

export function makePixel(baseUrl: string, recipientEmail: string, campaignId?: string): string {
  const cid = campaignId ? `&cid=${encodeURIComponent(campaignId)}` : "";
  return `${baseUrl}/api/tracking/pixel?data=${encodeURIComponent(b64(recipientEmail))}${cid}`;
}

export function makeTrackedLink(baseUrl: string, targetUrl: string, recipientEmail: string, campaignId?: string): string {
  const cid = campaignId ? `&cid=${encodeURIComponent(campaignId)}` : "";
  return `${baseUrl}/api/tracking/click?url=${encodeURIComponent(b64(targetUrl))}&email=${encodeURIComponent(b64(recipientEmail))}${cid}`;
}
```

## 6. Operational Notes

- Use HTTPS only for all tracking URLs.
- Always pass `campaign_id` (`cid`) when available to keep campaign-level analytics clean.
- Treat report/stats endpoints as protected APIs; they are not anonymous endpoints.
- The current analytics model is hash-based for recipient identity (`emailHash`).

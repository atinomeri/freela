# Sentry Setup & Alerting Guide

## Overview

Freela uses Sentry for error tracking, performance monitoring, and session replay.
The SDK is already integrated into the Next.js app with configurations for:
- Client-side (`sentry.client.config.ts`)
- Server-side (`sentry.server.config.ts`)
- Edge runtime (`sentry.edge.config.ts`)

## Quick Setup

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create account/login
2. Create new project: **Next.js**
3. Copy the DSN (looks like: `https://abc123@xxx.ingest.sentry.io/12345`)

### 2. Set Environment Variables

Add to `.env.local` (development) or production environment:

```bash
# Required
SENTRY_DSN=https://your-dsn@xxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@xxx.ingest.sentry.io/xxxxx

# Optional (defaults shown)
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1        # 10% of transactions
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 3. Deploy

The app will automatically start sending errors and performance data.

---

## Alert Configuration (Sentry Dashboard)

### Recommended Alert Rules

Create these alerts in Sentry Dashboard → Alerts → Create Alert Rule:

#### 1. High Error Rate Alert
- **Condition**: Error count > 10 in 5 minutes
- **Filter**: `level:error`
- **Action**: Email/Slack notification
- **Priority**: High

#### 2. Critical Error Alert
- **Condition**: Any new issue with `level:fatal`
- **Filter**: `level:fatal`
- **Action**: Immediate notification
- **Priority**: Critical

#### 3. Slow API Response
- **Condition**: Transaction duration > 5000ms
- **Filter**: `transaction:/api/*`
- **Action**: Email notification
- **Priority**: Medium

#### 4. Database Errors
- **Condition**: New issue with fingerprint `database-error`
- **Action**: Immediate notification
- **Priority**: High

#### 5. Authentication Failures
- **Condition**: Error count > 20 in 10 minutes
- **Filter**: `transaction:/api/auth/*`
- **Action**: Slack notification
- **Priority**: Medium

---

## Slack Integration

1. Go to Sentry → Settings → Integrations → Slack
2. Install Sentry app in your Slack workspace
3. Connect channel (e.g., `#freela-alerts`)
4. Update alert rules to send to Slack

### Recommended Channels
- `#freela-alerts` - All production errors
- `#freela-critical` - Fatal errors only
- `#freela-perf` - Performance issues

---

## Telegram Integration (via Webhook)

Sentry doesn't have native Telegram support, but you can use webhooks:

### Option 1: Sentry Webhook → Telegram Bot

1. Create Telegram bot via @BotFather
2. Get bot token and chat ID
3. Create webhook handler (example in `scripts/sentry-telegram-webhook.mjs`)

### Option 2: Use n8n/Zapier

Connect Sentry webhook to Telegram via automation platform.

---

## Monitor Dashboard

### Key Metrics to Watch

1. **Error Rate** - Errors per minute
2. **P95 Response Time** - 95th percentile API latency
3. **Session Health** - % of error-free sessions
4. **Apdex Score** - User satisfaction (target: 0.9+)

### Custom Tags (Already Configured)

The app automatically tags events with:
- `environment` - production/staging/development
- `transaction` - Normalized API endpoint
- User ID (when authenticated)

---

## Performance Monitoring

### What's Tracked

- **Web Vitals**: LCP, FID, CLS, TTFB
- **API Transactions**: Response times, throughput
- **Database Queries**: Prisma operations
- **External Calls**: Redis, email service

### Sampling Rates

| Environment | Traces | Profiles | Session Replay |
|-------------|--------|----------|----------------|
| Production  | 10%    | 10%      | 10% (100% on error) |
| Staging     | 50%    | 50%      | 100% |
| Development | 0%     | 0%       | 0% |

---

## Session Replay

Session Replay captures user interactions leading up to errors.

### Privacy Configuration

Currently configured in `sentry.client.config.ts`:
- `maskAllText: false` - Text is visible
- `blockAllMedia: false` - Media is visible

To increase privacy:
```typescript
Sentry.replayIntegration({
  maskAllText: true,
  blockAllMedia: true,
  maskAllInputs: true,
})
```

---

## Error Fingerprinting

Custom fingerprints for better grouping (configured in server config):

| Error Type | Fingerprint |
|------------|-------------|
| Rate limit errors | `rate-limit-error` |
| Database errors | `database-error` + first line |
| Dynamic routes | Normalized to `/:id` |

---

## Sensitive Data Filtering

The following is automatically redacted:
- `cookie` header
- `authorization` header
- `x-health-secret` header
- `password`, `confirmPassword`, `passwordHash`, `token` fields

---

## Troubleshooting

### Events Not Appearing

1. Check `SENTRY_DSN` is set correctly
2. Verify `enabled: true` in config
3. Check browser console for Sentry errors
4. Wait 1-2 minutes (events are batched)

### Too Many Events

1. Increase `ignoreErrors` list
2. Reduce `tracesSampleRate`
3. Add `denyUrls` for spam sources

### Performance Impact

Sentry adds ~20KB to client bundle. To reduce:
```typescript
// Only load Sentry in production
enabled: process.env.NODE_ENV === 'production' && Boolean(process.env.SENTRY_DSN)
```

---

## Useful Links

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Alerting Reference](https://docs.sentry.io/product/alerts/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

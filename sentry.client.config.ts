import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  
  // Performance Monitoring
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  
  // Session Replay - captures user sessions for debugging
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% if error occurs
  
  // Filter out common non-actionable errors
  ignoreErrors: [
    // Network errors
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    "Network request failed",
    // Browser extensions
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // User cancellation
    "AbortError",
    "The operation was aborted",
    // Navigation errors
    "Navigation cancelled",
    "cancelled",
  ],
  
  // Don't send errors from local development
  denyUrls: [
    /localhost/i,
    /127\.0\.0\.1/i,
    /extensions\//i,
    /^chrome:\/\//i,
  ],

  // Attach user context when available
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});


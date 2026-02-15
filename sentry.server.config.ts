import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  enabled: Boolean(process.env.SENTRY_DSN),
  
  // Performance Monitoring - sample 10% of transactions
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  
  // Profile 10% of sampled transactions for performance insights
  profilesSampleRate: 0.1,

  // Filter non-actionable errors
  ignoreErrors: [
    "ECONNRESET",
    "ENOTFOUND",
    "ETIMEDOUT",
    "socket hang up",
  ],

  // Custom fingerprinting for better issue grouping
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Group rate limit errors together
    if (error instanceof Error && error.message?.includes("Rate limit")) {
      event.fingerprint = ["rate-limit-error"];
    }
    
    // Group database connection errors
    if (error instanceof Error && error.message?.includes("prisma")) {
      event.fingerprint = ["database-error", error.message.split("\n")[0]];
    }

    // Remove sensitive data from request
    if (event.request?.headers) {
      delete event.request.headers["cookie"];
      delete event.request.headers["authorization"];
      delete event.request.headers["x-health-secret"];
    }
    if (event.request?.data) {
      // Redact password fields
      const sensitiveFields = ["password", "confirmPassword", "passwordHash", "token"];
      for (const field of sensitiveFields) {
        if (typeof event.request.data === "object" && event.request.data !== null && field in event.request.data) {
          (event.request.data as Record<string, unknown>)[field] = "[REDACTED]";
        }
      }
    }
    
    return event;
  },

  // Set transaction name from URL for better grouping
  beforeSendTransaction(event) {
    // Normalize dynamic route parameters
    if (event.transaction) {
      event.transaction = event.transaction
        .replace(/\/[a-f0-9-]{36}/gi, "/:id")
        .replace(/\/\d+/g, "/:id");
    }
    return event;
  },
});


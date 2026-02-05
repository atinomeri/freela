import "server-only";
import * as Sentry from "@sentry/nextjs";

type Extra = Record<string, unknown>;

export function reportError(message: string, err?: unknown, extra?: Extra) {
  try {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err ?? new Error(message), {
        tags: { area: "server" },
        extra: { message, ...(extra ?? {}) }
      });
    }
  } catch {
    // ignore
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(message, err, extra);
  } else {
    console.error(message);
  }
}


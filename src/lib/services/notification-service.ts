/**
 * Notification Service
 * Centralizes notification creation + realtime emission
 */
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime-bus";
import { reportError } from "@/lib/logger";

export type NotificationPayload = {
  userId: string;
  type: "MESSAGE" | "PROPOSAL_STATUS" | "NEW_PROPOSAL";
  title: string;
  body?: string;
  href?: string;
};

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  createdAt: true,
} as const;

/**
 * Create a notification in the DB and emit it via realtime.
 * Realtime errors are swallowed (best effort).
 */
export async function createAndEmit(payload: NotificationPayload) {
  const notification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      href: payload.href,
    },
    select: notificationSelect,
  });

  emitNotification(payload.userId, notification);

  return notification;
}

/**
 * Create multiple notifications and emit them.
 */
export async function createAndEmitBatch(payloads: NotificationPayload[]) {
  const results = await Promise.all(
    payloads.map((p) =>
      prisma.notification.create({
        data: {
          userId: p.userId,
          type: p.type,
          title: p.title,
          body: p.body,
          href: p.href,
        },
        select: notificationSelect,
      })
    )
  );

  // Group by userId for efficient emit
  const byUser = new Map<string, typeof results>();
  for (let i = 0; i < payloads.length; i++) {
    const userId = payloads[i]!.userId;
    const existing = byUser.get(userId) ?? [];
    existing.push(results[i]!);
    byUser.set(userId, existing);
  }

  for (const [userId, notifications] of byUser) {
    emitNotification(userId, notifications.length === 1 ? notifications[0]! : notifications);
  }

  return results;
}

/**
 * Emit an event via Redis Pub/Sub (best-effort, never throws).
 */
export async function emitEvent(
  type: string,
  toUserIds: string[],
  data: unknown
) {
  try {
    await publish("events", { type, toUserIds, data });
  } catch (e) {
    reportError("[notification-service] publish failed", e, { type, toUserIds });
  }
}

function emitNotification(userId: string, notification: unknown) {
  emitEvent("notification", [userId], { notification });
}

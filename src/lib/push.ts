/**
 * Push Notifications Utilities
 * Server-side functions for sending push notifications
 */

import webpush from "web-push";
import { prisma } from "./prisma";
import { reportError } from "./logger";

// VAPID keys configuration
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@freela.ge";

// Check if push is configured
export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

// Initialize web-push with VAPID keys
if (isPushConfigured()) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isPushConfigured()) {
    return { success: false, error: "Push notifications not configured" };
  }

  try {
    const fullPayload: PushPayload = {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: "/dashboard",
      ...payload,
    };

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(fullPayload),
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: "normal",
      }
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    
    // Handle expired/invalid subscription
    if (
      error instanceof webpush.WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      return { success: false, error: "subscription_expired" };
    }

    reportError("[Push] Failed to send notification", error, { message });
    return { success: false, error: message };
  }
}

/**
 * Send push notifications to multiple subscriptions
 * Returns array of results for each subscription
 */
export async function sendPushToMany(
  subscriptions: PushSubscriptionData[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      if (
        result.status === "fulfilled" &&
        result.value.error === "subscription_expired"
      ) {
        expired.push(subscriptions[index].endpoint);
      }
    }
  });

  return { sent, failed, expired };
}

/**
 * Get public VAPID key for client-side subscription
 */
export function getPublicVapidKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Send push notification to a specific user (all their devices)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  // Get all user's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const subsData = subscriptions.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }));

  const result = await sendPushToMany(subsData, payload);

  // Cleanup expired subscriptions
  if (result.expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: result.expired } },
    });
  }

  return { sent: result.sent, failed: result.failed };
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!isPushConfigured() || userIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Get all subscriptions for these users
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const subsData = subscriptions.map((s) => ({
    endpoint: s.endpoint,
    keys: { p256dh: s.p256dh, auth: s.auth },
  }));

  const result = await sendPushToMany(subsData, payload);

  // Cleanup expired subscriptions
  if (result.expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: result.expired } },
    });
  }

  return { sent: result.sent, failed: result.failed };
}

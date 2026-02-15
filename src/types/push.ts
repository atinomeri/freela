/**
 * Push Notification Types
 */

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export type PushPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface PushState {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  loading: boolean;
}

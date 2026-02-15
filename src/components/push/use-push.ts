"use client";

/**
 * Push Notification Hook
 * Client-side logic for Service Worker registration and push subscription
 */

import { useState, useEffect, useCallback } from "react";
import type { PushSubscriptionJSON, PushPermissionState, PushState } from "@/types/push";

// Convert base64 VAPID key to Uint8Array for pushManager
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// Get VAPID public key from env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

interface UsePushReturn extends PushState {
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export function usePush(): UsePushReturn {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: "prompt",
    subscribed: false,
    loading: true,
  });

  // Check initial state on mount
  useEffect(() => {
    const checkPushState = async () => {
      // Check browser support
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window &&
        Boolean(VAPID_PUBLIC_KEY);

      if (!supported) {
        setState({
          supported: false,
          permission: "unsupported",
          subscribed: false,
          loading: false,
        });
        return;
      }

      // Get notification permission
      const permission = Notification.permission as PushPermissionState;

      // Check if already subscribed
      let subscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        subscribed = subscription !== null;
      } catch (e) {
        console.error("[usePush] Error checking subscription:", e);
      }

      setState({
        supported,
        permission,
        subscribed,
        loading: false,
      });
    };

    // Register service worker first
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(() => checkPushState())
        .catch((err) => {
          console.error("[usePush] SW registration failed:", err);
          setState((prev) => ({ ...prev, loading: false }));
        });
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.supported) return "denied";

    const permission = await Notification.requestPermission();
    setState((prev) => ({ ...prev, permission: permission as PushPermissionState }));
    return permission;
  }, [state.supported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported || !VAPID_PUBLIC_KEY) return false;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Request permission if needed
      if (Notification.permission !== "granted") {
        const permission = await requestPermission();
        if (permission !== "granted") {
          setState((prev) => ({ ...prev, loading: false }));
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to server
      const subscriptionJSON = subscription.toJSON() as PushSubscriptionJSON;
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionJSON),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription on server");
      }

      setState((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("[usePush] Subscribe error:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.supported, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe locally
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("[usePush] Unsubscribe error:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.supported]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

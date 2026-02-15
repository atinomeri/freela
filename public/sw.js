/// <reference lib="webworker" />

/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks
 */

const SW_VERSION = "1.0.0";

// Cache name for offline assets (optional)
const CACHE_NAME = `freela-cache-v${SW_VERSION}`;

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[SW] Install v" + SW_VERSION);
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate v" + SW_VERSION);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Push event - show notification
self.addEventListener("push", (event) => {
  console.log("[SW] Push received");

  let data = {
    title: "Freela",
    body: "У вас новое уведомление",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: "default",
    url: "/dashboard",
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.error("[SW] Failed to parse push data", e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: "open", title: "Открыть" },
      { action: "close", title: "Закрыть" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click - open URL
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click");
  event.notification.close();

  const action = event.action;
  if (action === "close") return;

  const urlToOpen = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Optional: Handle push subscription change
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Subscription changed");
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.VAPID_PUBLIC_KEY,
    }).then((subscription) => {
      // Re-register subscription with server
      return fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
    })
  );
});

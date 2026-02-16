"use client";

import dynamic from "next/dynamic";

const RealtimeNotificationLink = dynamic(
  () => import("@/components/notifications/realtime-badge").then((m) => m.RealtimeNotificationLink),
  { ssr: false }
);

export function LazyRealtimeNotificationLink({ initialCount }: { initialCount: number }) {
  return <RealtimeNotificationLink initialCount={initialCount} />;
}

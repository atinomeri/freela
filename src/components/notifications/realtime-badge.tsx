"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";

export function RealtimeNotificationLink({ initialCount }: { initialCount: number }) {
  const t = useTranslations("realtimeNotifications");
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const es = new EventSource("/api/realtime");
    const onNotification = () => {
      setCount((c) => c + 1);
    };
    es.addEventListener("notification", onNotification as EventListener);
    es.onerror = () => es.close();
    return () => {
      es.removeEventListener("notification", onNotification as EventListener);
      es.close();
    };
  }, []);

  return (
    <Link
      href="/dashboard/notifications"
      className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-foreground/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground md:inline-flex"
      aria-label={count > 0 ? `${t("label")} (${count})` : t("label")}
      title={count > 0 ? `${t("label")} (${count})` : t("label")}
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {count > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-background bg-primary" /> : null}
    </Link>
  );
}

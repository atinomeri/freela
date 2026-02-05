"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
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
      className="hidden items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground md:inline-flex"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      <span>{t("label")}</span>
      {count > 0 ? <Badge>{count}</Badge> : null}
    </Link>
  );
}

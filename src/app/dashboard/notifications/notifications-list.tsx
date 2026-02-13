"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsList({ initial, locale }: { initial: NotificationItem[]; locale: string }) {
  const t = useTranslations("dashboardNotificationsList");
  const tNotifications = useTranslations("notifications");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  };

  const onItemClick = (item: NotificationItem) => async () => {
    if (!item.readAt) {
      await markRead(item.id);
    }
    if (item.href) {
      router.push(item.href);
    } else {
      router.refresh();
    }
  };

  const markAll = () => {
    startTransition(async () => {
      setError("");
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; updated?: number; error?: string; errorCode?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.markAllFailed"));
        return;
      }
      setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
      router.refresh();
    });
  };

  return (
    <div>
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <div className="flex justify-end">
        <Button type="button" size="sm" className="rounded-xl" variant="secondary" onClick={markAll} disabled={pending}>
          {pending ? t("sending") : t("markAllRead")}
        </Button>
      </div>
      <div className="mt-4 grid gap-3">
        {items.map((n) => (
          <Card
            key={n.id}
            className={`cursor-pointer rounded-2xl border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${n.readAt ? "opacity-75" : "border-primary/40"}`}
            onClick={onItemClick(n)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {(() => {
                    if (n.type === "NEW_PROPOSAL") return tNotifications("title.NEW_PROPOSAL");
                    if (n.type === "MESSAGE") return tNotifications("title.MESSAGE");
                    if (n.type === "PROPOSAL_STATUS") {
                      if (n.title === "ACCEPTED") return tNotifications("proposalStatus.ACCEPTED");
                      if (n.title === "REJECTED") return tNotifications("proposalStatus.REJECTED");
                      return n.title;
                    }
                    return n.title;
                  })()}
                </div>
                {(() => {
                  if (!n.body) return null;
                  if (n.type === "MESSAGE" && n.body.startsWith("ATTACHMENTS:")) {
                    const count = Number.parseInt(n.body.slice("ATTACHMENTS:".length), 10);
                    if (Number.isFinite(count)) {
                      return <div className="mt-1 text-sm text-muted-foreground">{tNotifications("body.attachments", { count })}</div>;
                    }
                  }
                  if (n.type === "MESSAGE" && n.body.startsWith("ATTACHMENT:")) {
                    const name = n.body.slice("ATTACHMENT:".length).trim();
                    return <div className="mt-1 text-sm text-muted-foreground">{tNotifications("body.attachment", { name })}</div>;
                  }
                  return <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>;
                })()}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(n.createdAt))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";

export function ProjectSubscriptionToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("dashboardHome");
  const [subscribed, setSubscribed] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSubscribed(initial);
  }, [initial]);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscribed: !subscribed })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; subscribed?: boolean } | null;
      if (json?.ok) {
        setSubscribed(json.subscribed ?? !subscribed);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={subscribed}
        disabled={loading}
        onClick={toggle}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
          subscribed ? "bg-primary" : "bg-muted",
          loading ? "opacity-50" : ""
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm transition-transform",
            subscribed ? "translate-x-5" : "translate-x-0"
          ].join(" ")}
        />
      </button>
      <span className="text-sm text-muted-foreground">{t("subscription.label")}</span>
    </label>
  );
}

"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePush } from "./use-push";
import { cn } from "@/lib/utils";

interface PushToggleProps {
  className?: string;
}

export function PushToggle({ className }: PushToggleProps) {
  const t = useTranslations("push");
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePush();

  // Don't render if not supported
  if (!supported) {
    return null;
  }

  const handleToggle = async () => {
    if (subscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Permission denied - show info
  if (permission === "denied") {
    return (
      <div className={cn("flex items-center gap-3 text-muted-foreground text-sm", className)}>
        <BellOff className="w-4 h-4" />
        <span>{t("blocked")}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
        "hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed",
        subscribed
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card",
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : subscribed ? (
        <Bell className="w-5 h-5 text-primary" />
      ) : (
        <BellOff className="w-5 h-5 text-muted-foreground" />
      )}
      <div className="flex-1 text-left">
        <div className="font-medium text-sm">
          {subscribed ? t("enabled") : t("disabled")}
        </div>
        <div className="text-xs text-muted-foreground">
          {subscribed ? t("enabledDesc") : t("disabledDesc")}
        </div>
      </div>
    </button>
  );
}

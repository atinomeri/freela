"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MailerLoginPage } from "../login-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { RefreshCcw } from "lucide-react";
import { formatGeorgianDateTime } from "@/lib/date";

interface WarmupSender {
  senderKey: string;
  firstSeenAt: string;
  day: number;
  limit: number;
  sentToday: number;
  remainingToday: number;
  totalSent: number;
  createdAt: string;
  updatedAt: string;
}

interface WarmupPayload {
  enabled: boolean;
  config: {
    start: number;
    increment: number;
    max: number;
  };
  senders: WarmupSender[];
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

export default function MailerWarmupPage() {
  const { user, apiFetch } = useMailerAuth();
  const t = useTranslations("mailer");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [resettingSender, setResettingSender] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [data, setData] = useState<WarmupPayload | null>(null);

  const loadWarmup = useCallback(async () => {
    setError("");
    try {
      const res = await apiFetch("/api/desktop/warmup");
      if (!res.ok) throw new Error(t("errors.warmupLoadFailed"));
      const body = (await res.json()) as { data: WarmupPayload };
      setData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.warmupLoadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, t]);

  useEffect(() => {
    if (!user) return;
    void loadWarmup();
  }, [user, loadWarmup]);

  if (!user) return <MailerLoginPage />;

  function getApiError(body: ApiErrorShape | null, fallback: string): string {
    const apiError = body?.error;
    if (typeof apiError === "string") return apiError;
    if (typeof apiError?.message === "string") return apiError.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function resetAll() {
    setResettingAll(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.warmupResetFailed")));
      }
      setRefreshing(true);
      await loadWarmup();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.warmupResetFailed"));
    } finally {
      setResettingAll(false);
    }
  }

  async function resetSender(senderKey: string) {
    setResettingSender(senderKey);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderKey }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.warmupResetFailed")));
      }
      setRefreshing(true);
      await loadWarmup();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.warmupResetFailed"));
    } finally {
      setResettingSender(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("warmup.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("warmup.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll} loading={resettingAll}>
          <RefreshCcw className="h-4 w-4" />
          {t("actions.resetAllWarmup")}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t("warmup.noData")}</p>
      ) : (
        <>
          <Card className="mb-4 p-6" hover={false}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("warmup.enabled")}</p>
                <p className="mt-1 text-sm font-medium">
                  {data.enabled ? t("warmup.enabledYes") : t("warmup.enabledNo")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("warmup.startLimit")}</p>
                <p className="mt-1 text-sm font-medium">{data.config.start}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("warmup.increment")}</p>
                <p className="mt-1 text-sm font-medium">{data.config.increment}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("warmup.max")}</p>
                <p className="mt-1 text-sm font-medium">
                  {data.config.max > 0 ? data.config.max : t("warmup.unlimited")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" hover={false}>
            {data.senders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("warmup.empty")}</p>
            ) : (
              <div className="space-y-3">
                {data.senders.map((sender) => (
                  <div key={sender.senderKey} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{sender.senderKey}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t("warmup.dayLine", {
                            day: sender.day,
                            limit: sender.limit,
                            sent: sender.sentToday,
                            remaining: sender.remainingToday,
                            total: sender.totalSent,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("warmup.firstSeenAt")}: {formatGeorgianDateTime(sender.firstSeenAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sender.remainingToday > 0 ? "warning" : "success"} size="sm">
                          {sender.remainingToday > 0
                            ? t("warmup.remaining")
                            : t("warmup.doneForToday")}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={resettingSender === sender.senderKey}
                          onClick={() => resetSender(sender.senderKey)}
                        >
                          {t("actions.resetSenderWarmup")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {refreshing && (
        <p className="mt-3 text-xs text-muted-foreground">{t("common.loading")}</p>
      )}
    </div>
  );
}

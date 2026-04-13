"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailerLoginPage } from "../login-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldAlert } from "lucide-react";

interface BounceAccountResult {
  accountId: string;
  checked: number;
  hard: number;
  soft: number;
  unknown: number;
  addresses: string[];
  error?: string;
}

interface BounceScanResult {
  checked: number;
  hard: number;
  soft: number;
  unknown: number;
  detectedHardAddresses: number;
  addedToSuppression: number;
  accounts: BounceAccountResult[];
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

export default function MailerBouncePage() {
  const { user, apiFetch } = useMailerAuth();
  const t = useTranslations("mailer");

  const [mailbox, setMailbox] = useState("INBOX");
  const [maxMessages, setMaxMessages] = useState("100");
  const [markAsSeen, setMarkAsSeen] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BounceScanResult | null>(null);

  if (!user) return <MailerLoginPage />;

  function getApiError(body: ApiErrorShape | null, fallback: string): string {
    const apiError = body?.error;
    if (typeof apiError === "string") return apiError;
    if (typeof apiError?.message === "string") return apiError.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/bounce/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailbox,
          maxMessages: Number(maxMessages),
          markAsSeen,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.bounceScanFailed")));
      }
      const body = (await res.json()) as { data: BounceScanResult };
      setResult(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.bounceScanFailed"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("bounce.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("bounce.description")}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="p-6" hover={false}>
        <form className="grid gap-4" onSubmit={runScan}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("bounce.mailboxLabel")}</span>
              <Input value={mailbox} onChange={(e) => setMailbox(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("bounce.maxMessagesLabel")}</span>
              <Input
                type="number"
                min={1}
                max={500}
                value={maxMessages}
                onChange={(e) => setMaxMessages(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={markAsSeen}
                onChange={(e) => setMarkAsSeen(e.target.checked)}
              />
              {t("bounce.markAsSeen")}
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={running}>
              <Search className="h-4 w-4" />
              {t("actions.runBounceScan")}
            </Button>
          </div>
        </form>
      </Card>

      {result && (
        <Card className="mt-4 p-6" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">{t("bounce.resultTitle")}</h2>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("bounce.checked")}</p>
              <p className="mt-1 text-xl font-semibold">{result.checked}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("bounce.hardBounces")}</p>
              <p className="mt-1 text-xl font-semibold text-destructive">{result.hard}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("bounce.addedToSuppression")}</p>
              <p className="mt-1 text-xl font-semibold text-success">{result.addedToSuppression}</p>
            </div>
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            {t("bounce.summaryLine", {
              soft: result.soft,
              unknown: result.unknown,
              detected: result.detectedHardAddresses,
            })}
          </p>

          <div className="space-y-2">
            {result.accounts.map((account) => (
              <div key={account.accountId} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{account.accountId}</p>
                  {account.error ? (
                    <Badge variant="destructive" size="sm">
                      {t("bounce.accountError")}
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      {t("bounce.accountOk")}
                    </Badge>
                  )}
                </div>
                {account.error ? (
                  <p className="mt-1 text-xs text-destructive">{account.error}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("bounce.accountStats", {
                      checked: account.checked,
                      hard: account.hard,
                      soft: account.soft,
                      unknown: account.unknown,
                    })}
                  </p>
                )}
                {account.addresses.length > 0 && (
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {account.addresses.slice(0, 8).join(", ")}
                    {account.addresses.length > 8 ? " ..." : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

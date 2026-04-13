"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MailerLoginPage } from "../login-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface SpamCheckResult {
  name: string;
  description: string;
  score: number;
  passed: boolean;
  severity: "info" | "warning" | "danger";
}

interface SpamReport {
  totalScore: number;
  maxScore: number;
  riskLevel: "low" | "medium" | "high";
  checks: SpamCheckResult[];
}

interface DeliverabilityCheck {
  name: "SPF" | "DKIM" | "DMARC" | "MX";
  status: "pass" | "warn" | "fail";
  message: string;
  fixHint?: string;
  rawRecord?: string;
}

interface DeliverabilityReport {
  domain: string;
  score: number;
  riskLevel: "low" | "medium" | "high";
  passed: number;
  total: number;
  checks: DeliverabilityCheck[];
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

function riskVariant(riskLevel: "low" | "medium" | "high") {
  if (riskLevel === "low") return "success" as const;
  if (riskLevel === "medium") return "warning" as const;
  return "destructive" as const;
}

function checkVariant(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "success" as const;
  if (status === "warn") return "warning" as const;
  return "destructive" as const;
}

export default function MailerPreflightPage() {
  const { user, apiFetch } = useMailerAuth();
  const t = useTranslations("mailer");

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [spamReport, setSpamReport] = useState<SpamReport | null>(null);
  const [spamLoading, setSpamLoading] = useState(false);

  const [target, setTarget] = useState("");
  const [selectors, setSelectors] = useState("");
  const [deliverability, setDeliverability] = useState<DeliverabilityReport | null>(null);
  const [deliverabilityLoading, setDeliverabilityLoading] = useState(false);

  const [error, setError] = useState("");

  if (!user) return <MailerLoginPage />;

  function getApiError(body: ApiErrorShape | null, fallback: string): string {
    const apiError = body?.error;
    if (typeof apiError === "string") return apiError;
    if (typeof apiError?.message === "string") return apiError.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function runSpamCheck(e: React.FormEvent) {
    e.preventDefault();
    setSpamLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/preflight/spam-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.preflightSpamFailed")));
      }
      const body = (await res.json()) as { data: SpamReport };
      setSpamReport(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.preflightSpamFailed"));
    } finally {
      setSpamLoading(false);
    }
  }

  async function runDeliverabilityCheck(e: React.FormEvent) {
    e.preventDefault();
    setDeliverabilityLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const trimmedTarget = target.trim();
      if (trimmedTarget.length > 0) {
        if (trimmedTarget.includes("@")) {
          params.set("senderEmail", trimmedTarget);
        } else {
          params.set("domain", trimmedTarget);
        }
      }
      selectors
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => params.append("dkimSelector", item));

      const res = await apiFetch(`/api/desktop/preflight/deliverability?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.preflightDeliverabilityFailed")));
      }
      const body = (await res.json()) as { data: DeliverabilityReport };
      setDeliverability(body.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.preflightDeliverabilityFailed"),
      );
    } finally {
      setDeliverabilityLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("preflight.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("preflight.description")}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">{t("preflight.spamTitle")}</h2>
          </div>

          <form className="grid gap-3" onSubmit={runSpamCheck}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("preflight.subjectLabel")}</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("preflight.htmlLabel")}</span>
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="min-h-[180px] font-mono text-xs"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" loading={spamLoading}>
                {t("actions.runSpamCheck")}
              </Button>
            </div>
          </form>

          {spamReport && (
            <div className="mt-5 space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {t("preflight.scoreLabel", {
                    score: spamReport.totalScore,
                    max: spamReport.maxScore,
                  })}
                </p>
                <Badge variant={riskVariant(spamReport.riskLevel)}>
                  {t(`preflight.risk.${spamReport.riskLevel}`)}
                </Badge>
              </div>

              <div className="space-y-2">
                {spamReport.checks.map((check, index) => (
                  <div key={`${check.name}-${index}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{check.name}</p>
                      <Badge
                        variant={
                          check.severity === "danger"
                            ? "destructive"
                            : check.severity === "warning"
                              ? "warning"
                              : "secondary"
                        }
                        size="sm"
                      >
                        +{check.score}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{check.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("preflight.deliverabilityTitle")}</h2>
          </div>

          <form className="grid gap-3" onSubmit={runDeliverabilityCheck}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("preflight.targetLabel")}</span>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={t("preflight.targetPlaceholder")}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">{t("preflight.selectorLabel")}</span>
              <Input
                value={selectors}
                onChange={(e) => setSelectors(e.target.value)}
                placeholder={t("preflight.selectorPlaceholder")}
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" loading={deliverabilityLoading}>
                {t("actions.runDeliverability")}
              </Button>
            </div>
          </form>

          {deliverability && (
            <div className="mt-5 space-y-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t("preflight.deliverabilitySummary", {
                    domain: deliverability.domain,
                    score: deliverability.score,
                    passed: deliverability.passed,
                    total: deliverability.total,
                  })}
                </p>
                <Badge variant={riskVariant(deliverability.riskLevel)}>
                  {t(`preflight.risk.${deliverability.riskLevel}`)}
                </Badge>
              </div>

              <div className="space-y-2">
                {deliverability.checks.map((check) => (
                  <div key={check.name} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{check.name}</p>
                      <Badge variant={checkVariant(check.status)} size="sm">
                        {check.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{check.message}</p>
                    {check.fixHint && (
                      <p className="mt-1 text-xs text-warning">{check.fixHint}</p>
                    )}
                    {check.rawRecord && (
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        {check.rawRecord}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

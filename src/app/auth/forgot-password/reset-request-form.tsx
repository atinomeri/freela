"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export function ForgotPasswordForm() {
  const t = useTranslations("authForgotPasswordForm");
  const tApiErrors = useTranslations("apiErrors");
  const tApiMessages = useTranslations("apiMessages");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().toLowerCase().includes("@"), [email]);

  return (
    <Card className="mt-6 p-6">
      {error ? (
        <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      {okMessage ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{okMessage}</div>
      ) : null}
      {debugResetUrl ? (
        <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
          {t("devLink")}{" "}
          <a className="underline break-all" href={debugResetUrl}>
            {debugResetUrl}
          </a>
        </div>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          setOkMessage("");
          setDebugResetUrl(null);
          try {
            const res = await fetch("/api/password-reset/request", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: email.trim().toLowerCase() })
            });
            const json = (await res.json().catch(() => null)) as
              | { ok?: boolean; error?: string; errorCode?: string; messageCode?: string; debugResetUrl?: string }
              | null;

            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.generic"));
              return;
            }

            setOkMessage(json.messageCode ? tApiMessages(json.messageCode) : t("successGeneric"));
            if (json.debugResetUrl) setDebugResetUrl(json.debugResetUrl);
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("email")}</span>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            required
          />
        </label>

        <Button type="submit" className="mt-1 h-11" disabled={pending || !canSubmit}>
          {pending ? t("loading") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("authResetPasswordForm");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!token) e.token = t("errors.invalidToken");
    if (password.length < 8) e.password = t("errors.passwordMin");
    if (!confirmPassword) e.confirmPassword = t("errors.confirmRequired");
    if (password && confirmPassword && password !== confirmPassword) e.confirmPassword = t("errors.passwordsMismatch");
    return e;
  }, [confirmPassword, password, t, token]);

  const canSubmit = Object.keys(errors).length === 0;

  return (
    <Card className="mt-6 p-6">
      {error ? (
        <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          {t("successRedirect")}
        </div>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setPending(true);
          setError("");
          try {
            const res = await fetch("/api/password-reset/confirm", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token, password, confirmPassword })
            });
            const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.generic"));
              return;
            }
            setOk(true);
            setTimeout(() => router.push("/auth/login"), 800);
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("newPassword")}</span>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
          <span className="min-h-4 text-xs">
            {errors.password ? <span className="text-destructive">{errors.password}</span> : null}
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("confirmPassword")}</span>
          <Input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
          <span className="min-h-4 text-xs">
            {errors.confirmPassword ? <span className="text-destructive">{errors.confirmPassword}</span> : null}
            {!errors.confirmPassword && errors.token ? <span className="text-destructive">{errors.token}</span> : null}
          </span>
        </label>

        <Button type="submit" className="mt-1 h-11" disabled={pending || !canSubmit}>
          {pending ? t("loading") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}

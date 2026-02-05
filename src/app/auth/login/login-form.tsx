"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("authLoginForm");
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") ?? "/dashboard";
  const error = sp.get("error");

  const errorText = useMemo(() => {
    if (!error) return "";
    if (error === "CredentialsSignin") return t("errors.invalidCredentials");
    return t("errors.generic");
  }, [error, t]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Card className="mt-6 p-6">
      {errorText ? (
        <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">
          {errorText}
        </div>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          try {
            await signIn("credentials", { email, password, callbackUrl });
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

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("password")}</span>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <Button type="submit" className="mt-1 h-11" disabled={pending}>
          {pending ? t("loading") : t("submit")}
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/auth/forgot-password">
            {t("forgotPassword")}
          </Link>
        </div>
      </form>
    </Card>
  );
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("globalError");

  useEffect(() => {
    // Keep a minimal client-side log for unexpected runtime errors.
    // Server errors should be captured via server logging/Sentry.
    if (process.env.NODE_ENV !== "production") {
      console.error("[app] global error", error);
    }
  }, [error]);

  return (
    <Container className="py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={reset}>
          {t("retry")}
        </Button>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/">
          {t("home")}
        </Link>
      </div>
    </Container>
  );
}

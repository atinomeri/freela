"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const LOCALES = ["ka", "en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

export function LocaleSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const current = useMemo(() => (LOCALES.includes(locale) ? locale : "ka"), [locale]);

  return (
    <label className="hidden items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground sm:inline-flex">
      <span className="sr-only">{t("label")}</span>
      <select
        className="bg-transparent text-xs text-foreground outline-none"
        value={current}
        onChange={(e) => {
          const next = e.target.value as Locale;
          // Persist language preference without changing the URL structure.
          document.cookie = `NEXT_LOCALE=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
          const qs = searchParams.toString();
          router.push(`${pathname}${qs ? `?${qs}` : ""}`);
          router.refresh();
        }}
      >
        <option value="ka">{t("ka")}</option>
        <option value="en">{t("en")}</option>
        <option value="ru">{t("ru")}</option>
      </select>
    </label>
  );
}

"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

const LOCALES = ["ka", "en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

export function LocaleSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const current = useMemo(() => (LOCALES.includes(locale) ? locale : "ka"), [locale]);

  const changeLocale = (next: Locale) => {
    if (next === current) return;
    // eslint-disable-next-line react-hooks/immutability -- Persist user locale preference in a cookie.
    window.document.cookie = `NEXT_LOCALE=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const qs = searchParams.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    router.refresh();
  };

  return (
    <div className="hidden sm:inline-flex">
      <Dropdown>
        <DropdownTrigger
          className="h-10 gap-2 rounded-xl border border-border/70 bg-card px-4 text-sm font-medium text-foreground/90 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:bg-muted/55"
          aria-label={t("label")}
        >
          <span>{t(current)}</span>
        </DropdownTrigger>
        <DropdownContent align="end" className="min-w-[140px]">
          <DropdownLabel>{t("label")}</DropdownLabel>
          {LOCALES.map((loc) => (
            <DropdownItem
              key={loc}
              onClick={() => changeLocale(loc)}
              icon={loc === current ? <Check className="h-4 w-4" /> : undefined}
              className={cn(loc === current && "font-medium")}
            >
              {t(loc)}
            </DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

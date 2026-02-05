"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Item = { href: string; label: string };

export function MobileNav({ items }: { items: readonly Item[] }) {
  const t = useTranslations("mobileNav");
  const pathname = usePathname();
  return <MobileNavInner key={pathname} t={t} pathname={pathname ?? ""} items={items} />;
}

function MobileNavInner({ items, pathname, t }: { items: readonly Item[]; pathname: string; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);

  const activeHref = useMemo(() => {
    if (!pathname) return "";
    const exact = items.find((i) => i.href === pathname)?.href;
    if (exact) return exact;
    // Basic "startsWith" active state for nested pages like /projects/[id]
    return items.find((i) => i.href !== "/" && pathname.startsWith(i.href))?.href ?? "";
  }, [items, pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-sm text-foreground shadow-sm backdrop-blur-sm"
        aria-label={t("menu")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{t("menu")}</span>
        <div className="grid gap-1">
          <span className="block h-0.5 w-5 rounded bg-foreground/70" />
          <span className="block h-0.5 w-5 rounded bg-foreground/70" />
          <span className="block h-0.5 w-5 rounded bg-foreground/70" />
        </div>
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label={t("close")}
          onClick={() => setOpen(false)}
        />

        <div
          className={cn(
            "absolute right-0 top-0 h-dvh w-80 max-w-[85vw] border-l border-border bg-background shadow-xl transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div className="text-sm font-semibold">{t("menu")}</div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/70 text-sm"
              aria-label={t("close")}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="grid gap-1 p-2">
            {items.map((i) => {
              const active = i.href === activeHref;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {i.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

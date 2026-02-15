"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { LogOut, LayoutDashboard, LogIn, UserPlus } from "lucide-react";

type Item = { href: string; label: string };

export function MobileNav({ items }: { items: readonly Item[] }) {
  const t = useTranslations("mobileNav");
  const tAuth = useTranslations("authButtons");
  const pathname = usePathname();
  const { data: session, status } = useSession();
  
  return (
    <MobileNavInner 
      key={pathname} 
      t={t} 
      tAuth={tAuth}
      pathname={pathname ?? ""} 
      items={items} 
      session={session}
      sessionStatus={status}
    />
  );
}

type MobileNavInnerProps = {
  items: readonly Item[];
  pathname: string;
  t: (key: string) => string;
  tAuth: (key: string) => string;
  session: { user?: { name?: string | null; email?: string | null } } | null;
  sessionStatus: "loading" | "authenticated" | "unauthenticated";
};

function MobileNavInner({ items, pathname, t, tAuth, session, sessionStatus }: MobileNavInnerProps) {
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-sm text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
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
            "absolute right-0 top-0 h-dvh w-80 max-w-[85vw] border-l border-border bg-background/95 shadow-xl backdrop-blur-xl transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4">
            <div className="text-sm font-semibold">{t("menu")}</div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70 text-sm shadow-sm transition-colors hover:bg-background"
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

          {/* Auth section */}
          <div className="border-t border-border/70 p-2">
            {sessionStatus === "loading" ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">...</div>
            ) : session?.user ? (
              <div className="grid gap-1">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors",
                    pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {tAuth("dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut({ callbackUrl: "/" });
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {tAuth("logout")}
                </button>
              </div>
            ) : (
              <div className="grid gap-1">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-foreground/80 transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <LogIn className="h-4 w-4" />
                  {tAuth("login")}
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary transition-colors hover:bg-primary/20"
                >
                  <UserPlus className="h-4 w-4" />
                  {tAuth("register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

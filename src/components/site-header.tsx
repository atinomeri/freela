import { AuthButtons } from "@/components/auth/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { getUnlistedPaths } from "@/lib/site-pages";
import { BrandLogo } from "@/components/brand-logo";
import dynamic from "next/dynamic";

const MobileNav = dynamic(() => import("@/components/mobile-nav").then((m) => m.MobileNav), {
  ssr: false
});

const RealtimeNotificationLink = dynamic(
  () => import("@/components/notifications/realtime-badge").then((m) => m.RealtimeNotificationLink),
  { ssr: false }
);

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const session = await getServerSession(authOptions);
  const unreadCount = session?.user
    ? await prisma.notification.count({ where: { userId: session.user.id, readAt: null } })
    : 0;

  const navAll = [
    { href: "/projects", label: t("projects") },
    { href: "/freelancers", label: t("freelancers") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") }
  ] as const;

  const unlisted = await getUnlistedPaths(navAll.map((n) => n.href));
  const nav = navAll.filter((n) => !unlisted.has(n.href));

  return (
    <header className="sticky top-0 z-40 bg-background/90 pwa-header safe-x">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-4">
          <BrandLogo priority />
        </Link>

        <nav className="hidden items-center gap-2 rounded-2xl bg-card p-2 shadow-soft md:flex">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 rounded-2xl bg-card px-2 py-2 shadow-soft">
          <MobileNav items={nav} />
          <ThemeToggle />
          <LocaleSwitcher />
          {session?.user ? <RealtimeNotificationLink initialCount={unreadCount} /> : null}
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}

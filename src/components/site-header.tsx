import { AuthButtons } from "@/components/auth/auth-buttons";
import { RealtimeNotificationLink } from "@/components/notifications/realtime-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import Image from "next/image";
import { MobileNav } from "@/components/mobile-nav";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { getUnlistedPaths } from "@/lib/site-pages";

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
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm">
            <Image src="/mark.svg" alt="Freela" width={40} height={40} priority />
          </span>
          <span className="font-semibold tracking-tight">Freela</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn("text-sm text-foreground/70 transition-colors hover:text-foreground")}
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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

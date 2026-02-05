import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { NotificationsList } from "@/app/dashboard/notifications/notifications-list";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardNotifications");
  return { title: t("title"), description: t("subtitle") };
}

export default async function NotificationsPage() {
  const locale = await getLocale();
  const t = await getTranslations("dashboardNotifications");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true }
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null }
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/dashboard">
          {t("dashboard")}
        </Link>
      </div>

      {notifications.length === 0 ? (
        <Card className="mt-6 p-6">
          <div className="font-medium">{t("emptyTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptySubtitle")}</div>
        </Card>
      ) : (
        <div className="mt-6">
          <div className="text-sm text-muted-foreground">{t("unread", { count: unreadCount })}</div>
          <NotificationsList
            locale={locale}
            initial={notifications.map((n) => ({
              ...n,
              readAt: n.readAt ? n.readAt.toISOString() : null,
              createdAt: n.createdAt.toISOString()
            }))}
          />
        </div>
      )}
    </Container>
  );
}

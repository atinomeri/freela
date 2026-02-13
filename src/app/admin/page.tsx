import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("adminPage");
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("forbiddenTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
      </Card>
    );
  }

  const [usersCount, projectsCount, openProjectsCount, disabledUsersCount] = await prisma.$transaction([
    prisma.user.count(),
    prisma.project.count(),
    prisma.project.count({ where: { isOpen: true } }),
    prisma.user.count({ where: { isDisabled: true } })
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">{t("cards.users")}</div>
        <div className="mt-2 text-3xl font-semibold">{usersCount}</div>
      </Card>
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">{t("cards.projects")}</div>
        <div className="mt-2 text-3xl font-semibold">{projectsCount}</div>
      </Card>
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">{t("cards.openProjects")}</div>
        <div className="mt-2 text-3xl font-semibold">{openProjectsCount}</div>
      </Card>
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">{t("cards.disabledUsers")}</div>
        <div className="mt-2 text-3xl font-semibold">{disabledUsersCount}</div>
      </Card>
    </div>
  );
}


import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardHome");
  return { title: t("title"), description: t("subtitle") };
}

function ActionLink({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground/85 shadow-sm backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboardHome");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const isEmployer = session.user.role === "EMPLOYER";
  const isFreelancer = session.user.role === "FREELANCER";
  const isAdmin = session.user.role === "ADMIN";

  const [unreadCount, employerProjectsCount, employerAcceptedProposalsCount] = await Promise.all([
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
    isEmployer ? prisma.project.count({ where: { employerId: session.user.id } }) : Promise.resolve(0),
    isEmployer
      ? prisma.proposal.count({ where: { status: "ACCEPTED", project: { employerId: session.user.id } } })
      : Promise.resolve(0)
  ]);

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("hello")} <span className="font-medium text-foreground">{session.user.name}</span>.
          </p>
        </div>
        <ButtonLink href="/" variant="secondary" size="sm" className="rounded-xl">
          {t("home")}
        </ButtonLink>
      </div>

      {isEmployer ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">{t("stats.projectsPublished")}</div>
            <div className="mt-2 text-3xl font-semibold">{employerProjectsCount}</div>
          </Card>
          <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">{t("stats.acceptedProposals")}</div>
            <div className="mt-2 text-3xl font-semibold">{employerAcceptedProposalsCount}</div>
          </Card>
        </div>
      ) : null}

      <Card className="mt-8 rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
          {isEmployer ? (
            <>
              <ActionLink href="/projects/new">{t("actions.postProject")}</ActionLink>
              <ActionLink href="/dashboard/projects">{t("actions.myProjects")}</ActionLink>
            </>
          ) : null}

          {isFreelancer ? (
            <>
              <ActionLink href="/dashboard/profile">{t("actions.profile")}</ActionLink>
              <ActionLink href="/dashboard/proposals">{t("actions.myProposals")}</ActionLink>
            </>
          ) : null}

          <ActionLink href="/dashboard/notifications">
            {t("actions.notifications")} {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : null}
          </ActionLink>

          {isAdmin ? <ActionLink href="/admin">{t("actions.admin")}</ActionLink> : null}
        </div>
      </Card>
    </Container>
  );
}

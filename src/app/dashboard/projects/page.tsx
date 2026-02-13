import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatLongDate } from "@/lib/date";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProjectStatusButton } from "@/app/dashboard/projects/project-status-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardProjects");
  return { title: t("title"), description: t("subtitle") };
}

export default async function MyProjectsPage() {
  const locale = await getLocale();
  const t = await getTranslations("dashboardProjects");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "EMPLOYER") redirect("/dashboard");

  const projects = await prisma.project.findMany({
    where: { employerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true, budgetGEL: true, isOpen: true, completedAt: true, _count: { select: { proposals: true } } }
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <ButtonLink href="/projects/new" size="sm" className="rounded-xl">{t("postProject")}</ButtonLink>
      </div>

      {projects.length === 0 ? (
        <Card className="mt-6 rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="font-medium">{t("emptyTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptySubtitle")}</div>
          <div className="mt-4">
            <ButtonLink href="/projects/new" size="sm" className="rounded-xl">{t("postProject")}</ButtonLink>
          </div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {projects.map((p) => {
            const count = p._count.proposals;
            const status = p.completedAt ? "completed" : p.isOpen ? "open" : "canceled";
            return (
              <Card key={p.id} className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("added")}:</span> {formatLongDate(p.createdAt, locale)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      {p.budgetGEL ? `${p.budgetGEL} ₾` : t("budgetMissing")}
                    </div>
                    <Badge>
                      {t("proposalsCount", { count })}
                    </Badge>
                    <Badge
                      className={
                        status === "open"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : status === "completed"
                            ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                      }
                    >
                      {status === "open" ? t("statusOpen") : status === "completed" ? t("statusCompleted") : t("statusCanceled")}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <Link
                      className="text-muted-foreground underline hover:text-foreground"
                      href={`/dashboard/projects/${p.id}`}
                    >
                      {t("viewProposals")}
                    </Link>
                  </div>
                    <div className="w-full sm:w-auto">
                    {status !== "completed" ? <ProjectStatusButton projectId={p.id} isOpen={p.isOpen} /> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        <Link className="underline hover:text-foreground" href="/dashboard">
          {t("backToDashboard")}
        </Link>
      </div>
    </Container>
  );
}

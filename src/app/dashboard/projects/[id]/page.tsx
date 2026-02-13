import { ProposalActions } from "@/app/dashboard/projects/[id]/proposal-actions";
import { StartChatButton } from "@/app/dashboard/projects/[id]/start-chat-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { proposalStatusLabel } from "@/lib/proposal-status";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatLongDate } from "@/lib/date";
import { ProjectStatusButton } from "@/app/dashboard/projects/project-status-button";
import { CompleteProjectButton } from "@/app/dashboard/projects/complete-project-button";
import { ReviewForm } from "@/app/dashboard/projects/[id]/review-form";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardProjectDetail");
  return { title: t("title"), description: t("subtitle") };
}

export default async function EmployerProjectDetailPage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("dashboardProjectDetail");
  const tStatuses = await getTranslations("proposalStatus");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "EMPLOYER") redirect("/dashboard");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, employerId: session.user.id },
    select: { id: true, title: true, description: true, budgetGEL: true, createdAt: true, isOpen: true, completedAt: true }
  });

  if (!project) notFound();

  const reviewed = await prisma.review.findMany({
    where: { projectId: id },
    select: { freelancerId: true }
  });
  const reviewedSet = new Set(reviewed.map((r) => r.freelancerId));

  const proposals = await prisma.proposal.findMany({
    where: { projectId: id, project: { employerId: session.user.id } },
    orderBy: { createdAt: "desc" },
    include: { freelancer: { select: { id: true, name: true } } }
  });

  const status = project.completedAt ? "completed" : project.isOpen ? "open" : "canceled";

  return (
    <Container className="py-12 sm:py-16">
      <div className="text-sm text-muted-foreground">
        <Link className="underline hover:text-foreground" href="/dashboard/projects">
          {t("breadcrumbMyProjects")}
        </Link>{" "}
        / <span className="text-foreground">{project.title}</span>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
              <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("added")}:</span> {formatLongDate(project.createdAt, locale)}
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
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
              {status !== "completed" ? <ProjectStatusButton projectId={project.id} isOpen={project.isOpen} /> : null}
              {status === "open" ? <CompleteProjectButton projectId={project.id} /> : null}
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">{project.description}</div>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">{t("budget")} </span>
            {project.budgetGEL ? `${project.budgetGEL} ₾` : t("notSpecified")}
          </div>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="text-sm font-medium text-muted-foreground">{t("proposalsTitle")}</div>
          {proposals.length === 0 ? (
            <div className="mt-3 text-sm text-muted-foreground">{t("proposalsEmpty")}</div>
          ) : (
            <div className="mt-4 grid gap-3">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link className="font-medium underline hover:text-foreground" href={`/freelancers/${proposal.freelancer.id}`}>
                      {proposal.freelancer.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
                        new Date(proposal.createdAt)
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Badge
                      className={
                        proposal.status === "ACCEPTED"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : proposal.status === "REJECTED"
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : undefined
                      }
                    >
                      {proposalStatusLabel(proposal.status, tStatuses)}
                    </Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{proposal.message}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t("price")} {proposal.priceGEL ? `${proposal.priceGEL} ₾` : t("notSpecified")}
                  </div>
                  {proposal.status === "PENDING" ? (
                    <ProposalActions proposalId={proposal.id} disabled={false} />
                  ) : null}
                  {proposal.status !== "REJECTED" ? (
                    <StartChatButton projectId={project.id} freelancerId={proposal.freelancer.id} />
                  ) : null}
                  {status === "completed" && proposal.status === "ACCEPTED" ? (
                    reviewedSet.has(proposal.freelancer.id) ? (
                      <div className="mt-3 text-xs text-muted-foreground">{t("reviewedAlready")}</div>
                    ) : (
                      <ReviewForm
                        projectId={project.id}
                        freelancerId={proposal.freelancer.id}
                        freelancerName={proposal.freelancer.name}
                      />
                    )
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Container>
  );
}

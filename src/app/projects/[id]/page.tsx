import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ApplyForm } from "@/app/projects/[id]/apply-form";
import { Badge } from "@/components/ui/badge";
import { proposalStatusLabel } from "@/lib/proposal-status";
import { StartChatButton } from "@/app/projects/[id]/start-chat-button";
import { getFreelancerCategoryLabel } from "@/lib/categories";
import { formatLongDate } from "@/lib/date";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";
import { ShareButtons } from "@/app/projects/[id]/share-buttons";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { title: true, description: true }
  });
  if (!project) return {};
  const shortDescription = project.description.replace(/\s+/g, " ").trim();
  const description =
    shortDescription.length > 160 ? `${shortDescription.slice(0, 157).trimEnd()}...` : shortDescription;
  const projectUrl = `${site.url}/projects/${id}`;
  return {
    title: project.title,
    description,
    openGraph: {
      title: project.title,
      description,
      url: projectUrl,
      siteName: "Freela.ge",
      locale: "ka_GE",
      type: "article",
      images: [
        {
          url: `${site.url}/icons/icon-512x512.png`,
          width: 512,
          height: 512,
          alt: "Freela.ge"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: [`${site.url}/icons/icon-512x512.png`]
    }
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("projectDetailPage");
  const tAuth = await getTranslations("authLogin");
  const tCategories = await getTranslations("categories");
  const tStatuses = await getTranslations("proposalStatus");

  const session = await getServerSession(authOptions);
  const user = session?.user ?? null;
  const canApply = user?.role === "FREELANCER";

  const { id } = await params;
  const projectUrl = `${site.url}/projects/${id}`;
  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      city: true,
      createdAt: true,
      budgetGEL: true,
      isOpen: true,
      employerId: true,
      employer: { select: { id: true, name: true } }
    }
  });

  if (!project) {
    redirect("/projects");
  }

  const [proposal, employerProjectsCount, employerAcceptedProposalsCount] = await Promise.all([
    canApply
      ? prisma.proposal.findFirst({
          where: { projectId: id, freelancerId: user!.id },
          select: { id: true, status: true, createdAt: true }
        })
      : Promise.resolve(null),
    prisma.project.count({ where: { employerId: project.employerId } }),
    prisma.proposal.count({ where: { status: "ACCEPTED", project: { employerId: project.employerId } } })
  ]);

  const validThrough = new Date(project.createdAt);
  validThrough.setDate(validThrough.getDate() + 30);

  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    datePublished: project.createdAt,
    author: {
      "@type": "Organization",
      name: "Freela.ge"
    }
  };

  const jobPostingStructuredData = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: project.title,
    description: project.description,
    datePosted: project.createdAt.toISOString(),
    validThrough: validThrough.toISOString(),
    employmentType: "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: "Freela.ge"
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: project.city?.trim() || "საქართველო",
        addressCountry: "GE"
      }
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "Georgia"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        id="json-ld-project"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([structuredData, jobPostingStructuredData]) }}
      />
      <Container className="py-12 sm:py-16">
      <div className="text-sm text-muted-foreground">
        <Link className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background/70 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-background hover:text-foreground" href="/projects">
          {t("breadcrumbProjects")}
        </Link>{" "}
        / <span className="text-foreground">{project.title}</span>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
          {project.category ? (
            <div className="mt-3">
              <Badge className="border-primary/30 bg-primary/5 text-primary">
                {getFreelancerCategoryLabel(project.category, tCategories)}
              </Badge>
            </div>
          ) : null}
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("added")}:</span> {formatLongDate(project.createdAt, locale)}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">{project.description}</div>
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">{t("budget")} </span>
            {project.budgetGEL ? `${project.budgetGEL} ₾` : t("notSpecified")}
          </div>
        </Card>

        <div className="grid gap-6">
          <ShareButtons url={projectUrl} title={project.title} />

          <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="text-sm font-medium text-muted-foreground">{t("employerTitle")}</div>
            <div className="mt-3 font-medium">{project.employer.name}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <div className="text-xs text-muted-foreground">{t("employerProjectsLabel")}</div>
                <div className="mt-1 font-medium">{employerProjectsCount}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                <div className="text-xs text-muted-foreground">{t("employerAcceptedLabel")}</div>
                <div className="mt-1 font-medium">{employerAcceptedProposalsCount}</div>
              </div>
            </div>
          </Card>

          {!project.isOpen && !proposal?.id ? (
            <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-sm font-medium text-muted-foreground">{t("closedTitle")}</div>
              <div className="mt-3 text-sm text-muted-foreground">{t("closedBody")}</div>
            </Card>
          ) : proposal?.id ? (
            <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-sm font-medium text-muted-foreground">{t("yourProposal")}</div>
              <div className="mt-3 flex items-center justify-between">
                <Badge>{proposalStatusLabel(proposal.status, tStatuses)}</Badge>
                <div className="text-xs text-muted-foreground">
                  {t("sent")}:{" "}
                  {new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
                    new Date(proposal.createdAt)
                  )}
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">{t("alreadySent")}</div>
              <StartChatButton projectId={project.id} />
            </Card>
          ) : canApply ? (
            <ApplyForm projectId={project.id} />
          ) : user ? (
            <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="text-sm font-medium text-muted-foreground">{t("applyOnlyFreelancersTitle")}</div>
              <div className="mt-3 text-sm text-muted-foreground">{t("applyOnlyFreelancersBody")}</div>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="text-sm font-medium text-muted-foreground">{t("applyLoginTitle")}</div>
              <div className="mt-3 text-sm text-muted-foreground">{t("applyLoginBody")}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={`/auth/login?callbackUrl=${encodeURIComponent(`/projects/${project.id}`)}`} size="sm" className="rounded-xl" variant="secondary">
                  {tAuth("title")}
                </ButtonLink>
                <ButtonLink href={`/auth/register?callbackUrl=${encodeURIComponent(`/projects/${project.id}`)}`} size="sm" className="rounded-xl">
                  {tAuth("signUp")}
                </ButtonLink>
              </div>
            </Card>
          )}
        </div>
      </div>
      </Container>
    </>
  );
}

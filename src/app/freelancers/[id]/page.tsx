import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Avatar } from "@/components/ui/avatar";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Briefcase, DollarSign, MessageSquare, Star } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations("freelancerDetail");
  const { id } = await params;
  const profile = await prisma.profile.findFirst({
    where: { userId: id, user: { role: "FREELANCER" } },
    include: { user: { select: { name: true, avatarUrl: true } } }
  });
  if (!profile) return {};
  return {
    title: profile.user.name,
    description: profile.title ?? t("defaultTitle")
  };
}

function normalizeSkills(input: unknown) {
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return input.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export default async function FreelancerDetailPage({ params }: Props) {
  const t = await getTranslations("freelancerDetail");
  const { id } = await params;
  const [profile, reviewStats, completedJobs] = await Promise.all([
    prisma.profile.findFirst({
      where: { userId: id, user: { role: "FREELANCER" } },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } }
    }),
    prisma.review.aggregate({
      where: { freelancerId: id, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.proposal.count({
      where: { freelancerId: id, status: "ACCEPTED", project: { completedAt: { not: null } } }
    })
  ]);
  if (!profile) notFound();

  const skills = normalizeSkills(profile.skills);
  const avgRating = reviewStats._avg.rating;
  const reviewsCount = reviewStats._count._all;

  return (
    <Container className="py-12 sm:py-16">
      <div className="text-sm text-muted-foreground">
        <Link className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background/70 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-background hover:text-foreground" href="/freelancers">
          {t("breadcrumbFreelancers")}
        </Link>{" "}
        / <span className="text-foreground">{profile.user.name}</span>
      </div>

      <Card className="mt-4 rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-start">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar
                src={profile.user.avatarUrl || undefined}
                name={profile.user.name}
                fallback={profile.user.name?.slice(0, 2).toUpperCase()}
                size="2xl"
                className="shrink-0"
              />
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">{profile.user.name}</h1>
                <div className="mt-2 text-base text-muted-foreground">{profile.title ?? t("defaultTitle")}</div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <ButtonLink href="/freelancers" size="sm" className="rounded-xl" variant="secondary">
                    {t("backToFreelancers")}
                  </ButtonLink>
                  <ButtonLink href="/projects" size="sm" className="rounded-xl">
                    {t("browseProjects")}
                  </ButtonLink>
                </div>
              </div>
            </div>

            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 10).map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                {t("rateLabel")}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {profile.hourlyGEL ? t("rateValue", { rate: profile.hourlyGEL }) : t("rateMissing")}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Star className="h-4 w-4" />
                {t("ratingLabel")}
              </div>
              <div className="mt-2 text-lg font-semibold">
                {reviewsCount > 0 && avgRating ? t("ratingValue", { rating: avgRating.toFixed(1) }) : t("ratingNoneValue")}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {t("reviewsLabel")}
              </div>
              <div className="mt-2 text-lg font-semibold">{t("reviewsValue", { count: reviewsCount })}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="text-base font-semibold">{t("bioTitle")}</div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.bio ?? t("bioMissing")}</p>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm sm:p-7">
          <div className="text-base font-semibold">{t("detailsTitle")}</div>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4" />
                {t("ratingLabel")}
              </dt>
              <dd className="font-semibold">
                {reviewsCount > 0 && avgRating ? t("ratingValue", { rating: avgRating.toFixed(1) }) : t("ratingNoneValue")}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {t("reviewsLabel")}
              </dt>
              <dd className="font-semibold">{t("reviewsValue", { count: reviewsCount })}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {t("completedJobsLabel")}
              </dt>
              <dd className="font-semibold">{t("completedJobsValue", { count: completedJobs })}</dd>
            </div>
          </dl>
          <div className="mt-4 text-sm text-muted-foreground">{t("detailsBody")}</div>
          <div className="mt-3 text-xs text-muted-foreground">{t("detailsFootnote")}</div>
        </Card>
      </div>
    </Container>
  );
}

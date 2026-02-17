import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Avatar } from "@/components/ui/avatar";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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
      <div className="flex flex-col gap-3">
        <div className="text-sm text-muted-foreground">
          <Link className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background/70 px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-background hover:text-foreground" href="/freelancers">
            {t("breadcrumbFreelancers")}
          </Link>{" "}
          / <span className="text-foreground">{profile.user.name}</span>
        </div>
        <div className="flex items-start gap-4 sm:items-center">
          <Avatar src={profile.user.avatarUrl || undefined} name={profile.user.name} size="2xl" className="shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight sm:text-4xl">{profile.user.name}</h1>
            <div className="truncate text-sm text-muted-foreground">{profile.title ?? t("defaultTitle")}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile.hourlyGEL ? <Badge>{t("rateValue", { rate: profile.hourlyGEL })}</Badge> : <Badge>{t("rateMissing")}</Badge>}
          {reviewsCount > 0 && avgRating ? (
            <Badge className="border-primary/30 bg-primary/5 text-primary">
              {t("ratingBadge", { rating: avgRating.toFixed(1) })}
            </Badge>
          ) : (
            <Badge>{t("ratingNone")}</Badge>
          )}
          {skills.slice(0, 8).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-6">
          <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="text-sm font-medium text-muted-foreground">{t("bioTitle")}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.bio ?? t("bioMissing")}
            </p>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="text-sm font-medium text-muted-foreground">{t("detailsTitle")}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="text-xs text-muted-foreground">{t("ratingLabel")}</dt>
              <dd className="mt-1 font-medium">
                {reviewsCount > 0 && avgRating ? t("ratingValue", { rating: avgRating.toFixed(1) }) : t("ratingNoneValue")}
              </dd>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="text-xs text-muted-foreground">{t("reviewsLabel")}</dt>
              <dd className="mt-1 font-medium">{t("reviewsValue", { count: reviewsCount })}</dd>
            </div>
            <div className="col-span-2 rounded-xl border border-border/70 bg-background/70 p-3">
              <dt className="text-xs text-muted-foreground">{t("completedJobsLabel")}</dt>
              <dd className="mt-1 font-medium">{t("completedJobsValue", { count: completedJobs })}</dd>
            </div>
          </dl>
          <div className="mt-4 text-sm text-muted-foreground">{t("detailsBody")}</div>
          <div className="mt-4 text-xs text-muted-foreground">
            {t("detailsFootnote")}
          </div>
        </Card>
      </div>
    </Container>
  );
}

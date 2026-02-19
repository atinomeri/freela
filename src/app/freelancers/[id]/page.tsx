import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Avatar } from "@/components/ui/avatar";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Briefcase, MessageSquare, Star, Calendar, BadgeCheck } from "lucide-react";

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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
            email: true
          }
        }
      }
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
  const avgRating = reviewStats._avg.rating || 0;
  const reviewsCount = reviewStats._count._all;

  // Use a fallback date if createdAt is missing or invalid (though schema says it's required)
  const joinDate = profile.user.createdAt ? new Date(profile.user.createdAt).toLocaleDateString() : "";

  return (
    <div className="min-h-screen bg-muted/30">
      <Container className="py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center text-sm text-muted-foreground">
          <Link 
            href="/freelancers" 
            className="hover:text-foreground transition-colors"
          >
            {t("breadcrumbFreelancers")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{profile.user.name}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Info Column */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Profile Header Card */}
            <Card className="overflow-visible border-border/70 shadow-sm" hover={false}>
              <div className="h-32 w-full rounded-t-2xl bg-gradient-to-r from-primary/10 to-transparent"></div>
              <div className="px-6 pb-6 relative">
                <div className="-mt-12 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div className="relative">
                    <Avatar 
                      src={profile.user.avatarUrl || undefined} 
                      name={profile.user.name} 
                      size="2xl"
                      className="h-24 w-24 border-4 border-background shadow-md bg-background"
                    />
                    {profile.isPremium && (
                      <div className="absolute bottom-0 right-0 bg-background rounded-full p-0.5" title={t("premiumTooltip")}>
                        <BadgeCheck className="h-6 w-6 fill-sky-500 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <ButtonLink variant="outline" href="/freelancers" className="flex-1 sm:flex-none justify-center">
                      {t("backToFreelancers")}
                    </ButtonLink>
                    <ButtonLink variant="primary" href="/projects" className="flex-1 sm:flex-none justify-center">
                      {t("browseProjects")}
                    </ButtonLink>
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2">
                    {profile.user.name}
                  </h1>
                  <p className="mt-1 text-lg text-muted-foreground font-medium">
                    {profile.title ?? t("defaultTitle")}
                  </p>
                  
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Has been with us since {joinDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bio Section */}
            <Card className="border-border/70 shadow-sm" hover={false}>
              <CardHeader>
                <div className="text-lg font-semibold">{t("bioTitle")}</div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-line leading-relaxed">
                    {profile.bio ?? t("bioMissing")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            {skills.length > 0 && (
              <Card className="border-border/70 shadow-sm" hover={false}>
                <CardHeader>
                  <div className="text-lg font-semibold">Skills & Expertise</div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm bg-muted text-foreground hover:bg-muted/80">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Stats Card */}
            <Card className="border-border/70 shadow-sm" hover={false}>
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="font-semibold">Performance Overview</div>
              </CardHeader>
              {/* Manual padding for content to ensure spacing */}
              <div className="p-6 pt-6 grid gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                      <Star className="h-5 w-5 fill-current" />
                    </div>
                    <span className="font-medium text-sm text-muted-foreground">{t("ratingLabel")}</span>
                  </div>
                  <span className="font-bold text-lg">
                    {reviewsCount > 0 ? avgRating.toFixed(1) : "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm text-muted-foreground">{t("reviewsLabel")}</span>
                  </div>
                  <span className="font-bold text-lg">{reviewsCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm text-muted-foreground">{t("completedJobsLabel")}</span>
                  </div>
                  <span className="font-bold text-lg">{completedJobs}</span>
                </div>
              </div>
            </Card>

            {/* Contact / CTA Placeholder - Could be actual actions */}
             <Card className="border-border/70 shadow-sm p-6 bg-primary/5 border-primary/20" hover={false}>
                <div className="font-semibold mb-2">Interested in working with {profile.user.name}?</div>
                <p className="text-sm text-muted-foreground mb-4">
                  Check out their projects or post a job to invite them.
                </p>
                <ButtonLink className="w-full" href="/projects/create">Post a Job</ButtonLink>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}

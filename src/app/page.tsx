import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Brush,
  ClipboardList,
  Code2,
  Handshake,
  Megaphone,
  MessageSquare,
  PenTool,
  Rocket,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-pages";
import { getLocale } from "next-intl/server";
import { getSiteContentMap } from "@/lib/site-content";
import { withOverrides } from "@/lib/i18n-overrides";
import { prisma } from "@/lib/prisma";


function toStars(rating: number) {
  const safe = Math.max(1, Math.min(5, Math.round(rating)));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
}

function toShortText(value: string, max = 220) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export default async function HomePage() {
  if (!(await isPageEnabled("/"))) notFound();
  const locale = await getLocale();
  const baseT = await getTranslations("home");
  const overrides = await getSiteContentMap({ prefix: "home.", locale });
  const t = withOverrides(baseT, overrides, "home.");
  const homeTitle = t("title");

  const stats = [
    { value: t("stats.postProjectValue"), label: t("stats.postProjectLabel"), kind: "default" as const },
    { value: t("stats.gelValue"), label: t("stats.gelLabel"), kind: "logo" as const },
    { value: t("stats.availabilityValue"), label: t("stats.availabilityLabel"), kind: "default" as const }
  ] as const;

  const categories = [
    { title: t("categories.items.webApps.title"), description: t("categories.items.webApps.description"), icon: Code2 },
    { title: t("categories.items.design.title"), description: t("categories.items.design.description"), icon: Brush },
    { title: t("categories.items.content.title"), description: t("categories.items.content.description"), icon: PenTool },
    { title: t("categories.items.marketing.title"), description: t("categories.items.marketing.description"), icon: Megaphone },
    { title: t("categories.items.video.title"), description: t("categories.items.video.description"), icon: Video },
    { title: t("categories.items.ecommerce.title"), description: t("categories.items.ecommerce.description"), icon: ShoppingBag }
  ] as const;

  const fallbackTestimonials = [
    { quote: t("testimonials.items.0.quote"), name: t("testimonials.items.0.name"), role: t("testimonials.items.0.role") },
    { quote: t("testimonials.items.1.quote"), name: t("testimonials.items.1.name"), role: t("testimonials.items.1.role") },
    { quote: t("testimonials.items.2.quote"), name: t("testimonials.items.2.name"), role: t("testimonials.items.2.role") }
  ] as const;

  const recentReviews = await prisma.review.findMany({
    where: {
      isApproved: true,
      comment: { not: null },
      NOT: { comment: "" }
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      rating: true,
      comment: true,
      reviewer: { select: { name: true } },
      project: { select: { title: true } }
    }
  });

  const liveTestimonials = recentReviews
    .map((r) => ({
      quote: toShortText(r.comment ?? ""),
      name: r.reviewer.name,
      role: `${toStars(r.rating)} · ${r.project.title}`
    }))
    .filter((it) => it.quote.length > 0);

  const testimonials = [...liveTestimonials, ...fallbackTestimonials].slice(0, 3);

  const faqs = [
    { q: t("faq.items.0.q"), a: t("faq.items.0.a") },
    { q: t("faq.items.1.q"), a: t("faq.items.1.a") },
    { q: t("faq.items.2.q"), a: t("faq.items.2.a") }
  ] as const;

  const employerSteps = [
    { title: t("howItWorks.employer.steps.0.title"), description: t("howItWorks.employer.steps.0.description"), icon: ClipboardList },
    { title: t("howItWorks.employer.steps.1.title"), description: t("howItWorks.employer.steps.1.description"), icon: Search },
    { title: t("howItWorks.employer.steps.2.title"), description: t("howItWorks.employer.steps.2.description"), icon: Handshake },
    { title: t("howItWorks.employer.steps.3.title"), description: t("howItWorks.employer.steps.3.description"), icon: BadgeCheck }
  ] as const;

  const freelancerSteps = [
    { title: t("howItWorks.freelancer.steps.0.title"), description: t("howItWorks.freelancer.steps.0.description"), icon: Sparkles },
    { title: t("howItWorks.freelancer.steps.1.title"), description: t("howItWorks.freelancer.steps.1.description"), icon: BriefcaseBusiness },
    { title: t("howItWorks.freelancer.steps.2.title"), description: t("howItWorks.freelancer.steps.2.description"), icon: MessageSquare },
    { title: t("howItWorks.freelancer.steps.3.title"), description: t("howItWorks.freelancer.steps.3.description"), icon: Rocket }
  ] as const;

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <Container className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto w-full max-w-4xl text-center">
            <h1 className="mx-auto max-w-3xl animate-fade-in text-balance text-h1" style={{ animationDelay: "80ms" }}>
              {homeTitle}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl animate-fade-in text-body text-muted-foreground" style={{ animationDelay: "160ms" }}>
              {t("subtitle", { siteName: site.name })}
            </p>

            <div className="mt-8 flex animate-fade-in justify-center" style={{ animationDelay: "240ms" }}>
              <ButtonLink href="/projects" size="lg" className="group gap-2">
                {t("cta.findProject")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
            </div>

            <div className="mx-auto mt-8 grid max-w-4xl animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: "320ms" }}>
              {stats.map((s) => (
                <Card key={s.label} className="p-4 text-center">
                  <div className="relative flex flex-col items-center justify-center">
                    {s.kind === "logo" ? (
                      <div className="flex items-center justify-center py-0.5 text-primary/90">
                        <span
                          className="h-9 w-9 bg-primary/90"
                          style={{
                            WebkitMaskImage: "url(/contract.png)",
                            maskImage: "url(/contract.png)",
                            WebkitMaskRepeat: "no-repeat",
                            maskRepeat: "no-repeat",
                            WebkitMaskPosition: "center",
                            maskPosition: "center",
                            WebkitMaskSize: "contain",
                            maskSize: "contain"
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-primary/90">{s.value}</div>
                    )}
                    {s.label ? <div className="mt-2 text-sm text-muted-foreground">{s.label}</div> : null}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b">
        <Container className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: Zap, title: t("solutionCards.0.title"), description: t("solutionCards.0.description") },
              { icon: TrendingUp, title: t("solutionCards.1.title"), description: t("solutionCards.1.description") },
              { icon: Users, title: t("solutionCards.2.title"), description: t("solutionCards.2.description") }
            ].map((card) => (
              <div
                key={card.title}
                className="group flex flex-col gap-4 rounded-xl border border-gray-800 bg-[#161b22] p-6 transition-all duration-300 hover:border-blue-600/60 hover:shadow-[0_0_24px_0_rgba(59,130,246,0.15)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400 transition-colors duration-300 group-hover:bg-blue-600/25">
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b">
        <Container className="py-16 sm:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("categories.title")}</h2>
              <p className="mt-2 text-muted-foreground">{t("categories.subtitle")}</p>
            </div>
            <ButtonLink href="/freelancers" variant="ghost" className="group">
              {t("categories.viewAll")} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </ButtonLink>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <Card key={c.title} className="group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/15" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{c.description}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* How It Works - Two Column Guide */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-success/5 blur-3xl" />
        <Container className="relative py-16 sm:py-20">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Badge className="mb-4 inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t("howItWorks.badge")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{t("howItWorks.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("howItWorks.subtitle")}</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Employer Journey */}
            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary">{t("howItWorks.employer.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("howItWorks.employer.subtitle")}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {employerSteps.map((step, i) => (
                    <div key={step.title} className="group flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{step.title.replace(/^\d+\)\s*/, "")}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Freelancer Journey */}
            <Card className="relative overflow-hidden border-success/20 bg-gradient-to-br from-success/5 via-background to-background p-6 sm:p-8">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-success/10 blur-3xl" />
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-success">{t("howItWorks.freelancer.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("howItWorks.freelancer.subtitle")}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {freelancerSteps.map((step, i) => (
                    <div key={step.title} className="group flex gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{step.title.replace(/^\d+\)\s*/, "")}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}

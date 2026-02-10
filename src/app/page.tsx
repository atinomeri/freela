import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Brush,
  Code2,
  Megaphone,
  PenTool,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Video,
  Wallet
} from "lucide-react";
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
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  if (!(await isPageEnabled("/"))) notFound();
  const locale = await getLocale();
  const baseT = await getTranslations("home");
  const overrides = await getSiteContentMap({ prefix: "home.", locale });
  const t = withOverrides(baseT, overrides, "home.");
  const session = await getServerSession(authOptions);
  const authT = await getTranslations("authButtons");

  const stats = [
    { value: t("stats.postProjectValue"), label: t("stats.postProjectLabel") },
    { value: t("stats.gelValue"), label: t("stats.gelLabel") },
    { value: t("stats.availabilityValue"), label: t("stats.availabilityLabel") }
  ] as const;

  const categories = [
    { title: t("categories.items.webApps.title"), description: t("categories.items.webApps.description"), icon: Code2 },
    { title: t("categories.items.design.title"), description: t("categories.items.design.description"), icon: Brush },
    { title: t("categories.items.content.title"), description: t("categories.items.content.description"), icon: PenTool },
    { title: t("categories.items.marketing.title"), description: t("categories.items.marketing.description"), icon: Megaphone },
    { title: t("categories.items.video.title"), description: t("categories.items.video.description"), icon: Video },
    { title: t("categories.items.ecommerce.title"), description: t("categories.items.ecommerce.description"), icon: ShoppingBag }
  ] as const;

  const testimonials = [
    { quote: t("testimonials.items.0.quote"), name: t("testimonials.items.0.name"), role: t("testimonials.items.0.role") },
    { quote: t("testimonials.items.1.quote"), name: t("testimonials.items.1.name"), role: t("testimonials.items.1.role") },
    { quote: t("testimonials.items.2.quote"), name: t("testimonials.items.2.name"), role: t("testimonials.items.2.role") }
  ] as const;

  const faqs = [
    { q: t("faq.items.0.q"), a: t("faq.items.0.a") },
    { q: t("faq.items.1.q"), a: t("faq.items.1.a") },
    { q: t("faq.items.2.q"), a: t("faq.items.2.a") },
    { q: t("faq.items.3.q"), a: t("faq.items.3.a") }
  ] as const;

  return (
    <>
      {session?.user && (
        <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <Container className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {t("greeting", { name: session.user.name || "User" })}
                </h2>
                <p className="text-sm text-muted-foreground">{t("welcomeBack")}</p>
              </div>
              <ButtonLink href="/dashboard" variant="secondary" size="sm">
                {authT("dashboard")}
              </ButtonLink>
            </div>
          </Container>
        </div>
      )}
      <section className="relative overflow-hidden border-b">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_50%_0%,hsl(var(--primary)/0.15)_0%,transparent_60%)]" />
          <div className="absolute -left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl" style={{ animationDelay: '1s' }} />
        </div>
        <Container className="py-20 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="animate-fade-in">{t("badge")}</Badge>
            <h1 className="mt-6 animate-fade-in text-4xl font-bold tracking-tight leading-[1.1] sm:text-5xl md:text-6xl" style={{ animationDelay: '100ms' }}>
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                {t("title")}
              </span>
            </h1>
            <p className="mt-6 animate-fade-in text-balance text-base text-muted-foreground sm:text-lg md:text-xl" style={{ animationDelay: '200ms' }}>
              {t("subtitle", { siteName: site.name })}
            </p>
            <div className="mt-10 flex animate-fade-in flex-col gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: '300ms' }}>
              <ButtonLink href="/projects" size="lg" className="group gap-2 px-8 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                {t("cta.findProject")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/freelancers" size="lg" variant="secondary" className="px-8">
                {t("cta.findFreelancer")}
              </ButtonLink>
            </div>
            <div className="mt-12 grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: '400ms' }}>
              {stats.map((s, i) => (
                <Card key={s.label} className="group relative overflow-hidden border-border/50 p-6 text-left transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative">
                    <div className="text-3xl font-bold text-primary">{s.value}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b bg-muted/30">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Search className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{t("features.fastSelection.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("features.fastSelection.description")}</p>
              </div>
            </Card>
            <Card className="group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{t("features.secureProcess.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("features.secureProcess.description")}</p>
              </div>
            </Card>
            <Card className="group relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Wallet className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{t("features.gelBudget.title")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t("features.gelBudget.description")}</p>
              </div>
            </Card>
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

      <section className="border-b bg-muted/20">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("steps.title")}</h2>
              <p className="mt-2 text-muted-foreground">{t("steps.subtitle")}</p>
            </div>
            <div className="lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="group relative overflow-hidden p-6 transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary to-primary/50" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">1</div>
                  <div className="mt-4 font-semibold">{t("steps.items.0.title")}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t("steps.items.0.description")}</p>
                </Card>
                <Card className="group relative overflow-hidden p-6 transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary/50 to-primary" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">2</div>
                  <div className="mt-4 font-semibold">{t("steps.items.1.title")}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t("steps.items.1.description")}</p>
                </Card>
                <Card className="group relative overflow-hidden p-6 transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary to-success" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-lg font-bold text-success">3</div>
                  <div className="mt-4 font-semibold">{t("steps.items.2.title")}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{t("steps.items.2.description")}</p>
                </Card>
              </div>
            </div>

            <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-8 shadow-xl lg:col-span-3 lg:mt-4">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative grid gap-6 lg:grid-cols-2 lg:items-center">
                <div>
                  <Badge variant="default" className="mb-4">CTA</Badge>
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("ctaCard.title")}</h3>
                  <p className="mt-3 text-muted-foreground">{t("ctaCard.description")}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <ButtonLink href="/auth/register" size="lg" className="shadow-lg shadow-primary/25">
                    {t("ctaCard.signUp")}
                  </ButtonLink>
                  <ButtonLink href="/projects/new" size="lg" variant="secondary">
                    {t("ctaCard.postProject")}
                  </ButtonLink>
                </div>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                {t("ctaCard.termsPrefix")}{" "}
                <Link className="underline hover:text-foreground" href="/legal/terms">
                  {t("ctaCard.terms")}
                </Link>{" "}
                {t("ctaCard.and")}{" "}
                <Link className="underline hover:text-foreground" href="/legal/privacy">
                  {t("ctaCard.privacy")}
                </Link>
                .
              </p>
            </Card>
          </div>
        </Container>
      </section>

      <section className="border-b">
        <Container className="py-16 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("testimonials.title")}</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {testimonials.map((it) => (
              <Card key={it.name} className="p-6">
                <p className="text-sm text-muted-foreground">“{it.quote}”</p>
                <div className="mt-4 font-medium">{it.name}</div>
                <div className="text-xs text-muted-foreground">{it.role}</div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section>
        <Container className="py-12 sm:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("faq.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("faq.subtitle")}</p>
            </div>
            <ButtonLink href="/contact" variant="ghost">
              {t("faq.contact")} <ArrowRight className="ml-2 h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqs.map((f) => (
              <Card key={f.q} className="p-6">
                <div className="font-medium">{f.q}</div>
                <div className="mt-2 text-sm text-muted-foreground">{f.a}</div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}

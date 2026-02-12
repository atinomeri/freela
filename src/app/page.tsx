import {
  ArrowRight,
  Briefcase,
  Brush,
  Code2,
  Megaphone,
  PenTool,
  Rocket,
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

const titleHighlightTerms: Record<string, string[]> = {
  ka: ["бѓ¤бѓ бѓбѓљбѓђбѓњбѓЎбѓ”бѓ бѓ", "бѓЁбѓ”бѓ™бѓ•бѓ”бѓ—бѓђ"],
  en: ["freelancer", "order"],
  ru: ["С„СЂРёР»Р°РЅСЃРµСЂР°", "С„СЂРёР»Р°РЅСЃРµСЂ", "Р·Р°РєР°Р·", "Р·Р°РєР°Р·С‹", "Р·Р°РєР°Р·Р°"]
};

type HeroSceneCopy = {
  workspaceBadge: string;
  clientTitle: string;
  clientDescription: string;
  clientBudget: string;
  freelancerTitle: string;
  freelancerDescription: string;
  freelancerAvailability: string;
  matchingScoreLabel: string;
  floatingNewOrderLabel: string;
  floatingNewOrderDescription: string;
  floatingBudgetApprovedLabel: string;
  floatingBudgetApprovedDescription: string;
  floatingMatchFoundLabel: string;
  floatingMatchFoundDescription: string;
};

const heroSceneCopyByLocale: Record<string, HeroSceneCopy> = {
  ka: {
    workspaceBadge: "бѓЈбѓњбѓђбѓ бѓ”бѓ‘бѓ–бѓ” бѓ“бѓђбѓ¤бѓЈбѓ«бѓњбѓ”бѓ‘бѓЈбѓљбѓ бѓћбѓљбѓђбѓўбѓ¤бѓќбѓ бѓ›бѓђ",
    clientTitle: "бѓ“бѓбѓћбѓљбѓќбѓ›бѓ бѓђбѓ бѓђбѓђ бѓЎбѓђбѓ•бѓђбѓљбѓ“бѓ”бѓ‘бѓЈбѓљбѓќ",
    clientDescription: "бѓ бѓ”бѓђбѓљбѓЈбѓ бѓ бѓњбѓђбѓ›бѓЈбѓЁбѓ”бѓ•бѓђбѓ бѓ бѓ“бѓђ бѓћбѓђбѓЎбѓЈбѓ®бѓбѓЎбѓ›бѓ’бѓ”бѓ‘бѓљбѓќбѓ‘бѓђ бѓ›бѓњбѓбѓЁбѓ•бѓњбѓ”бѓљбѓќбѓ•бѓђбѓњбѓбѓђ, бѓђбѓ бѓђ бѓЎбѓ”бѓ бѓ—бѓбѓ¤бѓбѓ™бѓђбѓўбѓ.",
    clientBudget: "бѓ›бѓђбѓ’бѓђбѓљбѓбѓ—бѓ: бѓћбѓ бѓќбѓ¤бѓ”бѓЎбѓбѓќбѓњбѓђбѓљбѓЈбѓ бѓ бѓЎбѓђбѓбѓўбѓ бѓ“бѓбѓћбѓљбѓќбѓ›бѓбѓЎ бѓ’бѓђбѓ бѓ”бѓЁбѓ”",
    freelancerTitle: "бѓЁбѓ”бѓ“бѓ”бѓ’бѓ > бѓ“бѓбѓћбѓљбѓќбѓ›бѓ",
    freelancerDescription: "бѓћбѓќбѓ бѓўбѓ¤бѓќбѓљбѓбѓќбѓ› бѓ“бѓђбѓђбѓ›бѓўбѓ™бѓбѓЄбѓђ бѓ™бѓќбѓ›бѓћбѓ”бѓўбѓ”бѓњбѓЄбѓбѓђ бѓ“бѓђ бѓЁбѓ”бѓ™бѓ•бѓ”бѓ—бѓђ бѓ“бѓђбѓ“бѓђбѓЎбѓўбѓЈбѓ бѓ“бѓђ.",
    freelancerAvailability: "бѓЁбѓ”бѓ¤бѓђбѓЎбѓ”бѓ‘бѓђ бѓ®бѓ“бѓ”бѓ‘бѓђ бѓњбѓђбѓ›бѓЈбѓЁбѓ”бѓ•бѓ бѓбѓ—",
    matchingScoreLabel: "бѓЁбѓ”бѓЎбѓђбѓ‘бѓђбѓ›бѓбѓЎбѓќбѓ‘бѓђ бѓЈбѓњбѓђбѓ бѓ”бѓ‘бѓбѓ—бѓђ бѓ“бѓђ бѓћбѓќбѓ бѓўбѓ¤бѓќбѓљбѓбѓќбѓ—бѓ",
    floatingNewOrderLabel: "бѓђбѓ®бѓђбѓљбѓ бѓЁбѓ”бѓЎбѓђбѓ«бѓљбѓ”бѓ‘бѓљбѓќбѓ‘бѓђ",
    floatingNewOrderDescription: "бѓ“бѓђбѓбѓ¬бѓ§бѓ” бѓћбѓќбѓ бѓўбѓ¤бѓќбѓљбѓбѓќбѓ—бѓ бѓ“бѓђ бѓђбѓ бѓђ бѓ“бѓбѓћбѓљбѓќбѓ›бѓбѓ—",
    floatingBudgetApprovedLabel: "бѓ™бѓљбѓбѓ”бѓњбѓўбѓ бѓ”бѓњбѓ“бѓќ бѓЁбѓ”бѓ“бѓ”бѓ’бѓЎ",
    floatingBudgetApprovedDescription: "бѓ’бѓђбѓ“бѓђбѓ›бѓ¬бѓ§бѓ•бѓ”бѓўбѓ бѓбѓ§бѓќ бѓЁбѓ”бѓЎбѓ бѓЈбѓљбѓ”бѓ‘бѓЈбѓљбѓ бѓњбѓђбѓ›бѓЈбѓЁбѓ”бѓ•бѓ бѓ”бѓ‘бѓ",
    floatingMatchFoundLabel: "бѓ“бѓђбѓ›бѓ—бѓ®бѓ•бѓ”бѓ•бѓђ бѓ›бѓќбѓбѓ«бѓ”бѓ‘бѓњбѓђ",
    floatingMatchFoundDescription: "бѓ›бѓ—бѓђбѓ•бѓђбѓ бѓбѓђ бѓЈбѓњбѓђбѓ бѓ, бѓћбѓђбѓЎбѓЈбѓ®бѓбѓЎбѓ›бѓ’бѓ”бѓ‘бѓљбѓќбѓ‘бѓђ бѓ“бѓђ бѓ®бѓђбѓ бѓбѓЎбѓ®бѓ"
  },
  en: {
    workspaceBadge: "Skills-first workspace",
    clientTitle: "No diploma required",
    clientDescription: "Real work and reliability matter more than certificates.",
    clientBudget: "Example: pro website built without a diploma",
    freelancerTitle: "Results > credentials",
    freelancerDescription: "Portfolio proved competence and the order was confirmed.",
    freelancerAvailability: "Evaluated by delivered work",
    matchingScoreLabel: "Match by skills and portfolio",
    floatingNewOrderLabel: "New opportunity",
    floatingNewOrderDescription: "Start with proof of work, not paperwork",
    floatingBudgetApprovedLabel: "Client trusted the outcome",
    floatingBudgetApprovedDescription: "Past delivery quality made the difference",
    floatingMatchFoundLabel: "Match found",
    floatingMatchFoundDescription: "Skill, ownership, and quality win orders"
  },
  ru: {
    workspaceBadge: "РџР»Р°С‚С„РѕСЂРјР°, РіРґРµ РІР°Р¶РЅС‹ РЅР°РІС‹РєРё",
    clientTitle: "Р”РёРїР»РѕРј РЅРµ РѕР±СЏР·Р°С‚РµР»РµРЅ",
    clientDescription: "Р РµР°Р»СЊРЅС‹Рµ СЂР°Р±РѕС‚С‹ Рё РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚СЊ РІР°Р¶РЅРµРµ СЃРµСЂС‚РёС„РёРєР°С‚РѕРІ.",
    clientBudget: "РџСЂРёРјРµСЂ: РїСЂРѕС„. СЃР°Р№С‚ Р±РµР· РґРёРїР»РѕРјР°",
    freelancerTitle: "Р РµР·СѓР»СЊС‚Р°С‚ > РґРёРїР»РѕРј",
    freelancerDescription: "РџРѕСЂС‚С„РѕР»РёРѕ РїРѕРґС‚РІРµСЂРґРёР»Рѕ СѓСЂРѕРІРµРЅСЊ Рё Р·Р°РєР°Р· Р±С‹Р» РѕРґРѕР±СЂРµРЅ.",
    freelancerAvailability: "РћС†РµРЅРєР° РїРѕ РІС‹РїРѕР»РЅРµРЅРЅС‹Рј СЂР°Р±РѕС‚Р°Рј",
    matchingScoreLabel: "РЎРѕРІРїР°РґРµРЅРёРµ РїРѕ РЅР°РІС‹РєР°Рј Рё РїРѕСЂС‚С„РѕР»РёРѕ",
    floatingNewOrderLabel: "РќРѕРІР°СЏ РІРѕР·РјРѕР¶РЅРѕСЃС‚СЊ",
    floatingNewOrderDescription: "РЎС‚Р°СЂС‚СѓР№С‚Рµ СЃ РїРѕСЂС‚С„РѕР»РёРѕ, Р° РЅРµ СЃ РєРѕСЂРѕС‡РµРє",
    floatingBudgetApprovedLabel: "РљР»РёРµРЅС‚ РІС‹Р±СЂР°Р» СЂРµР·СѓР»СЊС‚Р°С‚",
    floatingBudgetApprovedDescription: "Р РµС€Р°СЋС‰РёРј СЃС‚Р°Р»Рѕ РєР°С‡РµСЃС‚РІРѕ РїСЂРѕС€Р»С‹С… СЂР°Р±РѕС‚",
    floatingMatchFoundLabel: "РЎРѕРІРїР°РґРµРЅРёРµ РЅР°Р№РґРµРЅРѕ",
    floatingMatchFoundDescription: "Р—Р°РєР°Р·С‹ РІС‹РёРіСЂС‹РІР°СЋС‚ РЅР°РІС‹РєРё Рё РєР°С‡РµСЃС‚РІРѕ"
  }
};

function getHeroSceneCopy(locale: string): HeroSceneCopy {
  const normalized = locale.toLowerCase().split("-")[0];
  return heroSceneCopyByLocale[normalized] ?? heroSceneCopyByLocale.en;
}

type HeroGuideCopy = {
  badge: string;
  title: string;
  subtitle: string;
  employerLabel: string;
  freelancerLabel: string;
  employerSteps: string[];
  freelancerSteps: string[];
  fullGuideTitle: string;
  fullGuidePoints: string[];
};

const heroGuideCopyByLocale: Record<string, HeroGuideCopy> = {
  ka: {
    badge: "სრული გზამკვლევი",
    title: "როგორ მუშაობს Freela",
    subtitle: "დამკვეთისთვის და ფრილანსერისთვის სრული პრაქტიკული გზა.",
    employerLabel: "დამკვეთის სრული გზა",
    freelancerLabel: "ფრილანსერის სრული გზა",
    employerSteps: [
      "1) გამოაქვეყნე შეკვეთა მკაფიო ამოცანით და ბიუჯეტით",
      "2) შეადარე კანდიდატები პროფილით, პორტფოლიოთი და შეფასებით",
      "3) ჩატში შეათანხმე დეტალები, ვადები და პასუხისმგებლობა",
      "4) მიიღე შედეგი და დატოვე შეფასება"
    ],
    freelancerSteps: [
      "1) გააძლიერე პროფილი უნარებით და რეალური ნამუშევრებით",
      "2) მოძებნე შესაბამისი შეკვეთები კატეგორიით და ბიუჯეტით",
      "3) გააგზავნე ზუსტი შეთავაზება და იმუშავე გამჭვირვალედ",
      "4) შეასრულე დროულად და გაზარდე რეიტინგი"
    ],
    fullGuideTitle: "რა შედის სრულ გზამკვლევში",
    fullGuidePoints: ["შეკვეთის დადება", "კანდიდატების შერჩევა", "ჩატი და შეთანხმება", "შეფასებები და რეპუტაცია"]
  },
  en: {
    badge: "Full guide",
    title: "How Freela works",
    subtitle: "A complete practical flow for clients and freelancers.",
    employerLabel: "Client full flow",
    freelancerLabel: "Freelancer full flow",
    employerSteps: [
      "1) Post an order with clear scope and budget",
      "2) Compare candidates by profile, portfolio, and ratings",
      "3) Align details, timeline, and responsibilities in chat",
      "4) Approve delivery and leave a review"
    ],
    freelancerSteps: [
      "1) Strengthen your profile with real work samples",
      "2) Find relevant orders by category and budget",
      "3) Send precise proposals and communicate clearly",
      "4) Deliver on time and grow your rating"
    ],
    fullGuideTitle: "Included in this full guide",
    fullGuidePoints: ["Order posting", "Candidate selection", "Chat & agreements", "Reviews & reputation"]
  },
  ru: {
    badge: "Полный гайд",
    title: "Как работает Freela",
    subtitle: "Полный практический путь для заказчика и фрилансера.",
    employerLabel: "Полный путь заказчика",
    freelancerLabel: "Полный путь фрилансера",
    employerSteps: [
      "1) Опубликуйте заказ с понятной задачей и бюджетом",
      "2) Сравните кандидатов по профилю, портфолио и рейтингу",
      "3) Согласуйте детали, сроки и ответственность в чате",
      "4) Примите результат и оставьте отзыв"
    ],
    freelancerSteps: [
      "1) Усильте профиль реальными кейсами",
      "2) Найдите релевантные заказы по категории и бюджету",
      "3) Отправьте точное предложение и работайте прозрачно",
      "4) Сдайте в срок и повышайте рейтинг"
    ],
    fullGuideTitle: "Что входит в полный гайд",
    fullGuidePoints: ["Публикация заказа", "Отбор кандидатов", "Чат и договорённости", "Отзывы и репутация"]
  }
};

function getHeroGuideCopy(locale: string) {
  const normalized = locale.toLowerCase().split("-")[0];
  return heroGuideCopyByLocale[normalized] ?? heroGuideCopyByLocale.en;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedHomeTitle(title: string, locale: string) {
  const terms = (titleHighlightTerms[locale] ?? titleHighlightTerms.en).slice().sort((a, b) => b.length - a.length);
  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu");
  const normalizedTerms = new Set(terms.map((term) => term.toLocaleLowerCase(locale)));

  return title.split(matcher).map((part, index) => {
    if (!part) return null;
    const normalized = part.toLocaleLowerCase(locale);
    if (normalizedTerms.has(normalized)) {
      return (
        <span key={`h-${index}`} className="text-success drop-shadow-[0_0_10px_hsl(var(--success)/0.35)]">
          {part}
        </span>
      );
    }
    return <span key={`n-${index}`}>{part}</span>;
  });
}

export default async function HomePage() {
  if (!(await isPageEnabled("/"))) notFound();
  const locale = await getLocale();
  const baseT = await getTranslations("home");
  const overrides = await getSiteContentMap({ prefix: "home.", locale });
  const t = withOverrides(baseT, overrides, "home.");
  const heroScene = getHeroSceneCopy(locale);
  const heroGuide = getHeroGuideCopy(locale);
  const homeTitle =
    locale === "ka" ? "бѓбѓћбѓќбѓ•бѓ” бѓ¤бѓ бѓбѓљбѓђбѓњбѓЎбѓ”бѓ бѓ вЂ” бѓђбѓњ бѓбѓћбѓќбѓ•бѓ” бѓЁбѓ”бѓ™бѓ•бѓ”бѓ—бѓђ вЂ” бѓЎбѓ¬бѓ бѓђбѓ¤бѓђбѓ“ бѓ“бѓђ бѓ›бѓђбѓ бѓўбѓбѓ•бѓђбѓ“" : t("title");

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
      <section className="relative overflow-hidden border-b">
        <div className="hero-mesh absolute inset-0 -z-20" />
        <div className="hero-pattern absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-success/15 blur-3xl" />

        <Container className="py-16 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:pr-6 lg:text-left">
              <Badge className="inline-flex animate-fade-in items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t("badge")}
              </Badge>
              <h1
                className="mx-auto mt-6 max-w-[13ch] animate-fade-in text-balance text-4xl font-bold leading-[1.06] tracking-tight sm:text-[3rem] md:text-[3.5rem] lg:mx-0 lg:text-[3.85rem]"
                style={{ animationDelay: "100ms" }}
              >
                {renderHighlightedHomeTitle(homeTitle, locale)}
              </h1>
              <p className="mt-6 animate-fade-in text-balance text-base text-muted-foreground sm:text-lg md:text-xl" style={{ animationDelay: "200ms" }}>
                {t("subtitle", { siteName: site.name })}
              </p>

              <div className="mt-10 flex animate-fade-in flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start" style={{ animationDelay: "300ms" }}>
                <ButtonLink href="/projects" size="lg" className="group gap-2 rounded-xl bg-primary px-8 shadow-xl shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/35">
                  {t("cta.findProject")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </ButtonLink>
                <ButtonLink href="/freelancers" size="lg" variant="ghost" className="rounded-xl border border-border/70 bg-background/45 px-8 text-foreground/85 hover:border-primary/30 hover:bg-background/80">
                  {t("cta.findFreelancer")}
                </ButtonLink>
              </div>

              <div className="mt-10 grid animate-fade-in grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: "400ms" }}>
                {stats.map((s) => (
                  <Card key={s.label} className="group relative overflow-hidden border-border/60 bg-card/70 p-5 text-left backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative">
                      <div className="text-3xl font-bold text-primary">{s.value}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[700px] animate-fade-in lg:origin-top" style={{ animationDelay: "220ms" }}>
              <Card className="relative overflow-hidden border-border/70 bg-card/75 p-6 shadow-2xl backdrop-blur-md sm:p-7">
                <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-success/20 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Badge variant="secondary" className="gap-1.5 border border-primary/20 bg-primary/10 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      {heroGuide.badge}
                    </Badge>
                    <span className="text-xs text-muted-foreground">freela.ge</span>
                  </div>

                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{heroGuide.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{heroGuide.subtitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground/90">{heroScene.workspaceBadge}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-primary">
                        <Briefcase className="h-4 w-4" />
                        {heroGuide.employerLabel}
                      </div>
                      <ol className="space-y-2">
                        {heroGuide.employerSteps.map((step, index) => (
                          <li key={step} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/80 p-5">
                      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-success">
                        <Rocket className="h-4 w-4" />
                        {heroGuide.freelancerLabel}
                      </div>
                      <ol className="space-y-2">
                        {heroGuide.freelancerSteps.map((step, index) => (
                          <li key={step} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-success/15 text-[11px] font-semibold text-success">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-4">
                    <div className="text-sm font-semibold">{heroGuide.fullGuideTitle}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {heroGuide.fullGuidePoints.map((point) => (
                        <span key={point} className="rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-xs text-muted-foreground">
                          {point}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
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
                <p className="text-sm text-muted-foreground">вЂњ{it.quote}вЂќ</p>
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

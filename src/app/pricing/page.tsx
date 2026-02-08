import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContentMap } from "@/lib/site-content";
import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-pages";
import { withOverrides } from "@/lib/i18n-overrides";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const baseT = await getTranslations("pricingPage");
  const overrides = await getSiteContentMap({ prefix: "pricingPage.", locale });
  const t = withOverrides(baseT, overrides, "pricingPage.");
  return { title: t("title"), description: t("subtitle") };
}

export default async function PricingPage() {
  if (!(await isPageEnabled("/pricing"))) notFound();
  const locale = await getLocale();
  const baseT = await getTranslations("pricingPage");
  const overrides = await getSiteContentMap({ prefix: "pricingPage.", locale });
  const t = withOverrides(baseT, overrides, "pricingPage.");
  const title = t("title").trim();
  const subtitle = t("subtitle").trim();
  const startPlanName = t("plans.start.name").trim();
  const proPlanName = t("plans.pro.name").trim();
  const businessPlanName = t("plans.business.name").trim();

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        {title ? <h1 className="text-3xl font-semibold tracking-tight">{title}</h1> : null}
        {subtitle ? <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          {startPlanName ? <div className="text-sm font-medium text-muted-foreground">{startPlanName}</div> : null}
          <div className="mt-2 text-3xl font-semibold">{t("plans.start.price")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("plans.start.subtitle")}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("plans.start.features.0")}</li>
            <li>{t("plans.start.features.1")}</li>
            <li>{t("plans.start.features.2")}</li>
          </ul>
        </Card>
        <Card className="p-6 border-primary/40">
          {proPlanName ? <div className="text-sm font-medium text-muted-foreground">{proPlanName}</div> : null}
          <div className="mt-2 text-3xl font-semibold">{t("plans.pro.price")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("plans.pro.subtitle")}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("plans.pro.features.0")}</li>
            <li>{t("plans.pro.features.1")}</li>
            <li>{t("plans.pro.features.2")}</li>
          </ul>
        </Card>
        <Card className="p-6">
          {businessPlanName ? <div className="text-sm font-medium text-muted-foreground">{businessPlanName}</div> : null}
          <div className="mt-2 text-3xl font-semibold">{t("plans.business.price")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("plans.business.subtitle")}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("plans.business.features.0")}</li>
            <li>{t("plans.business.features.1")}</li>
            <li>{t("plans.business.features.2")}</li>
          </ul>
        </Card>
      </div>
      <div className="mt-10 flex gap-3">
        <ButtonLink href="/auth/register">{t("ctaStartFree")}</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          {t("ctaConsultation")}
        </ButtonLink>
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricingPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function PricingPage() {
  const t = await getTranslations("pricingPage");
  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">{t("plans.start.name")}</div>
          <div className="mt-2 text-3xl font-semibold">{t("plans.start.price")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("plans.start.subtitle")}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("plans.start.features.0")}</li>
            <li>{t("plans.start.features.1")}</li>
            <li>{t("plans.start.features.2")}</li>
          </ul>
        </Card>
        <Card className="p-6 border-primary/40">
          <div className="text-sm font-medium text-muted-foreground">{t("plans.pro.name")}</div>
          <div className="mt-2 text-3xl font-semibold">{t("plans.pro.price")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("plans.pro.subtitle")}</div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("plans.pro.features.0")}</li>
            <li>{t("plans.pro.features.1")}</li>
            <li>{t("plans.pro.features.2")}</li>
          </ul>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">{t("plans.business.name")}</div>
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

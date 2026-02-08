import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { PricingContentEditor } from "@/app/admin/content/pricing/pricing-content-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminContentPricing");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

const PRICING_KEYS = [
  "pricingPage.title",
  "pricingPage.subtitle",
  "pricingPage.plans.start.name",
  "pricingPage.plans.start.price",
  "pricingPage.plans.start.subtitle",
  "pricingPage.plans.start.features.0",
  "pricingPage.plans.start.features.1",
  "pricingPage.plans.start.features.2",
  "pricingPage.plans.pro.name",
  "pricingPage.plans.pro.price",
  "pricingPage.plans.pro.subtitle",
  "pricingPage.plans.pro.features.0",
  "pricingPage.plans.pro.features.1",
  "pricingPage.plans.pro.features.2",
  "pricingPage.plans.business.name",
  "pricingPage.plans.business.price",
  "pricingPage.plans.business.subtitle",
  "pricingPage.plans.business.features.0",
  "pricingPage.plans.business.features.1",
  "pricingPage.plans.business.features.2",
  "pricingPage.ctaStartFree",
  "pricingPage.ctaConsultation"
] as const;

export default async function AdminPricingContentPage({ searchParams }: Props) {
  const t = await getTranslations("adminContentPricing");
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("forbiddenTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
      </Card>
    );
  }

  const sp = (await searchParams) ?? {};
  const localeRaw = toSingle(sp.locale).trim().toLowerCase();
  const locale = localeRaw === "en" || localeRaw === "ru" ? localeRaw : "ka";

  const rows = await prisma.siteContent.findMany({
    where: { locale, key: { in: [...PRICING_KEYS] } },
    select: { key: true, value: true }
  });
  const values: Record<string, string> = {};
  for (const row of rows) values[row.key] = row.value;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">{t("title")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
        </div>
      </div>

      <div className="mt-5">
        <PricingContentEditor locale={locale} keys={[...PRICING_KEYS]} initialValues={values} />
      </div>
    </Card>
  );
}


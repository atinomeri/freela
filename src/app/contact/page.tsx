import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContentMap, getSiteContentValues } from "@/lib/site-content";
import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-pages";
import { withOverrides } from "@/lib/i18n-overrides";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const baseT = await getTranslations("contactPage");
  const overrides = await getSiteContentMap({ prefix: "contactPage.", locale });
  const t = withOverrides(baseT, overrides, "contactPage.");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ContactPage() {
  if (!(await isPageEnabled("/contact"))) notFound();
  const locale = await getLocale();
  const baseT = await getTranslations("contactPage");
  const [pageOverrides, siteOverrides] = await Promise.all([
    getSiteContentMap({ prefix: "contactPage.", locale }),
    getSiteContentValues({ keys: ["site.supportEmail"], locale })
  ]);

  const t = withOverrides(baseT, pageOverrides, "contactPage.");
  const supportEmail = siteOverrides["site.supportEmail"] ?? site.supportEmail;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="font-medium">{t("emailTitle")}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            <a className="underline hover:text-foreground" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
        </Card>
        <Card className="p-6">
          <div className="font-medium">{t("hoursTitle")}</div>
          <p className="mt-2 text-sm text-muted-foreground">{t("hoursValue")}</p>
        </Card>
      </div>
    </Container>
  );
}

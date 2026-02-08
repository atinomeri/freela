import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { getLocale, getTranslations } from "next-intl/server";
import { getSiteContentMap, getSiteContentValues } from "@/lib/site-content";
import { notFound } from "next/navigation";
import { isPageEnabled } from "@/lib/site-pages";
import { getPageOverride } from "@/lib/site-page-content";
import { SitePageOverride } from "@/components/site-page-override";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ContactPage() {
  if (!(await isPageEnabled("/contact"))) notFound();
  const locale = await getLocale();
  const override = await getPageOverride("/contact", locale);
  if (override) return <SitePageOverride title={override.title} body={override.body} />;
  const t = await getTranslations("contactPage");
  const [pageOverrides, siteOverrides] = await Promise.all([
    getSiteContentMap({ prefix: "contactPage.", locale }),
    getSiteContentValues({ keys: ["site.supportEmail"], locale })
  ]);

  const c = (key: string, fallback: string) => pageOverrides[key] ?? fallback;
  const supportEmail = siteOverrides["site.supportEmail"] ?? site.supportEmail;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{c("contactPage.title", t("title"))}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{c("contactPage.subtitle", t("subtitle"))}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="font-medium">{c("contactPage.emailTitle", t("emailTitle"))}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            <a className="underline hover:text-foreground" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </p>
        </Card>
        <Card className="p-6">
          <div className="font-medium">{c("contactPage.hoursTitle", t("hoursTitle"))}</div>
          <p className="mt-2 text-sm text-muted-foreground">{c("contactPage.hoursValue", t("hoursValue"))}</p>
        </Card>
      </div>
    </Container>
  );
}

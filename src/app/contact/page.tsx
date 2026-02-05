import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ContactPage() {
  const t = await getTranslations("contactPage");
  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="font-medium">{t("emailTitle")}</div>
          <p className="mt-2 text-sm text-muted-foreground">
            <a className="underline hover:text-foreground" href={`mailto:${site.supportEmail}`}>
              {site.supportEmail}
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

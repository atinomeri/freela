import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { getLocale, getTranslations } from "next-intl/server";
import { formatLongDate } from "@/lib/date";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legalPrivacyPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations("legalPrivacyPage");
  const updatedAt = new Date("2026-02-04T00:00:00.000Z");
  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
        {t("subtitle")}
      </p>

      <div className="mt-4 text-xs text-muted-foreground">
        {t("lastUpdated", { date: formatLongDate(updatedAt, locale) })}
      </div>

      <div className="mt-8 grid gap-6">
        {[0, 1, 2, 3].map((i) => (
          <section key={i} className="grid gap-2">
            <h2 className="text-base font-semibold">{t(`sections.${i}.title`)}</h2>
            <p className="text-sm text-muted-foreground">
              {t(`sections.${i}.body`, i === 3 ? { email: site.supportEmail } : undefined)}
            </p>
          </section>
        ))}
      </div>
    </Container>
  );
}

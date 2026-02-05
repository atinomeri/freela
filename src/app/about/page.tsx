import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aboutPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");
  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="text-2xl font-semibold">{t(`stats.${i}.value`)}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t(`stats.${i}.label`)}</div>
          </Card>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-lg font-semibold">{t("missionTitle")}</div>
          <p className="mt-2 text-sm text-muted-foreground">{t("missionBody")}</p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>{t("missionPoints.0")}</li>
            <li>{t("missionPoints.1")}</li>
            <li>{t("missionPoints.2")}</li>
          </ul>
        </Card>

        <Card className="p-6">
          <div className="text-lg font-semibold">{t("howTitle")}</div>
          <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium text-foreground">{t(`howSteps.${i}.title`)}</div>
                  <div className="mt-1">{t(`howSteps.${i}.description`)}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">{t("valuesTitle")}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("valuesSubtitle")}</p>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="p-6">
            <div className="font-medium">{t("cards.0.title")}</div>
            <p className="mt-2 text-sm text-muted-foreground">{t("cards.0.description")}</p>
          </Card>
          <Card className="p-6">
            <div className="font-medium">{t("cards.1.title")}</div>
            <p className="mt-2 text-sm text-muted-foreground">{t("cards.1.description")}</p>
          </Card>
          <Card className="p-6">
            <div className="font-medium">{t("cards.2.title")}</div>
            <p className="mt-2 text-sm text-muted-foreground">{t("cards.2.description")}</p>
          </Card>
        </div>
      </div>

      <Card className="mt-10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">{t("ctaTitle")}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t("ctaSubtitle")}</div>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/auth/register">{t("ctaPrimary")}</ButtonLink>
            <ButtonLink href="/freelancers" variant="secondary">
              {t("ctaSecondary")}
            </ButtonLink>
          </div>
        </div>
      </Card>
    </Container>
  );
}

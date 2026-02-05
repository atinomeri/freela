import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <Container className="py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/">{t("home")}</ButtonLink>
        <Link className="self-center text-sm text-muted-foreground underline hover:text-foreground" href="/projects">
          {t("projects")}
        </Link>
      </div>
    </Container>
  );
}

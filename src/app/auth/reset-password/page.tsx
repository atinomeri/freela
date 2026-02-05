import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ResetPasswordForm } from "@/app/auth/reset-password/reset-password-form";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authResetPassword");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const t = await getTranslations("authResetPassword");
  const sp = (await searchParams) ?? {};
  const token = typeof sp.token === "string" ? sp.token : "";

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("subtitle")}</p>

        <ResetPasswordForm token={token} />

        <p className="mt-4 text-xs text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/auth/login">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ForgotPasswordForm } from "@/app/auth/forgot-password/reset-request-form";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authForgotPassword");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("authForgotPassword");
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("subtitle")}</p>

        <ForgotPasswordForm />

        <p className="mt-4 text-xs text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/auth/login">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </Container>
  );
}

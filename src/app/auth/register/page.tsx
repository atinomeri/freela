import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/app/auth/register/register-form";
import { UserPlus } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authRegister");
  return { title: t("title"), description: t("subtitle") };
}

export default async function RegisterPage() {
  const t = await getTranslations("authRegister");

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-1/4 bottom-0 h-96 w-96 rounded-full bg-success/5 blur-3xl" />
      </div>

      <Container className="flex items-center justify-center py-12 sm:py-20">
        <Card className="w-full max-w-lg overflow-hidden border-border/50 shadow-xl">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            }>
              <RegisterForm />
            </Suspense>
          </div>
        </Card>
      </Container>
    </div>
  );
}

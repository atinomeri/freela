import { NewProjectForm } from "@/app/projects/new/new-project-form";
import { Container } from "@/components/ui/container";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("projectsNewPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function NewProjectPage() {
  const t = await getTranslations("projectsNewPage");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "EMPLOYER") redirect("/dashboard");

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        <NewProjectForm />
      </div>
    </Container>
  );
}

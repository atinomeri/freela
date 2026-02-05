import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/role";
import { Container } from "@/components/ui/container";
import { ProfileForm } from "@/app/dashboard/profile/profile-form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardProfile");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ProfilePage() {
  const t = await getTranslations("dashboardProfile");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "FREELANCER") redirect(roleHome(session.user.role));

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { title: true, bio: true, skills: true, hourlyGEL: true }
  });

  const skillsText = Array.isArray(profile?.skills)
    ? profile?.skills.join(", ")
    : typeof profile?.skills === "string"
      ? profile?.skills
      : "";

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

        <ProfileForm
          initial={{
            title: profile?.title ?? "",
            bio: profile?.bio ?? "",
            skills: skillsText ?? "",
            hourlyGEL: profile?.hourlyGEL ? String(profile?.hourlyGEL) : ""
          }}
        />
      </div>
    </Container>
  );
}

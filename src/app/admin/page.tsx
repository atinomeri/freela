import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/role";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPage");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminPage() {
  const t = await getTranslations("adminPage");
  const tRoles = await getTranslations("roles");
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  // middleware blocks non-admins; keep a safe fallback anyway
  if (role !== "ADMIN") {
    return (
      <Container className="py-12 sm:py-16">
        <Card className="p-6">
          <div className="font-medium">{t("forbiddenTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
        </Card>
      </Container>
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/dashboard">
          {t("dashboard")}
        </Link>
      </div>

      <Card className="mt-8 p-6">
        <div className="text-sm font-medium text-muted-foreground">{t("usersTitle")}</div>
        <div className="mt-4 grid gap-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border border-border bg-background/70 px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="text-xs text-muted-foreground">{roleLabel(u.role, tRoles)}</div>
            </div>
          ))}
        </div>
      </Card>
    </Container>
  );
}

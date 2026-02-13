import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { PagesTable } from "@/app/admin/pages/pages-table";
import { BUILTIN_PAGE_PATHS } from "@/lib/site-pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPages");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminPagesPage() {
  const t = await getTranslations("adminPages");
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("forbiddenTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
      </Card>
    );
  }

  const builtinSet = new Set<string>(BUILTIN_PAGE_PATHS as readonly string[]);
  const allPages = await prisma.sitePage.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      path: true,
      isEnabled: true,
      isVisible: true,
      updatedAt: true,
      contents: {
        where: { locale: "ka" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { title: true }
      }
    }
  });

  const byPath = new Map(allPages.map((p) => [p.path, p]));

  const builtins = (BUILTIN_PAGE_PATHS as readonly string[]).map((path) => {
    const row = byPath.get(path);
    return {
      id: row?.id ?? null,
      path,
      kind: "builtin" as const,
      isEnabled: row?.isEnabled ?? true,
      isVisible: row?.isVisible ?? true,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      titlePreview: null
    };
  });

  const custom = allPages
    .filter((p) => !builtinSet.has(p.path))
    .map((p) => ({
      id: p.id,
      path: p.path,
      kind: "custom" as const,
      isEnabled: p.isEnabled,
      isVisible: p.isVisible,
      updatedAt: p.updatedAt.toISOString(),
      titlePreview: p.contents[0]?.title ?? null
    }));

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
      </div>
      <PagesTable initialPages={[...builtins, ...custom]} />
    </div>
  );
}

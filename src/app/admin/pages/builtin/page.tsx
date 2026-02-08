import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { PageEditor } from "@/app/admin/pages/page-editor";
import { BUILTIN_PAGE_PATHS } from "@/lib/site-pages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPageEditor");
  return { title: t("editTitle") };
}

export default async function AdminBuiltinPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("adminPageEditor");
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("forbiddenTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
      </Card>
    );
  }

  const sp = (await searchParams) ?? {};
  const pathRaw = typeof sp.path === "string" ? sp.path.trim() : "";
  const path = pathRaw || "/";
  const isBuiltin = (BUILTIN_PAGE_PATHS as readonly string[]).includes(path);
  if (!isBuiltin) {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("notFoundTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("notFoundSubtitle")}</div>
      </Card>
    );
  }

  const upserted = await prisma.sitePage.upsert({
    where: { path },
    create: { path, isEnabled: true },
    update: {},
    select: { id: true, path: true }
  });

  const locales: Array<"ka" | "en" | "ru"> = ["ka", "en", "ru"];
  await prisma.$transaction(
    locales.map((locale) =>
      prisma.sitePageContent.upsert({
        where: { pageId_locale: { pageId: upserted.id, locale } },
        create: { pageId: upserted.id, locale, title: "", body: "" },
        update: {}
      })
    )
  );

  const contents = await prisma.sitePageContent.findMany({
    where: { pageId: upserted.id },
    select: { locale: true, title: true, body: true }
  });
  const byLocale = new Map(contents.map((c) => [c.locale, c]));
  const get = (locale: "ka" | "en" | "ru") => {
    const c = byLocale.get(locale);
    return { title: c?.title ?? "", body: c?.body ?? "" };
  };

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">{t("editTitle")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("editSubtitle")}</div>
      </div>
      <PageEditor
        mode="edit"
        pageId={upserted.id}
        initialPath={upserted.path}
        pathReadonly
        initialContents={{ ka: get("ka"), en: get("en"), ru: get("ru") }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { PageEditor } from "@/app/admin/pages/page-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPageEditor");
  return { title: t("editTitle") };
}

export default async function AdminEditPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("adminPageEditor");
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

  const { id } = await params;
  const page = await prisma.sitePage.findUnique({
    where: { id },
    select: {
      id: true,
      path: true,
      contents: { select: { locale: true, title: true, body: true } }
    }
  });

  if (!page) {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("notFoundTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("notFoundSubtitle")}</div>
      </Card>
    );
  }

  const byLocale = new Map(page.contents.map((c) => [c.locale, c]));
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
        pageId={page.id}
        initialPath={page.path}
        initialContents={{ ka: get("ka"), en: get("en"), ru: get("ru") }}
      />
    </div>
  );
}


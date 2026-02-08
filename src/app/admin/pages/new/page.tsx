import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { PageEditor } from "@/app/admin/pages/page-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPageEditor");
  return { title: t("newTitle") };
}

export default async function AdminNewPage() {
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

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">{t("newTitle")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("newSubtitle")}</div>
      </div>
      <PageEditor
        mode="create"
        pageId={null}
        initialPath="/new-page"
        initialContents={{
          ka: { title: "", body: "" },
          en: { title: "", body: "" },
          ru: { title: "", body: "" }
        }}
      />
    </div>
  );
}

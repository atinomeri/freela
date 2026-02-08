import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminContent");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminContentPage() {
  const t = await getTranslations("adminContent");
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
    <Card className="p-6">
      <div className="text-xl font-semibold">{t("title")}</div>
      <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border border-border bg-background/60 px-4 py-3 hover:bg-muted/40" href="/admin/content/pricing">
          <div className="font-medium">{t("pricingTitle")}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("pricingSubtitle")}</div>
        </Link>
        <Link className="rounded-lg border border-border bg-background/60 px-4 py-3 hover:bg-muted/40" href="/admin/content/contact">
          <div className="font-medium">{t("contactTitle")}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("contactSubtitle")}</div>
        </Link>
      </div>
    </Card>
  );
}


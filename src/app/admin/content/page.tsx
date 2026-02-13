import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminContent");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminContentPage() {
  const t = await getTranslations("adminContent");
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

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
      </div>

      <Card className="p-5">
        <div className="text-sm font-medium">Homepage ტექსტები</div>
        <div className="mt-1 text-sm text-muted-foreground">
          აქედან შეცვლი მთავარ სათაურს/ქვეთაურს, მათ შორის ტექსტს Freela აერთიანებს ქართველ დამკვეთებს...
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/admin/pages/edit?path=/" size="sm">
            Homepage კონტენტის რედაქტირება
          </ButtonLink>
          <ButtonLink href="/admin/pages" size="sm" variant="ghost" className="border border-border/70">
            ყველა გვერდის რედაქტორი
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

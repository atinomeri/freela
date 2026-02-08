import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ContactContentEditor } from "@/app/admin/content/contact/contact-content-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminContentContact");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

const CONTACT_KEYS = [
  "contactPage.title",
  "contactPage.subtitle",
  "contactPage.emailTitle",
  "site.supportEmail",
  "contactPage.hoursTitle",
  "contactPage.hoursValue"
] as const;

export default async function AdminContactContentPage({ searchParams }: Props) {
  const t = await getTranslations("adminContentContact");
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
  const localeRaw = toSingle(sp.locale).trim().toLowerCase();
  const locale = localeRaw === "en" || localeRaw === "ru" ? localeRaw : "ka";

  const rows = await prisma.siteContent.findMany({
    where: { locale, key: { in: [...CONTACT_KEYS] } },
    select: { key: true, value: true }
  });
  const values: Record<string, string> = {};
  for (const row of rows) values[row.key] = row.value;

  return (
    <Card className="p-6">
      <div className="text-xl font-semibold">{t("title")}</div>
      <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>

      <div className="mt-5">
        <ContactContentEditor locale={locale} keys={[...CONTACT_KEYS]} initialValues={values} />
      </div>
    </Card>
  );
}


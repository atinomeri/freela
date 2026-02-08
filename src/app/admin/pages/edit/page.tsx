import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { getNamespaceKeysFromMessages } from "@/lib/message-keys";
import { getSiteContentValues } from "@/lib/site-content";
import { PageContentEditor } from "@/app/admin/pages/page-content-editor";
import { BUILTIN_PAGE_PATHS } from "@/lib/site-pages";

const PATH_TO_NAMESPACES: Record<string, string[]> = {
  "/": ["home"],
  "/about": ["aboutPage"],
  "/contact": ["contactPage"],
  "/pricing": ["pricingPage"],
  "/legal/terms": ["legalTermsPage"],
  "/legal/privacy": ["legalPrivacyPage"],
  "/projects": ["projects", "categories"],
  "/freelancers": ["freelancers", "categories"]
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminPageContent");
  return { title: t("title") };
}

export default async function AdminEditBuiltInPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("adminPageContent");
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
  const namespaces = PATH_TO_NAMESPACES[path] ?? [];
  if (!isBuiltin || namespaces.length === 0) {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("notFoundTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("notFoundSubtitle")}</div>
      </Card>
    );
  }

  const localeRaw = String(sp.locale ?? "ka").trim().toLowerCase();
  const locale = (localeRaw === "en" || localeRaw === "ru" ? localeRaw : "ka") as "ka" | "en" | "ru";

  const messages = (await import(`../../../../../messages/en.json`)).default as any;

  const keys = namespaces
    .flatMap((ns) => getNamespaceKeysFromMessages(messages, ns).map((k) => `${ns}.${k}`))
    .sort();

  const initialValues = await getSiteContentValues({ keys, locale });

  return (
    <div className="grid gap-4">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle", { path })}</div>
      </div>
      <PageContentEditor locale={locale} keys={keys} initialValues={initialValues} />
    </div>
  );
}

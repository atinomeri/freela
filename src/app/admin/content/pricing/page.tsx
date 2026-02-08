import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminContentPricing");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminPricingContentPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const localeRaw = toSingle(sp.locale).trim().toLowerCase();
  const locale = localeRaw === "en" || localeRaw === "ru" ? localeRaw : "ka";
  redirect(`/admin/pages/edit?path=%2Fpricing&locale=${encodeURIComponent(locale)}`);
}

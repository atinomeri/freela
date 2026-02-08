import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

function toPath(slug: string[] | undefined) {
  const parts = (slug ?? []).map((s) => String(s || "").trim()).filter(Boolean);
  return `/${parts.join("/")}`.replace(/\/{2,}/g, "/");
}

function pickContent(
  contents: Array<{ locale: string; title: string; body: string }>,
  locale: string
): { title: string; body: string } | null {
  const byExact = contents.find((c) => c.locale === locale);
  if (byExact) return { title: byExact.title, body: byExact.body };
  const byLang = contents.find((c) => c.locale === locale.split("-")[0]);
  if (byLang) return { title: byLang.title, body: byLang.body };
  const byEn = contents.find((c) => c.locale === "en");
  if (byEn) return { title: byEn.title, body: byEn.body };
  const first = contents[0];
  return first ? { title: first.title, body: first.body } : null;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  if (process.env.NEXT_PHASE === "phase-production-build") return {};
  const { slug } = await params;
  const path = toPath(slug);
  const locale = await getLocale();

  const page = await prisma.sitePage.findUnique({
    where: { path },
    select: {
      isEnabled: true,
      contents: { select: { locale: true, title: true, body: true } }
    }
  });

  if (!page?.isEnabled) return {};
  const content = pickContent(page.contents, locale);
  if (!content) return {};

  const description = content.body.replace(/\s+/g, " ").trim().slice(0, 160);
  return { title: content.title, description };
}

export default async function CustomSitePage({
  params
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  if (process.env.NEXT_PHASE === "phase-production-build") notFound();
  const { slug } = await params;
  const path = toPath(slug);
  const locale = await getLocale();

  const page = await prisma.sitePage.findUnique({
    where: { path },
    select: {
      isEnabled: true,
      contents: { select: { locale: true, title: true, body: true } }
    }
  });

  if (!page || !page.isEnabled) notFound();

  const content = pickContent(page.contents, locale);
  if (!content) notFound();

  return (
    <Container className="py-12 sm:py-16">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
        <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{content.body}</div>
      </Card>
    </Container>
  );
}

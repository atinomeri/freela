import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

function pathFromSlug(slug: string[] | undefined) {
  const parts = Array.isArray(slug) ? slug : [];
  const cleaned = parts.filter(Boolean).map((s) => String(s).replace(/^\/+|\/+$/g, ""));
  const path = `/${cleaned.filter(Boolean).join("/")}`;
  return path === "/" ? "/" : path;
}

async function getPageForLocale(path: string, locale: string) {
  const page = await prisma.sitePage.findUnique({
    where: { path },
    select: {
      id: true,
      isEnabled: true,
      contents: {
        where: { locale },
        select: { title: true, body: true }
      }
    }
  });

  if (!page || !page.isEnabled) return null;
  const content = page.contents[0] ?? null;
  if (content) return { pageId: page.id, content };

  const fallback = await prisma.sitePageContent.findFirst({
    where: { pageId: page.id },
    orderBy: { createdAt: "asc" },
    select: { title: true, body: true }
  });

  if (!fallback) return null;
  return { pageId: page.id, content: fallback };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { slug } = await params;
  const path = pathFromSlug(slug);
  const page = await getPageForLocale(path, locale);
  if (!page) return {};

  const title = page.content.title.trim();
  const description = page.content.body.trim().slice(0, 160);
  return { title: title || undefined, description: description || undefined };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const locale = await getLocale();
  const { slug } = await params;
  const path = pathFromSlug(slug);
  const page = await getPageForLocale(path, locale);
  if (!page) notFound();

  const title = page.content.title.trim();
  const body = page.content.body.trim();

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {title ? <h1 className="text-3xl font-semibold tracking-tight">{title}</h1> : null}
        {body ? (
          <div className={["mt-4", "text-sm", "leading-relaxed", "text-muted-foreground", "whitespace-pre-wrap"].join(" ")}>
            {body}
          </div>
        ) : null}
      </div>
    </Container>
  );
}

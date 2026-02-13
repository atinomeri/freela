import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILTIN_PAGE_PATHS, isValidPagePath } from "@/lib/site-pages";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function isReservedCustomPath(path: string) {
  if ((BUILTIN_PAGE_PATHS as readonly string[]).includes(path)) return true;
  const blockedPrefixes = ["/api", "/admin", "/auth", "/dashboard", "/_next"] as const;
  if (blockedPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) return true;
  const blockedExact = ["/robots.txt", "/sitemap.xml", "/icon.svg", "/favicon.ico"] as const;
  if ((blockedExact as readonly string[]).includes(path)) return true;
  return false;
}

type Locale = "ka" | "en" | "ru";

function normalizeContent(input: unknown) {
  const content = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title = String(content.title ?? "");
  const body = String(content.body ?? "");
  return { title, body };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;

  const existing = await prisma.sitePage.findUnique({ where: { id }, select: { id: true, path: true } });
  if (!existing) return jsonError("PAGE_NOT_FOUND", 404);

  const body = (await req.json().catch(() => null)) as { path?: unknown; contents?: unknown } | null;
  const path = String(body?.path ?? "").trim();
  if (!isValidPagePath(path)) return jsonError("PAGE_PATH_INVALID", 400);
  if (isReservedCustomPath(path)) return jsonError("PAGE_PATH_RESERVED", 400);

  const contentsRaw = body?.contents && typeof body.contents === "object" ? (body.contents as Record<string, unknown>) : null;
  const locales: Locale[] = ["ka", "en", "ru"];
  const contents = locales.map((locale) => ({ locale, ...normalizeContent(contentsRaw?.[locale]) }));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sitePage.update({ where: { id }, data: { path } });
      for (const c of contents) {
        await tx.sitePageContent.upsert({
          where: { pageId_locale: { pageId: id, locale: c.locale } },
          create: { pageId: id, locale: c.locale, title: c.title, body: c.body },
          update: { title: c.title, body: c.body }
        });
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("SitePage_path_key") || msg.includes("Unique constraint") || msg.includes("unique constraint")) {
      return jsonError("PAGE_EXISTS", 409);
    }
    throw e;
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


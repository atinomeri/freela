import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

type Body = {
  locale?: unknown;
  items?: unknown;
  updates?: unknown;
};

const ALLOWED_LOCALES = ["ka", "en", "ru"] as const;
type Locale = (typeof ALLOWED_LOCALES)[number];

function asLocale(value: unknown): Locale | null {
  const locale = String(value ?? "").trim().toLowerCase();
  return ALLOWED_LOCALES.includes(locale as Locale) ? (locale as Locale) : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as Body | null;

  const updatesRaw = Array.isArray(body?.updates) ? (body?.updates as unknown[]) : null;
  if (updatesRaw) {
    if (updatesRaw.length === 0 || updatesRaw.length > 600) return jsonError("INVALID_REQUEST", 400);

    const updates = updatesRaw
      .map((it) => {
        const key = String(it?.key ?? "").trim();
        const locale = asLocale(it?.locale);
        const value = String(it?.value ?? "");
        return { key, locale, value };
      })
      .filter((it) => it.locale && it.key.length > 0 && it.key.length <= 200) as Array<{
      key: string;
      locale: Locale;
      value: string;
    }>;

    if (updates.length === 0) return jsonError("INVALID_REQUEST", 400);

    await prisma.$transaction(async (tx) => {
      for (const it of updates) {
        const v = it.value.trim();
        if (!v) {
          await tx.siteContent.deleteMany({ where: { key: it.key, locale: it.locale } });
          continue;
        }
        await tx.siteContent.upsert({
          where: { key_locale: { key: it.key, locale: it.locale } },
          create: { key: it.key, locale: it.locale, value: it.value },
          update: { value: it.value }
        });
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const locale = asLocale(body?.locale);
  if (!locale) return jsonError("INVALID_REQUEST", 400);

  const itemsRaw = Array.isArray(body?.items) ? (body?.items as unknown[]) : null;
  if (!itemsRaw || itemsRaw.length === 0) return jsonError("INVALID_REQUEST", 400);
  if (itemsRaw.length > 200) return jsonError("INVALID_REQUEST", 400);

  const items = itemsRaw
    .map((it) => {
      const key = String(it?.key ?? "").trim();
      const value = String(it?.value ?? "");
      return { key, value };
    })
    .filter((it) => it.key.length > 0 && it.key.length <= 200);

  if (items.length === 0) return jsonError("INVALID_REQUEST", 400);

  await prisma.$transaction(async (tx) => {
    for (const it of items) {
      const v = it.value.trim();
      if (!v) {
        await tx.siteContent.deleteMany({ where: { key: it.key, locale } });
        continue;
      }
      await tx.siteContent.upsert({
        where: { key_locale: { key: it.key, locale } },
        create: { key: it.key, locale, value: it.value },
        update: { value: it.value }
      });
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

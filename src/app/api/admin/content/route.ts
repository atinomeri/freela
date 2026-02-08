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
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as Body | null;
  const locale = String(body?.locale ?? "").trim().toLowerCase();
  if (locale !== "ka" && locale !== "en" && locale !== "ru") return jsonError("INVALID_REQUEST", 400);

  const itemsRaw = Array.isArray(body?.items) ? (body?.items as any[]) : null;
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


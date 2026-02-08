import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidPagePath } from "@/lib/site-pages";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as { path?: unknown; isEnabled?: unknown } | null;
  const path = String(body?.path ?? "").trim();
  const isEnabled = Boolean(body?.isEnabled);
  if (!isValidPagePath(path)) return jsonError("PAGE_PATH_INVALID", 400);

  await prisma.sitePage.upsert({
    where: { path },
    create: { path, isEnabled },
    update: { isEnabled }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}


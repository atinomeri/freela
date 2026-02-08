import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILTIN_PAGE_PATHS } from "@/lib/site-pages";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;
  const page = await prisma.sitePage.findUnique({ where: { id }, select: { id: true, path: true } });
  if (!page) return jsonError("PAGE_NOT_FOUND", 404);

  if ((BUILTIN_PAGE_PATHS as readonly string[]).includes(page.path)) {
    return jsonError("PAGE_PATH_RESERVED", 400);
  }

  await prisma.sitePage.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}


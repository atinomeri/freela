import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateProjectListingCache } from "@/lib/cache";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { isOpen?: unknown } | null;
  const isOpen = typeof body?.isOpen === "boolean" ? body.isOpen : Boolean(body?.isOpen);

  const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return jsonError("NOT_FOUND", 404);

  await prisma.project.update({
    where: { id },
    data: { isOpen, ...(isOpen ? { completedAt: null } : {}) }
  });

  await invalidateProjectListingCache();

  return NextResponse.json({ ok: true }, { status: 200 });
}


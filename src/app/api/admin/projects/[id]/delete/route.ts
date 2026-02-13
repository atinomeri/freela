import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;
  const exists = await prisma.project.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return jsonError("NOT_FOUND", 404);

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}


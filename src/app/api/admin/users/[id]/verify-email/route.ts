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
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, emailVerifiedAt: true } });
  if (!user) return jsonError("NOT_FOUND", 404);

  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}


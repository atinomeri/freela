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
  const sessionUserId = session?.user?.id;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;
  if (sessionUserId && id === sessionUserId) return jsonError("CANNOT_DELETE_SELF", 400);

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) return jsonError("NOT_FOUND", 404);

  if (user.role === "ADMIN") {
    const adminsCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminsCount <= 1) return jsonError("LAST_ADMIN", 400);
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}


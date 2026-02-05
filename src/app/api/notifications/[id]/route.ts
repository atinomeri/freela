import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const { id } = await params;
  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, readAt: true }
  });
  if (!notification) return jsonError("NOT_FOUND", 404);

  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

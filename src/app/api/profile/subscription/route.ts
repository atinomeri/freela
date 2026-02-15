import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { projectEmailSubscribed: true }
  });

  return NextResponse.json({ ok: true, subscribed: user?.projectEmailSubscribed ?? false });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as { subscribed?: unknown } | null;
  const subscribed = body?.subscribed === true;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { projectEmailSubscribed: subscribed }
  });

  return NextResponse.json({ ok: true, subscribed });
}

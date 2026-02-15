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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true }
  });

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; phone?: unknown }
    | null;

  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();

  if (name.length < 2) return jsonError("NAME_MIN", 400);
  if (name.length > 100) return jsonError("NAME_MAX", 400);
  
  // Basic phone validation - allow digits, +, spaces, dashes
  const phoneClean = phone.replace(/[\s\-()]/g, "");
  if (phoneClean && !/^\+?\d{9,15}$/.test(phoneClean)) {
    return jsonError("PHONE_INVALID", 400);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, phone: phoneClean || null },
    select: { id: true, name: true, email: true, phone: true }
  });

  return NextResponse.json({ ok: true, user });
}

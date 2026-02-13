import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await params;
  const threadId = String(id ?? "").trim();
  if (!threadId) return jsonError("INVALID_REQUEST", 400);

  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "").trim().toUpperCase();
  if (status !== "OPEN" && status !== "CLOSED") return jsonError("INVALID_REQUEST", 400);

  try {
    await prisma.supportThread.update({
      where: { id: threadId },
      data: { status: status as "OPEN" | "CLOSED" }
    });
  } catch {
    return jsonError("NOT_FOUND", 404);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

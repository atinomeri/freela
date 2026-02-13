import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const userId = session?.user?.id;
  if (!userId) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await params;
  const threadId = String(id ?? "").trim();
  if (!threadId) return jsonError("INVALID_REQUEST", 400);

  const limit = await checkRateLimit({
    scope: "admin:support:reply",
    key: userId,
    limit: 180,
    windowSeconds: 10 * 60
  });
  if (!limit.allowed) return jsonError("RATE_LIMITED", 429);

  const bodyRaw = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const body = String(bodyRaw?.body ?? "").trim();
  if (body.length < 1 || body.length > 2000) return jsonError("INVALID_REQUEST", 400);

  const exists = await prisma.supportThread.findUnique({
    where: { id: threadId },
    select: { id: true }
  });
  if (!exists) return jsonError("NOT_FOUND", 404);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        threadId,
        senderRole: "ADMIN",
        senderUserId: userId,
        body
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderRole: true
      }
    });
    await tx.supportThread.update({
      where: { id: threadId },
      data: { status: "OPEN", lastMessageAt: new Date() }
    });
    return created;
  });

  return NextResponse.json(
    {
      ok: true,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        senderRole: message.senderRole
      }
    },
    { status: 200 }
  );
}

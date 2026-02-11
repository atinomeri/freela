import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime-bus";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function isParticipant(thread: { employerId: string; freelancerId: string }, userId: string) {
  return thread.employerId === userId || thread.freelancerId === userId;
}

type Body = {
  messageIds?: unknown;
  read?: unknown;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  const userLimit = await checkRateLimit({ scope: "threads:ack:user", key: session.user.id, limit: 240, windowSeconds: 5 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const { id } = await params;
  const thread = await prisma.thread.findUnique({
    where: { id },
    select: { id: true, employerId: true, freelancerId: true }
  });
  if (!thread || !isParticipant(thread, session.user.id)) {
    return jsonError("NOT_FOUND", 404);
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const read = Boolean(body?.read);

  let messageIds: string[] | null = null;
  if (Array.isArray(body?.messageIds)) {
    messageIds = body!.messageIds.map(String).filter(Boolean).slice(0, 200);
  }

  // If not provided, ack up to 200 latest un-acked messages for this viewer.
  if (!messageIds || messageIds.length === 0) {
    const candidates = await prisma.message.findMany({
      where: {
        threadId: id,
        senderId: { not: session.user.id },
        OR: [{ deliveredAt: null }, ...(read ? [{ readAt: null }] : [])]
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true }
    });
    messageIds = candidates.map((m) => m.id);
  }

  if (messageIds.length === 0) {
    return NextResponse.json({ ok: true, updates: [] }, { status: 200 });
  }

  const now = new Date();

  await prisma.message.updateMany({
    where: {
      id: { in: messageIds },
      threadId: id,
      senderId: { not: session.user.id },
      deliveredAt: null
    },
    data: { deliveredAt: now }
  });

  if (read) {
    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        threadId: id,
        senderId: { not: session.user.id },
        readAt: null
      },
      data: { readAt: now, deliveredAt: now }
    });
  }

  const updates = await prisma.message.findMany({
    where: { id: { in: messageIds }, threadId: id },
    select: { id: true, deliveredAt: true, readAt: true }
  });

  try {
    await publish("events", {
      type: "message_status",
      toUserIds: [thread.employerId, thread.freelancerId],
      data: { threadId: id, updates }
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[ack] publish failed", e);
  }

  return NextResponse.json({ ok: true, updates }, { status: 200 });
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function toSafeString(value: unknown, max = 400) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function parseBody(value: unknown) {
  const body = String(value ?? "").trim();
  if (body.length < 1 || body.length > 2000) return null;
  return body;
}

function toPublicMessages(
  messages: Array<{
    id: string;
    body: string;
    createdAt: Date;
    senderRole: "VISITOR" | "USER" | "ADMIN";
    senderUserId: string | null;
  }>,
  viewerUserId: string | undefined
) {
  return messages.map((m) => {
    const mine = viewerUserId
      ? m.senderUserId === viewerUserId || (m.senderRole !== "ADMIN" && m.senderUserId === null)
      : m.senderRole !== "ADMIN";
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderRole: m.senderRole,
      mine
    };
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const url = new URL(req.url);
  const threadId = toSafeString(url.searchParams.get("threadId"), 100);
  const token = toSafeString(url.searchParams.get("token"), 500);
  const tokenHash = token ? sha256(token) : "";

  const ip = getClientIp(req);
  const rateKey = userId ? `user:${userId}` : `ip:${ip}:${tokenHash || "none"}`;
  const limit = await checkRateLimit({
    scope: "support:chat:get",
    key: rateKey,
    limit: 180,
    windowSeconds: 10 * 60
  });
  if (!limit.allowed) return jsonError("RATE_LIMITED", 429);

  let thread:
    | {
        id: string;
        status: "OPEN" | "CLOSED";
      }
    | null = null;

  if (threadId) {
    const where: any = { id: threadId };
    if (userId) {
      where.OR = [{ requesterUserId: userId }, ...(tokenHash ? [{ visitorTokenHash: tokenHash }] : [])];
    } else if (tokenHash) {
      where.visitorTokenHash = tokenHash;
    } else {
      return jsonError("FORBIDDEN", 403);
    }
    thread = await prisma.supportThread.findFirst({
      where,
      select: { id: true, status: true }
    });
  } else if (userId) {
    thread = await prisma.supportThread.findFirst({
      where: { requesterUserId: userId },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true, status: true }
    });
  } else if (tokenHash) {
    thread = await prisma.supportThread.findFirst({
      where: { visitorTokenHash: tokenHash },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true, status: true }
    });
  }

  if (!thread) {
    return NextResponse.json({ ok: true, threadId: null, status: null, messages: [] }, { status: 200 });
  }

  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderRole: true,
      senderUserId: true
    }
  });

  return NextResponse.json(
    {
      ok: true,
      threadId: thread.id,
      status: thread.status,
      messages: toPublicMessages(messages, userId)
    },
    { status: 200 }
  );
}

type PostBody = { threadId?: unknown; token?: unknown; body?: unknown };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  const body = (await req.json().catch(() => null)) as PostBody | null;
  const threadId = toSafeString(body?.threadId, 100);
  const token = toSafeString(body?.token, 500);
  const tokenHash = token ? sha256(token) : "";
  const messageBody = parseBody(body?.body);
  if (!messageBody) return jsonError("INVALID_REQUEST", 400);

  if (!userId && !tokenHash) return jsonError("INVALID_REQUEST", 400);

  const ip = getClientIp(req);
  const rateKey = userId ? `user:${userId}` : `ip:${ip}:${tokenHash || "none"}`;
  const limit = await checkRateLimit({
    scope: "support:chat:post",
    key: rateKey,
    limit: 40,
    windowSeconds: 10 * 60
  });
  if (!limit.allowed) return jsonError("RATE_LIMITED", 429);

  const whereAccess: any[] = [];
  if (userId) whereAccess.push({ requesterUserId: userId });
  if (tokenHash) whereAccess.push({ visitorTokenHash: tokenHash });

  let thread = threadId
    ? await prisma.supportThread.findFirst({
        where: { id: threadId, OR: whereAccess.length > 0 ? whereAccess : undefined },
        select: { id: true }
      })
    : null;

  if (!thread && userId) {
    thread = await prisma.supportThread.findFirst({
      where: { requesterUserId: userId, status: "OPEN" },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true }
    });
  }

  if (!thread && tokenHash) {
    thread = await prisma.supportThread.findFirst({
      where: { visitorTokenHash: tokenHash },
      select: { id: true }
    });
  }

  if (!thread) {
    thread = await prisma.supportThread.create({
      data: {
        requesterUserId: userId ?? null,
        requesterName: session?.user?.name ?? null,
        requesterEmail: session?.user?.email ?? null,
        visitorTokenHash: tokenHash || null
      },
      select: { id: true }
    });
  }

  const senderRole = userRole === "ADMIN" ? "ADMIN" : userId ? "USER" : "VISITOR";

  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        threadId: thread.id,
        senderRole,
        senderUserId: userId ?? null,
        body: messageBody
      }
    }),
    prisma.supportThread.update({
      where: { id: thread.id },
      data: { status: "OPEN", lastMessageAt: new Date() }
    })
  ]);

  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderRole: true,
      senderUserId: true
    }
  });

  return NextResponse.json(
    {
      ok: true,
      threadId: thread.id,
      messages: toPublicMessages(messages, userId)
    },
    { status: 200 }
  );
}

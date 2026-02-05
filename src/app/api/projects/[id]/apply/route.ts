import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime-bus";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { message?: unknown; priceGEL?: unknown } | null;
  const message = String(body?.message ?? "").trim();
  const priceRaw = body?.priceGEL;

  if (message.length < 20) return jsonError("MESSAGE_MIN", 400);

  let priceGEL: number | null = null;
  if (priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== "") {
    const parsed = Number.parseInt(String(priceRaw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return jsonError("PRICE_INVALID", 400);
    priceGEL = parsed;
  }

  try {
    // If DB was reset, the session token may still exist but the user row is gone.
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (!dbUser) return jsonError("SESSION_STALE", 401);

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, title: true, employerId: true, isOpen: true }
    });
    if (!project) return jsonError("PROJECT_NOT_FOUND", 404);
    if (!project.isOpen) return jsonError("PROJECT_CLOSED", 409);

    const proposal = await prisma.proposal.create({
      data: {
        projectId: id,
        freelancerId: session.user.id,
        message,
        priceGEL
      },
      select: { id: true, projectId: true, freelancerId: true, createdAt: true }
    });

    const notification = await prisma.notification.create({
      data: {
        userId: project.employerId,
        type: "NEW_PROPOSAL",
        title: "NEW_PROPOSAL",
        body: project.title,
        href: `/dashboard/projects/${project.id}`
      },
      select: { id: true, type: true, title: true, body: true, href: true, createdAt: true }
    });

    // Realtime is best-effort: proposal creation must succeed even if Redis/SSE is down.
    try {
      await publish("events", {
        type: "new_proposal",
        toUserIds: [project.employerId],
        data: { proposalId: proposal.id, projectId: project.id }
      });
      await publish("events", {
        type: "notification",
        toUserIds: [project.employerId],
        data: { notification }
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") console.error("[apply] publish failed", err);
    }

    return NextResponse.json({ ok: true, proposal }, { status: 200 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("DUPLICATE_PROPOSAL", 409);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return jsonError("FK_VIOLATION", 401);
    }
    if (process.env.NODE_ENV !== "production") console.error("[apply] error", err);
    return jsonError("APPLY_FAILED", 500);
  }
}

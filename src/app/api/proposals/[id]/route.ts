import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime-bus";
import { checkRateLimit } from "@/lib/rate-limit";

const allowed = new Set(["ACCEPTED", "REJECTED"]);

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);
  const userLimit = await checkRateLimit({ scope: "proposals:status:user", key: session.user.id, limit: 120, windowSeconds: 15 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "").toUpperCase();
  if (!allowed.has(status)) {
    return jsonError("STATUS_INVALID", 400);
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id, project: { employerId: session.user.id } },
    select: { id: true, status: true, freelancerId: true, projectId: true, project: { select: { id: true, title: true } } }
  });
  if (!proposal) return jsonError("NOT_FOUND", 404);

  if (proposal.status !== "PENDING") {
    return jsonError("STATUS_ALREADY_DECIDED", 409);
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data: { status: status as "ACCEPTED" | "REJECTED" },
    select: { id: true, status: true }
  });

  const notification = await prisma.notification.create({
    data: {
      userId: proposal.freelancerId,
      type: "PROPOSAL_STATUS",
      title: updated.status,
      body: proposal.project?.title ?? undefined,
      href: "/dashboard/proposals"
    },
    select: { id: true, type: true, title: true, body: true, href: true, createdAt: true }
  });

  try {
    await publish("events", {
      type: "proposal_status",
      toUserIds: [proposal.freelancerId],
      data: { proposalId: proposal.id, status: updated.status, projectId: proposal.projectId }
    });
    await publish("events", {
      type: "notification",
      toUserIds: [proposal.freelancerId],
      data: { notification }
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[proposal] publish failed", e);
  }

  return NextResponse.json({ ok: true, proposal: updated }, { status: 200 });
}

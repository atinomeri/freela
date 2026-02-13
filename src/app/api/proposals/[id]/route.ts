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

  const txResult = await prisma.$transaction(async (tx) => {
    if (status === "ACCEPTED") {
      const hasAccepted = await tx.proposal.findFirst({
        where: {
          projectId: proposal.projectId,
          status: "ACCEPTED",
          id: { not: proposal.id }
        },
        select: { id: true }
      });
      if (hasAccepted) {
        return { kind: "conflict" as const };
      }

      const acceptedCount = await tx.proposal.updateMany({
        where: { id: proposal.id, status: "PENDING" },
        data: { status: "ACCEPTED" }
      });
      if (acceptedCount.count !== 1) {
        return { kind: "conflict" as const };
      }

      const autoRejected = await tx.proposal.findMany({
        where: {
          projectId: proposal.projectId,
          id: { not: proposal.id },
          status: "PENDING"
        },
        select: { id: true, freelancerId: true }
      });

      if (autoRejected.length > 0) {
        await tx.proposal.updateMany({
          where: {
            projectId: proposal.projectId,
            id: { in: autoRejected.map((p) => p.id) }
          },
          data: { status: "REJECTED" }
        });
      }

      return {
        kind: "updated" as const,
        updated: { id: proposal.id, status: "ACCEPTED" as const },
        autoRejected
      };
    }

    const rejectedCount = await tx.proposal.updateMany({
      where: { id: proposal.id, status: "PENDING" },
      data: { status: "REJECTED" }
    });
    if (rejectedCount.count !== 1) {
      return { kind: "conflict" as const };
    }

    return {
      kind: "updated" as const,
      updated: { id: proposal.id, status: "REJECTED" as const },
      autoRejected: [] as { id: string; freelancerId: string }[]
    };
  });

  if (txResult.kind !== "updated") {
    return jsonError("STATUS_ALREADY_DECIDED", 409);
  }

  const updated = txResult.updated;

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

  const autoRejectNotifications =
    updated.status === "ACCEPTED" && txResult.autoRejected.length > 0
      ? await Promise.all(
          txResult.autoRejected.map((p) =>
            prisma.notification.create({
              data: {
                userId: p.freelancerId,
                type: "PROPOSAL_STATUS",
                title: "REJECTED",
                body: proposal.project?.title ?? undefined,
                href: "/dashboard/proposals"
              },
              select: { id: true, type: true, title: true, body: true, href: true, createdAt: true }
            })
          )
        )
      : [];

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

    for (const p of txResult.autoRejected) {
      await publish("events", {
        type: "proposal_status",
        toUserIds: [p.freelancerId],
        data: { proposalId: p.id, status: "REJECTED", projectId: proposal.projectId }
      });
    }

    if (autoRejectNotifications.length > 0) {
      await publish("events", {
        type: "notification",
        toUserIds: txResult.autoRejected.map((p) => p.freelancerId),
        data: { notifications: autoRejectNotifications }
      });
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[proposal] publish failed", e);
  }

  return NextResponse.json({ ok: true, proposal: updated }, { status: 200 });
}

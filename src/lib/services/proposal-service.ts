/**
 * Proposal Service
 * Handles proposal application, accept/reject with auto-reject logic
 */
import { prisma } from "@/lib/prisma";
import * as notificationService from "./notification-service";
import { ServiceError, conflict, notFound, forbidden, badRequest } from "./errors";

// ─── Apply ──────────────────────────────────────────────────

export type ApplyInput = {
  projectId: string;
  freelancerId: string;
  message: string;
  priceGEL: number | null;
};

export async function apply(input: ApplyInput) {
  const { projectId, freelancerId, message, priceGEL } = input;

  if (message.length < 20) throw badRequest("MESSAGE_MIN");

  // Verify user exists
  const dbUser = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: { id: true },
  });
  if (!dbUser) throw new ServiceError("SESSION_STALE", 401);

  // Verify project exists and is open
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, employerId: true, isOpen: true },
  });
  if (!project) throw notFound("PROJECT_NOT_FOUND");
  if (!project.isOpen) throw conflict("PROJECT_CLOSED");

  const proposal = await prisma.proposal.create({
    data: { projectId, freelancerId, message, priceGEL },
    select: { id: true, projectId: true, freelancerId: true, createdAt: true },
  });

  // Notify employer
  await notificationService.createAndEmit({
    userId: project.employerId,
    type: "NEW_PROPOSAL",
    title: "NEW_PROPOSAL",
    body: project.title,
    href: `/dashboard/projects/${project.id}`,
  });

  await notificationService.emitEvent("new_proposal", [project.employerId], {
    proposalId: proposal.id,
    projectId: project.id,
  });

  return proposal;
}

// ─── Accept / Reject ────────────────────────────────────────

export type DecideInput = {
  proposalId: string;
  employerId: string;
  status: "ACCEPTED" | "REJECTED";
};

export async function decide(input: DecideInput) {
  const { proposalId, employerId, status } = input;

  if (status !== "ACCEPTED" && status !== "REJECTED") {
    throw badRequest("STATUS_INVALID");
  }

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, project: { employerId } },
    select: {
      id: true,
      status: true,
      freelancerId: true,
      projectId: true,
      project: { select: { id: true, title: true } },
    },
  });
  if (!proposal) throw notFound("NOT_FOUND");

  const txResult = await prisma.$transaction(async (tx) => {
    if (status === "ACCEPTED") {
      // Ensure no other accepted proposal
      const hasAccepted = await tx.proposal.findFirst({
        where: { projectId: proposal.projectId, status: "ACCEPTED", id: { not: proposal.id } },
        select: { id: true },
      });
      if (hasAccepted) return { kind: "conflict" as const };

      const acceptedCount = await tx.proposal.updateMany({
        where: { id: proposal.id, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      if (acceptedCount.count !== 1) return { kind: "conflict" as const };

      // Auto-reject remaining PENDING proposals
      const autoRejected = await tx.proposal.findMany({
        where: { projectId: proposal.projectId, id: { not: proposal.id }, status: "PENDING" },
        select: { id: true, freelancerId: true },
      });

      if (autoRejected.length > 0) {
        await tx.proposal.updateMany({
          where: { projectId: proposal.projectId, id: { in: autoRejected.map((p) => p.id) } },
          data: { status: "REJECTED" },
        });
      }

      return {
        kind: "updated" as const,
        updated: { id: proposal.id, status: "ACCEPTED" as const },
        autoRejected,
      };
    }

    // REJECTED
    const rejectedCount = await tx.proposal.updateMany({
      where: { id: proposal.id, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    if (rejectedCount.count !== 1) return { kind: "conflict" as const };

    return {
      kind: "updated" as const,
      updated: { id: proposal.id, status: "REJECTED" as const },
      autoRejected: [] as { id: string; freelancerId: string }[],
    };
  });

  if (txResult.kind !== "updated") {
    throw conflict("STATUS_ALREADY_DECIDED");
  }

  const { updated, autoRejected } = txResult;
  const projectTitle = proposal.project?.title ?? undefined;

  // Notify primary freelancer
  await notificationService.createAndEmit({
    userId: proposal.freelancerId,
    type: "PROPOSAL_STATUS",
    title: updated.status,
    body: projectTitle,
    href: "/dashboard/proposals",
  });

  await notificationService.emitEvent("proposal_status", [proposal.freelancerId], {
    proposalId: proposal.id,
    status: updated.status,
    projectId: proposal.projectId,
  });

  // Notify auto-rejected freelancers
  if (autoRejected.length > 0) {
    const autoNotifs = autoRejected.map((p) => ({
      userId: p.freelancerId,
      type: "PROPOSAL_STATUS" as const,
      title: "REJECTED",
      body: projectTitle,
      href: "/dashboard/proposals",
    }));
    await notificationService.createAndEmitBatch(autoNotifs);

    for (const p of autoRejected) {
      await notificationService.emitEvent("proposal_status", [p.freelancerId], {
        proposalId: p.id,
        status: "REJECTED",
        projectId: proposal.projectId,
      });
    }
  }

  return updated;
}

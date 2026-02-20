/**
 * Proposal Service — unit tests
 *
 * External dependencies (prisma, notification-service) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

const { mockPrisma, mockNotification } = vi.hoisted(() => {
  const mockPrisma = {
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    proposal: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const mockNotification = {
    createAndEmit: vi.fn(async () => ({ id: "notif-1" })),
    createAndEmitBatch: vi.fn(async () => []),
    emitEvent: vi.fn(async () => undefined),
  };
  return { mockPrisma, mockNotification };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../notification-service", () => mockNotification);

import * as proposalService from "../proposal-service";
import { ServiceError } from "../errors";

// ── Helpers ─────────────────────────────────────────────────

const validApply: proposalService.ApplyInput = {
  projectId: "proj-1",
  freelancerId: "user-1",
  message: "Hello, I am very interested in this project and would love to work on it.",
  priceGEL: 500,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── apply() ────────────────────────────────────────────────

describe("proposalService.apply", () => {
  it("throws badRequest when message is too short", async () => {
    await expect(
      proposalService.apply({ ...validApply, message: "short" })
    ).rejects.toThrow(ServiceError);
    try {
      await proposalService.apply({ ...validApply, message: "short" });
    } catch (e) {
      expect((e as ServiceError).code).toBe("MESSAGE_MIN");
      expect((e as ServiceError).statusHint).toBe(400);
    }
  });

  it("throws 401 when user doesn't exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(proposalService.apply(validApply)).rejects.toThrow(ServiceError);
    try {
      await proposalService.apply(validApply);
    } catch (e) {
      expect((e as ServiceError).statusHint).toBe(401);
    }
  });

  it("throws notFound when project doesn't exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue(null);
    await expect(proposalService.apply(validApply)).rejects.toThrow(ServiceError);
    try {
      await proposalService.apply(validApply);
    } catch (e) {
      expect((e as ServiceError).code).toBe("PROJECT_NOT_FOUND");
    }
  });

  it("throws conflict when project is closed", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      title: "Test Project",
      employerId: "emp-1",
      isOpen: false,
    });
    await expect(proposalService.apply(validApply)).rejects.toThrow(ServiceError);
    try {
      await proposalService.apply(validApply);
    } catch (e) {
      expect((e as ServiceError).code).toBe("PROJECT_CLOSED");
    }
  });

  it("creates proposal and notifies employer on success", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      title: "Test Project",
      employerId: "emp-1",
      isOpen: true,
    });
    const createdProposal = {
      id: "prop-1",
      projectId: "proj-1",
      freelancerId: "user-1",
      createdAt: new Date(),
    };
    mockPrisma.proposal.create.mockResolvedValue(createdProposal);

    const result = await proposalService.apply(validApply);

    expect(result).toEqual(createdProposal);
    expect(mockPrisma.proposal.create).toHaveBeenCalledOnce();
    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "emp-1",
        type: "NEW_PROPOSAL",
      })
    );
    expect(mockNotification.emitEvent).toHaveBeenCalledWith(
      "new_proposal",
      ["emp-1"],
      expect.objectContaining({ proposalId: "prop-1" })
    );
  });
});

// ─── decide() ───────────────────────────────────────────────

describe("proposalService.decide", () => {
  const baseDecide: proposalService.DecideInput = {
    proposalId: "prop-1",
    employerId: "emp-1",
    status: "ACCEPTED",
  };

  const foundProposal = {
    id: "prop-1",
    status: "PENDING",
    freelancerId: "free-1",
    projectId: "proj-1",
    project: { id: "proj-1", title: "My Project" },
  };

  it("throws badRequest for invalid status", async () => {
    await expect(
      proposalService.decide({ ...baseDecide, status: "INVALID" as "ACCEPTED" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws notFound when proposal not found", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue(null);
    try {
      await proposalService.decide(baseDecide);
    } catch (e) {
      expect((e as ServiceError).code).toBe("NOT_FOUND");
    }
  });

  it("throws conflict when tx returns conflict", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue(foundProposal);
    mockPrisma.$transaction.mockResolvedValue({ kind: "conflict" });

    try {
      await proposalService.decide(baseDecide);
    } catch (e) {
      expect((e as ServiceError).code).toBe("STATUS_ALREADY_DECIDED");
    }
  });

  it("accepts proposal + auto-rejects + notifies on success", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue(foundProposal);
    mockPrisma.$transaction.mockResolvedValue({
      kind: "updated",
      updated: { id: "prop-1", status: "ACCEPTED" },
      autoRejected: [{ id: "prop-2", freelancerId: "free-2" }],
    });

    const result = await proposalService.decide(baseDecide);

    expect(result).toEqual({ id: "prop-1", status: "ACCEPTED" });
    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "free-1",
        type: "PROPOSAL_STATUS",
        title: "ACCEPTED",
      })
    );
    // Auto-rejected freelancer notified
    expect(mockNotification.createAndEmitBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "free-2",
        title: "REJECTED",
      }),
    ]);
  });

  it("reject flow notifies freelancer without auto-reject batch", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue(foundProposal);
    mockPrisma.$transaction.mockResolvedValue({
      kind: "updated",
      updated: { id: "prop-1", status: "REJECTED" },
      autoRejected: [],
    });

    const result = await proposalService.decide({ ...baseDecide, status: "REJECTED" });

    expect(result).toEqual({ id: "prop-1", status: "REJECTED" });
    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "free-1",
        title: "REJECTED",
      })
    );
    expect(mockNotification.createAndEmitBatch).not.toHaveBeenCalled();
  });
});

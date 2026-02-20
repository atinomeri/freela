/**
 * Thread Service — unit tests
 *
 * External dependencies (prisma, notification-service, uploads, logger, fs)
 * are mocked so tests run in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

const { mockPrisma, mockNotification, mockUploads, mockFs, MockPrismaError } = vi.hoisted(() => {
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    proposal: { findFirst: vi.fn() },
    thread: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    message: { create: vi.fn(), findMany: vi.fn() },
    messageAttachment: { count: vi.fn(), aggregate: vi.fn() },
  };
  const mockNotification = {
    createAndEmit: vi.fn(async () => ({ id: "notif-1" })),
    emitEvent: vi.fn(async () => undefined),
  };
  const mockUploads = {
    ATTACHMENT_LIMITS: {
      maxFiles: 5,
      maxFileBytes: 10_000_000,
      maxThreadFiles: 50,
      maxThreadBytes: 100_000_000,
    },
    getAttachmentAbsolutePath: vi.fn((p: string) => `/abs/${p}`),
    saveAttachmentFile: vi.fn(async () => ({
      originalName: "file.txt",
      storagePath: "threads/t1/file.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
    })),
  };
  const mockFs = {
    unlinkSync: vi.fn(),
  };

  // Custom class that mimics PrismaClientKnownRequestError
  class MockPrismaError extends Error {
    code: string;
    clientVersion: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = code;
      this.clientVersion = "5.0.0";
    }
  }

  return { mockPrisma, mockNotification, mockUploads, mockFs, MockPrismaError };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../notification-service", () => mockNotification);
vi.mock("@/lib/uploads", () => mockUploads);
vi.mock("@/lib/logger", () => ({ reportError: vi.fn() }));
vi.mock("node:fs", () => ({ default: mockFs }));
vi.mock("@prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: MockPrismaError },
}));

import * as threadService from "../thread-service";
import { ServiceError } from "../errors";

// ── Helpers ─────────────────────────────────────────────────

const project = { id: "proj-1", employerId: "emp-1" };
const threadData = { id: "thread-1", employerId: "emp-1", freelancerId: "fl-1", projectId: "proj-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── findOrCreateThread() ───────────────────────────────────

describe("threadService.findOrCreateThread", () => {
  it("throws NOT_FOUND when project doesn't exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    await expect(
      threadService.findOrCreateThread({ projectId: "bad", freelancerId: "fl-1", userId: "emp-1", userRole: "EMPLOYER" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws FORBIDDEN when user is not a participant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(project);
    mockPrisma.proposal.findFirst.mockResolvedValue(null);

    await expect(
      threadService.findOrCreateThread({ projectId: "proj-1", freelancerId: "fl-1", userId: "stranger", userRole: "EMPLOYER" })
    ).rejects.toThrow(ServiceError);
  });

  it("creates a new thread when none exists", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(project);
    mockPrisma.proposal.findFirst.mockResolvedValue({ id: "prop-1" });
    mockPrisma.thread.create.mockResolvedValue({ id: "new-thread" });

    const result = await threadService.findOrCreateThread({
      projectId: "proj-1",
      freelancerId: "fl-1",
      userId: "emp-1",
      userRole: "EMPLOYER",
    });

    expect(result.id).toBe("new-thread");
    expect(mockPrisma.thread.create).toHaveBeenCalled();
  });

  it("returns existing thread on P2002 (unique constraint)", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(project);
    mockPrisma.proposal.findFirst.mockResolvedValue({ id: "prop-1" });

    mockPrisma.thread.create.mockRejectedValue(new MockPrismaError("Unique constraint failed", "P2002"));
    mockPrisma.thread.findUnique.mockResolvedValue({ id: "existing-thread" });

    const result = await threadService.findOrCreateThread({
      projectId: "proj-1",
      freelancerId: "fl-1",
      userId: "emp-1",
      userRole: "EMPLOYER",
    });

    expect(result.id).toBe("existing-thread");
  });

  it("resolves freelancerId from userId when userRole is FREELANCER", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(project);
    mockPrisma.proposal.findFirst.mockResolvedValue({ id: "prop-1" });
    mockPrisma.thread.create.mockResolvedValue({ id: "new-thread" });

    await threadService.findOrCreateThread({
      projectId: "proj-1",
      freelancerId: "",
      userId: "fl-1",
      userRole: "FREELANCER",
    });

    expect(mockPrisma.thread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ freelancerId: "fl-1" }),
      })
    );
  });
});

// ─── getMessages() ──────────────────────────────────────────

describe("threadService.getMessages", () => {
  it("throws NOT_FOUND when thread does not exist", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(null);

    await expect(
      threadService.getMessages("bad-thread", "user-1")
    ).rejects.toThrow(ServiceError);
  });

  it("throws NOT_FOUND when user is not a participant", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);

    await expect(
      threadService.getMessages("thread-1", "stranger")
    ).rejects.toThrow(ServiceError);
  });

  it("returns messages when user is employer", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);
    mockPrisma.message.findMany.mockResolvedValue([{ id: "msg-1" }]);

    const msgs = await threadService.getMessages("thread-1", "emp-1");
    expect(msgs).toHaveLength(1);
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { threadId: "thread-1" } })
    );
  });

  it("returns messages when user is freelancer", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);
    mockPrisma.message.findMany.mockResolvedValue([]);

    const msgs = await threadService.getMessages("thread-1", "fl-1");
    expect(msgs).toHaveLength(0);
  });
});

// ─── sendMessage() ──────────────────────────────────────────

describe("threadService.sendMessage", () => {
  const baseInput: threadService.SendMessageInput = {
    threadId: "thread-1",
    senderId: "emp-1",
    body: "Hello!",
  };

  it("throws badRequest when body exceeds 2000 chars", async () => {
    await expect(
      threadService.sendMessage({ ...baseInput, body: "x".repeat(2001) })
    ).rejects.toThrow(ServiceError);
  });

  it("throws badRequest when body and files are empty", async () => {
    await expect(
      threadService.sendMessage({ ...baseInput, body: "" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws MAX_FILES when too many files", async () => {
    const files = Array.from({ length: 6 }, () => new File(["a"], "a.txt"));
    await expect(
      threadService.sendMessage({ ...baseInput, files })
    ).rejects.toThrow(ServiceError);
  });

  it("throws NOT_FOUND when thread doesn't exist and no projectId", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(null);

    await expect(
      threadService.sendMessage({ ...baseInput })
    ).rejects.toThrow(ServiceError);
  });

  it("sends message and emits notification", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-1",
      body: "Hello!",
      createdAt: new Date(),
      deliveredAt: null,
      readAt: null,
      sender: { id: "emp-1", name: "Employer" },
      attachments: [],
    });
    mockPrisma.thread.update.mockResolvedValue({});

    const result = await threadService.sendMessage(baseInput);

    expect(result.message.id).toBe("msg-1");
    expect(result.threadId).toBe("thread-1");
    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "fl-1", // recipient is the freelancer since sender is employer
        type: "MESSAGE",
      })
    );
    expect(mockNotification.emitEvent).toHaveBeenCalledWith(
      "message",
      ["emp-1", "fl-1"],
      expect.objectContaining({ threadId: "thread-1" })
    );
  });

  it("truncates long notification body to 120 chars", async () => {
    const longBody = "A".repeat(200);
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-2",
      body: longBody,
      createdAt: new Date(),
      deliveredAt: null,
      readAt: null,
      sender: { id: "emp-1", name: "Employer" },
      attachments: [],
    });
    mockPrisma.thread.update.mockResolvedValue({});

    await threadService.sendMessage({ ...baseInput, body: longBody });

    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("…"),
      })
    );
  });

  it("sends notification to employer when freelancer sends message", async () => {
    mockPrisma.thread.findUnique.mockResolvedValue(threadData);
    mockPrisma.message.create.mockResolvedValue({
      id: "msg-3",
      body: "From FL",
      createdAt: new Date(),
      deliveredAt: null,
      readAt: null,
      sender: { id: "fl-1", name: "Freelancer" },
      attachments: [],
    });
    mockPrisma.thread.update.mockResolvedValue({});

    await threadService.sendMessage({ ...baseInput, senderId: "fl-1" });

    expect(mockNotification.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "emp-1" })
    );
  });
});

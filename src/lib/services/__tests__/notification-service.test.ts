/**
 * Notification Service — unit tests
 *
 * External dependencies (prisma, realtime-bus, logger) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

const { mockPrisma, mockPublish } = vi.hoisted(() => {
  const mockPrisma = {
    notification: { create: vi.fn() },
  };
  const mockPublish = vi.fn(async () => undefined);
  return { mockPrisma, mockPublish };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/realtime-bus", () => ({ publish: mockPublish }));
vi.mock("@/lib/logger", () => ({ reportError: vi.fn() }));

import * as notificationService from "../notification-service";

// ── Helpers ─────────────────────────────────────────────────

const basePayload: notificationService.NotificationPayload = {
  userId: "user-1",
  type: "MESSAGE",
  title: "MESSAGE",
  body: "Hello",
  href: "/dashboard/messages/thread-1",
};

const fakeNotification = {
  id: "notif-1",
  type: "MESSAGE",
  title: "MESSAGE",
  body: "Hello",
  href: "/dashboard/messages/thread-1",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createAndEmit() ────────────────────────────────────────

describe("notificationService.createAndEmit", () => {
  it("creates a notification in DB and emits via realtime", async () => {
    mockPrisma.notification.create.mockResolvedValue(fakeNotification);

    const result = await notificationService.createAndEmit(basePayload);

    expect(result).toEqual(fakeNotification);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "MESSAGE",
          title: "MESSAGE",
          body: "Hello",
        }),
      })
    );
    // Should emit via publish
    expect(mockPublish).toHaveBeenCalledWith(
      "events",
      expect.objectContaining({
        type: "notification",
        toUserIds: ["user-1"],
      })
    );
  });

  it("stores optional href", async () => {
    mockPrisma.notification.create.mockResolvedValue(fakeNotification);

    await notificationService.createAndEmit(basePayload);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ href: "/dashboard/messages/thread-1" }),
      })
    );
  });
});

// ─── createAndEmitBatch() ───────────────────────────────────

describe("notificationService.createAndEmitBatch", () => {
  it("creates multiple notifications and groups by userId for emit", async () => {
    const n1 = { ...fakeNotification, id: "n1" };
    const n2 = { ...fakeNotification, id: "n2", type: "PROPOSAL_STATUS" };
    mockPrisma.notification.create
      .mockResolvedValueOnce(n1)
      .mockResolvedValueOnce(n2);

    const payloads: notificationService.NotificationPayload[] = [
      { ...basePayload, userId: "user-1" },
      { ...basePayload, userId: "user-1", type: "PROPOSAL_STATUS" },
    ];

    const results = await notificationService.createAndEmitBatch(payloads);

    expect(results).toHaveLength(2);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    // Same user: should emit once with grouped notifications
    expect(mockPublish).toHaveBeenCalledWith(
      "events",
      expect.objectContaining({
        type: "notification",
        toUserIds: ["user-1"],
        data: expect.objectContaining({ notification: expect.arrayContaining([n1, n2]) }),
      })
    );
  });

  it("emits separately per userId", async () => {
    const n1 = { ...fakeNotification, id: "n1" };
    const n2 = { ...fakeNotification, id: "n2" };
    mockPrisma.notification.create
      .mockResolvedValueOnce(n1)
      .mockResolvedValueOnce(n2);

    const payloads: notificationService.NotificationPayload[] = [
      { ...basePayload, userId: "user-1" },
      { ...basePayload, userId: "user-2" },
    ];

    await notificationService.createAndEmitBatch(payloads);

    // Should emit once per user (2 users)
    expect(mockPublish).toHaveBeenCalledTimes(2);
  });

  it("returns empty array for empty input", async () => {
    const results = await notificationService.createAndEmitBatch([]);
    expect(results).toHaveLength(0);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});

// ─── emitEvent() ────────────────────────────────────────────

describe("notificationService.emitEvent", () => {
  it("publishes event to Redis", async () => {
    await notificationService.emitEvent("message", ["user-1", "user-2"], { foo: "bar" });

    expect(mockPublish).toHaveBeenCalledWith("events", {
      type: "message",
      toUserIds: ["user-1", "user-2"],
      data: { foo: "bar" },
    });
  });

  it("swallows publish errors (best-effort)", async () => {
    mockPublish.mockRejectedValueOnce(new Error("Redis down"));

    // Should not throw
    await expect(
      notificationService.emitEvent("message", ["user-1"], {})
    ).resolves.toBeUndefined();
  });
});

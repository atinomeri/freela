/**
 * Project Service — unit tests
 *
 * External dependencies (prisma, cache, email) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────

const { mockPrisma, mockCacheProjectListing, mockInvalidateProjectListingCache } =
  vi.hoisted(() => {
    const mockPrisma = {
      project: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
    };
    const mockCacheProjectListing = vi.fn();
    const mockInvalidateProjectListingCache = vi.fn();
    return { mockPrisma, mockCacheProjectListing, mockInvalidateProjectListingCache };
  });

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/cache", () => ({
  cacheProjectListing: (...args: unknown[]) => mockCacheProjectListing(...args),
  invalidateProjectListingCache: () => mockInvalidateProjectListingCache(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => undefined),
  isEmailConfigured: vi.fn(() => false),
}));

vi.mock("@/lib/email-templates/new-project", () => ({
  newProjectTemplate: vi.fn(() => ({
    subject: "New project",
    text: "text",
    html: "<p>html</p>",
  })),
}));

vi.mock("@/lib/logger", () => ({
  reportError: vi.fn(),
}));

import * as projectService from "../project-service";
import { ServiceError } from "../errors";

// ── Helpers ─────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCacheProjectListing.mockResolvedValue(null); // cache miss by default
});

// ─── listProjects() ─────────────────────────────────────────

describe("projectService.listProjects", () => {
  it("returns cached result if available", async () => {
    const cached = {
      ok: true,
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    };
    mockCacheProjectListing.mockResolvedValue(cached);

    const result = await projectService.listProjects({});
    expect(result).toEqual(cached);
    // Should not hit DB when cache is available
    expect(mockPrisma.project.count).not.toHaveBeenCalled();
    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
  });

  it("queries DB on cache miss and caches result", async () => {
    const items = [
      {
        id: "p1",
        title: "Project 1",
        category: "WEB_DEV",
        budgetGEL: 1000,
        createdAt: new Date("2025-01-01"),
        description: "A short description for the project",
      },
    ];
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.project.findMany.mockResolvedValue(items);

    const result = await projectService.listProjects({ page: 1, pageSize: 10 });

    expect(result.ok).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    // Should have cached the result
    expect(mockCacheProjectListing).toHaveBeenCalledTimes(2); // 1 read + 1 write
  });

  it("truncates description to 140 chars", async () => {
    const longDesc = "A".repeat(200);
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.project.findMany.mockResolvedValue([
      {
        id: "p1",
        title: "X",
        category: null,
        budgetGEL: null,
        createdAt: new Date(),
        description: longDesc,
      },
    ]);

    const result = await projectService.listProjects({});
    expect(result.items[0]!.description).toHaveLength(141); // 140 + '…'
  });

  it("throws badRequest on invalid budget filter", async () => {
    await expect(
      projectService.listProjects({ minBudget: NaN })
    ).rejects.toThrow(ServiceError);
  });

  it("throws badRequest when minBudget > maxBudget", async () => {
    await expect(
      projectService.listProjects({ minBudget: 500, maxBudget: 100 })
    ).rejects.toThrow(ServiceError);
  });

  it("clamps page and pageSize", async () => {
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.project.findMany.mockResolvedValue([]);

    const result = await projectService.listProjects({
      page: -5,
      pageSize: 999,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });
});

// ─── createProject() ───────────────────────────────────────

describe("projectService.createProject", () => {
  const validInput: projectService.CreateProjectInput = {
    employerId: "emp-1",
    title: "Build a website",
    description: "I need a full-stack web application with authentication and database.",
    budgetGEL: 500,
    category: "IT_DEVELOPMENT",
  };

  it("creates a project and invalidates cache", async () => {
    const created = {
      id: "proj-new",
      title: validInput.title,
      category: "IT_DEVELOPMENT",
      createdAt: new Date(),
    };
    mockPrisma.project.create.mockResolvedValue(created);

    const result = await projectService.createProject(validInput);

    expect(result).toEqual(created);
    expect(mockPrisma.project.create).toHaveBeenCalledOnce();
    expect(mockInvalidateProjectListingCache).toHaveBeenCalledOnce();
  });

  it("throws badRequest for invalid category", async () => {
    await expect(
      projectService.createProject({ ...validInput, category: "INVALID_CAT" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws badRequest for short title", async () => {
    await expect(
      projectService.createProject({ ...validInput, title: "Ab" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws badRequest for short description", async () => {
    await expect(
      projectService.createProject({ ...validInput, description: "Too short" })
    ).rejects.toThrow(ServiceError);
  });

  it("throws badRequest for invalid budget", async () => {
    await expect(
      projectService.createProject({ ...validInput, budgetGEL: -100 })
    ).rejects.toThrow(ServiceError);
  });
});

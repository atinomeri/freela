/**
 * Project Service
 * Project listing, creation and email notifications to subscribers
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isFreelancerCategory, type FreelancerCategory } from "@/lib/categories";
import {
  cacheProjectListing,
  invalidateProjectListingCache,
} from "@/lib/cache";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { newProjectTemplate } from "@/lib/email-templates/new-project";
import { reportError } from "@/lib/logger";
import { badRequest } from "./errors";

// ─── Types ──────────────────────────────────────────────────

export type ProjectListFilters = {
  q?: string;
  category?: string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  sort?: "new" | "budget_asc" | "budget_desc";
  page?: number;
  pageSize?: number;
};

export type ProjectListItem = {
  id: string;
  title: string;
  category: string | null;
  budgetGEL: number | null;
  createdAt: Date;
  description: string;
};

export type ProjectListResult = {
  ok: true;
  items: ProjectListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateProjectInput = {
  employerId: string;
  title: string;
  description: string;
  budgetGEL: number | null;
  category: string;
};

// ─── List ───────────────────────────────────────────────────

export async function listProjects(
  filters: ProjectListFilters
): Promise<ProjectListResult> {
  const q =
    filters.q && filters.q.length >= 2 ? filters.q.slice(0, 100) : "";
  const category = isFreelancerCategory(filters.category)
    ? (filters.category as FreelancerCategory)
    : null;
  const minBudget = filters.minBudget ?? null;
  const maxBudget = filters.maxBudget ?? null;
  const sort = filters.sort ?? "new";
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

  if (
    (minBudget !== null && !Number.isFinite(minBudget)) ||
    (maxBudget !== null && !Number.isFinite(maxBudget))
  ) {
    throw badRequest("FILTER_INVALID");
  }
  if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
    throw badRequest("FILTER_INVALID");
  }

  // Try cache first
  const cacheKey = { q, category, minBudget, maxBudget, sort, page, pageSize };
  const cached = await cacheProjectListing<ProjectListResult>(cacheKey);
  if (cached) return cached;

  const where: Prisma.ProjectWhereInput = { isOpen: true };
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (minBudget !== null || maxBudget !== null) {
    where.budgetGEL = {};
    if (minBudget !== null) where.budgetGEL.gte = minBudget;
    if (maxBudget !== null) where.budgetGEL.lte = maxBudget;
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    sort === "budget_asc"
      ? [{ budgetGEL: "asc" }, { createdAt: "desc" }]
      : sort === "budget_desc"
        ? [{ budgetGEL: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        budgetGEL: true,
        createdAt: true,
        description: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const response: ProjectListResult = {
    ok: true,
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      budgetGEL: p.budgetGEL,
      createdAt: p.createdAt,
      description:
        p.description.length > 140
          ? `${p.description.slice(0, 140)}…`
          : p.description,
    })),
    page,
    pageSize,
    total,
    totalPages,
  };

  await cacheProjectListing(cacheKey, response);
  return response;
}

// ─── Create ─────────────────────────────────────────────────

export async function createProject(input: CreateProjectInput) {
  const { employerId, title, description, budgetGEL, category } = input;

  if (!isFreelancerCategory(category)) throw badRequest("CATEGORY_INVALID");
  if (title.length < 5) throw badRequest("TITLE_MIN");
  if (description.length < 20) throw badRequest("DESCRIPTION_MIN");
  if (budgetGEL !== null && (!Number.isFinite(budgetGEL) || budgetGEL <= 0)) {
    throw badRequest("BUDGET_INVALID");
  }

  const project = await prisma.project.create({
    data: {
      employerId,
      category: category as FreelancerCategory,
      title,
      description,
      budgetGEL,
      city: "",
    },
    select: { id: true, title: true, category: true, createdAt: true },
  });

  await invalidateProjectListingCache();

  // Non-blocking email to subscribers
  notifySubscribers(project).catch((err) =>
    reportError("[project-service] subscriber notification failed", err)
  );

  return project;
}

// ─── Internal ───────────────────────────────────────────────

async function notifySubscribers(project: {
  id: string;
  title: string;
}) {
  if (!isEmailConfigured()) return;

  const baseUrl = process.env.NEXTAUTH_URL || "https://freela.ge";
  const projectUrl = `${baseUrl}/projects/${project.id}`;

  const subscribers = await prisma.user.findMany({
    where: {
      role: "FREELANCER",
      projectEmailSubscribed: true,
      isDisabled: false,
      emailVerifiedAt: { not: null },
    },
    select: { email: true },
  });

  for (const sub of subscribers) {
    const { subject, text, html } = newProjectTemplate({
      projectTitle: project.title,
      projectUrl,
    });
    sendEmail({ to: sub.email, subject, text, html }).catch((err) =>
      reportError("[project-service] email failed", err, { email: sub.email })
    );
  }
}

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isFreelancerCategory } from "@/lib/categories";
import { cacheProjectListing, invalidateProjectListingCache } from "@/lib/cache";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const qRaw = searchParams.get("q")?.trim() ?? "";
  const q = qRaw.length >= 2 ? qRaw.slice(0, 100) : "";
  const categoryRaw = searchParams.get("category");
  const category = isFreelancerCategory(categoryRaw) ? categoryRaw : null;
  const minBudgetRaw = searchParams.get("minBudget");
  const maxBudgetRaw = searchParams.get("maxBudget");
  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "budget_asc"
      ? "budget_asc"
      : sortParam === "budget_desc" || sortParam === "budget"
        ? "budget_desc"
        : "new";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20;
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));

  const minBudget = minBudgetRaw ? Number.parseInt(minBudgetRaw, 10) : null;
  const maxBudget = maxBudgetRaw ? Number.parseInt(maxBudgetRaw, 10) : null;
  if ((minBudgetRaw && !Number.isFinite(minBudget)) || (maxBudgetRaw && !Number.isFinite(maxBudget))) {
    return jsonError("FILTER_INVALID", 400);
  }
  if (minBudget !== null && maxBudget !== null && minBudget > maxBudget) {
    return jsonError("FILTER_INVALID", 400);
  }

  const where: Prisma.ProjectWhereInput = { isOpen: true };
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } }
    ];
  }
  if (minBudget !== null || maxBudget !== null) {
    where.budgetGEL = {};
    if (minBudget !== null && Number.isFinite(minBudget)) where.budgetGEL.gte = minBudget;
    if (maxBudget !== null && Number.isFinite(maxBudget)) where.budgetGEL.lte = maxBudget;
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    sort === "budget_asc"
      ? [{ budgetGEL: "asc" }, { createdAt: "desc" }]
      : sort === "budget_desc"
        ? [{ budgetGEL: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  type ProjectListResponse = {
    ok: true;
    items: Array<{
      id: string;
      title: string;
      category: string | null;
      budgetGEL: number | null;
      createdAt: Date;
      description: string;
    }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  const cacheKey = { q, category, minBudget, maxBudget, sort, page, pageSize };
  const cached = await cacheProjectListing<ProjectListResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [total, items] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, title: true, category: true, budgetGEL: true, createdAt: true, description: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const response = {
    ok: true,
    items: items.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      budgetGEL: p.budgetGEL,
      createdAt: p.createdAt,
      description: p.description.length > 140 ? `${p.description.slice(0, 140)}…` : p.description
    })),
    page,
    pageSize,
    total,
    totalPages
  };

  await cacheProjectListing(cacheKey, response);
  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    description?: unknown;
    budgetGEL?: unknown;
    category?: unknown;
  } | null;

  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const budgetRaw = body?.budgetGEL;
  const categoryRaw = typeof body?.category === "string" ? body.category.trim() : "";

  if (!categoryRaw) return jsonError("CATEGORY_REQUIRED", 400);
  if (!isFreelancerCategory(categoryRaw)) return jsonError("CATEGORY_INVALID", 400);

  if (title.length < 5) return jsonError("TITLE_MIN", 400);
  if (description.length < 20)
    return jsonError("DESCRIPTION_MIN", 400);

  let budgetGEL: number | null = null;
  if (budgetRaw !== undefined && budgetRaw !== null && String(budgetRaw).trim() !== "") {
    const parsed = Number.parseInt(String(budgetRaw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return jsonError("BUDGET_INVALID", 400);
    }
    budgetGEL = parsed;
  }

  try {
    const project = await prisma.project.create({
      data: {
        employerId: session.user.id,
        category: categoryRaw,
        title,
        description,
        budgetGEL,
        city: ""
      },
      select: { id: true, title: true, category: true, createdAt: true }
    });

    await invalidateProjectListingCache();

    return NextResponse.json({ ok: true, project }, { status: 200 });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("[projects] create failed", err);
    return jsonError("PROJECT_CREATE_FAILED", 500);
  }
}

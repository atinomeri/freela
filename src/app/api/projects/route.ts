import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isFreelancerCategory } from "@/lib/categories";
import * as projectService from "@/lib/services/project-service";
import { ServiceError } from "@/lib/services/errors";

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...extra }, { status });
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

  try {
    const result = await projectService.listProjects({
      q,
      category,
      minBudget: (minBudgetRaw && Number.isFinite(minBudget)) ? minBudget : null,
      maxBudget: (maxBudgetRaw && Number.isFinite(maxBudget)) ? maxBudget : null,
      sort: sort as "new" | "budget_asc" | "budget_desc",
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    return jsonError("REQUEST_FAILED", 500);
  }
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

  let budgetGEL: number | null = null;
  if (budgetRaw !== undefined && budgetRaw !== null && String(budgetRaw).trim() !== "") {
    const parsed = Number.parseInt(String(budgetRaw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return jsonError("BUDGET_INVALID", 400);
    }
    budgetGEL = parsed;
  }

  try {
    const project = await projectService.createProject({
      employerId: session.user.id,
      title,
      description,
      budgetGEL,
      category: categoryRaw,
    });
    return NextResponse.json({ ok: true, project }, { status: 200 });
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    if (process.env.NODE_ENV !== "production") console.error("[projects] create failed", e);
    return jsonError("PROJECT_CREATE_FAILED", 500);
  }
}

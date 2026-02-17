import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isFreelancerCategory } from "@/lib/categories";
import { cacheFreelancerListing } from "@/lib/cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const qRaw = searchParams.get("q")?.trim() ?? "";
  const q = qRaw.length >= 2 ? qRaw.slice(0, 100) : "";
  const categoryRaw = searchParams.get("category");
  const category = isFreelancerCategory(categoryRaw) ? categoryRaw : null;
  const minRateRaw = searchParams.get("minRate");
  const maxRateRaw = searchParams.get("maxRate");
  const sort =
    searchParams.get("sort") === "rate_asc"
      ? "rate_asc"
      : searchParams.get("sort") === "rate_desc"
        ? "rate_desc"
        : "new";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20;
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));

  const minRate = minRateRaw ? Number.parseInt(minRateRaw, 10) : null;
  const maxRate = maxRateRaw ? Number.parseInt(maxRateRaw, 10) : null;
  if ((minRateRaw && !Number.isFinite(minRate)) || (maxRateRaw && !Number.isFinite(maxRate))) {
    return NextResponse.json({ ok: false, error: "Invalid rate filter" }, { status: 400 });
  }
  if (minRate !== null && maxRate !== null && minRate > maxRate) {
    return NextResponse.json({ ok: false, error: "minRate cannot exceed maxRate" }, { status: 400 });
  }

  const buildWhere = (includeSkills: boolean) => {
    const where: Prisma.ProfileWhereInput = { user: { role: "FREELANCER" } };
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } }
      ];
      if (includeSkills) {
        where.OR.push({ skills: { string_contains: q, mode: "insensitive" } });
      }
    }
    if (minRate !== null || maxRate !== null) {
      where.hourlyGEL = {};
      if (minRate !== null && Number.isFinite(minRate)) where.hourlyGEL.gte = minRate;
      if (maxRate !== null && Number.isFinite(maxRate)) where.hourlyGEL.lte = maxRate;
    }
    return where;
  };

  const orderBy: Prisma.ProfileOrderByWithRelationInput[] =
    sort === "rate_asc"
      ? [{ hourlyGEL: "asc" }, { updatedAt: "desc" }]
      : sort === "rate_desc"
        ? [{ hourlyGEL: "desc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }];

  type FreelancerListResponse = {
    ok: true;
    items: Array<{
      userId: string;
      name: string;
      avatarUrl: string | null;
      title: string;
      category: string | null;
      bioExcerpt: string;
      skills: string[];
      hourlyGEL: number | null;
      updatedAt: Date;
      createdAt: Date;
    }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  const cacheKey = { q, category, minRate, maxRate, sort, page, pageSize };
  const cached = await cacheFreelancerListing<FreelancerListResponse>(cacheKey);
  if (cached) return NextResponse.json(cached);

  let total = 0;
  let items: Array<{ user: { id: string; name: string; avatarUrl: string | null }; title: string | null; category: string | null; bio: string | null; skills: unknown; hourlyGEL: number | null; updatedAt: Date; createdAt: Date }> = [];
  try {
    const where = buildWhere(true);
    [total, items] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } }
      })
    ]);
  } catch {
    const where = buildWhere(false);
    [total, items] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } }
      })
    ]);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const normalizeSkills = (skills: unknown) => {
    if (Array.isArray(skills)) return skills.map(String);
    if (typeof skills === "string") {
      try {
        const parsed = JSON.parse(skills);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return skills.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const response: FreelancerListResponse = {
    ok: true,
    items: items.map((p) => ({
      userId: p.user.id,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      title: p.title ?? "",
      category: p.category,
      bioExcerpt: p.bio ? (p.bio.length > 160 ? `${p.bio.slice(0, 160)}…` : p.bio) : "",
      skills: normalizeSkills(p.skills),
      hourlyGEL: p.hourlyGEL,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt
    })),
    page,
    pageSize,
    total,
    totalPages
  };

  await cacheFreelancerListing(cacheKey, response);
  return NextResponse.json(response);
}

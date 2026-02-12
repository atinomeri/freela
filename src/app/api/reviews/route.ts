import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as
    | { projectId?: unknown; freelancerId?: unknown; rating?: unknown; comment?: unknown }
    | null;

  const projectId = String(body?.projectId ?? "").trim();
  const freelancerId = String(body?.freelancerId ?? "").trim();
  const ratingRaw = body?.rating;
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!projectId || !freelancerId) return jsonError("BAD_REQUEST", 400);

  const rating = Number.parseInt(String(ratingRaw ?? ""), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return jsonError("RATING_INVALID", 400);
  if (comment.length > 1000) return jsonError("COMMENT_TOO_LONG", 400);

  const project = await prisma.project.findFirst({
    where: { id: projectId, employerId: session.user.id },
    select: { id: true, completedAt: true }
  });
  if (!project) return jsonError("PROJECT_NOT_FOUND", 404);
  if (!project.completedAt) return jsonError("PROJECT_NOT_COMPLETED", 409);

  const accepted = await prisma.proposal.findFirst({
    where: { projectId, freelancerId, status: "ACCEPTED" },
    select: { id: true }
  });
  if (!accepted) return jsonError("REVIEW_NOT_ALLOWED", 403);

  try {
    const review = await prisma.review.create({
      data: {
        projectId,
        freelancerId,
        reviewerId: session.user.id,
        rating,
        comment: comment ? comment : null,
        isApproved: false,
        approvedAt: null,
        approvedByUserId: null
      },
      select: { id: true, rating: true, comment: true, createdAt: true }
    });
    return NextResponse.json({ ok: true, review }, { status: 200 });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("DUPLICATE_REVIEW", 409);
    }
    if (process.env.NODE_ENV !== "production") console.error("[reviews] create error", err);
    return jsonError("REVIEW_CREATE_FAILED", 500);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const freelancerId = url.searchParams.get("freelancerId")?.trim() ?? "";
  if (!freelancerId) return jsonError("BAD_REQUEST", 400);

  const take = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("take") ?? "10", 10) || 10));

  const [stats, reviews] = await Promise.all([
    prisma.review.aggregate({
      where: { freelancerId, isApproved: true },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.review.findMany({
      where: { freelancerId, isApproved: true },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { name: true } },
        project: { select: { id: true } }
      }
    })
  ]);

  return NextResponse.json(
    {
      ok: true,
      stats: { avgRating: stats._avg.rating ?? null, count: stats._count._all },
      reviews
    },
    { status: 200 }
  );
}

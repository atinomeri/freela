import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const adminUserId = session?.user?.id;
  if (!session || !adminUserId) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const { id } = await ctx.params;
  const reviewId = String(id ?? "").trim();
  if (!reviewId) return jsonError("INVALID_REQUEST", 400);

  const body = (await req.json().catch(() => null)) as { isApproved?: unknown } | null;
  const isApproved = typeof body?.isApproved === "boolean" ? body.isApproved : Boolean(body?.isApproved);

  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) return jsonError("NOT_FOUND", 404);

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      isApproved,
      approvedAt: isApproved ? new Date() : null,
      approvedByUserId: isApproved ? adminUserId : null
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

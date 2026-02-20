import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as proposalService from "@/lib/services/proposal-service";
import { ServiceError } from "@/lib/services/errors";

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...extra }, { status });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);
  const userLimit = await checkRateLimit({ scope: "apply:user", key: session.user.id, limit: 20, windowSeconds: 15 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { message?: unknown; priceGEL?: unknown } | null;
  const message = String(body?.message ?? "").trim();
  const priceRaw = body?.priceGEL;

  let priceGEL: number | null = null;
  if (priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== "") {
    const parsed = Number.parseInt(String(priceRaw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return jsonError("PRICE_INVALID", 400);
    priceGEL = parsed;
  }

  try {
    const proposal = await proposalService.apply({
      projectId: id,
      freelancerId: session.user.id,
      message,
      priceGEL,
    });
    return NextResponse.json({ ok: true, proposal }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof ServiceError) return jsonError(err.code, err.statusHint, err.extra);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return jsonError("DUPLICATE_PROPOSAL", 409);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return jsonError("FK_VIOLATION", 401);
    }
    return jsonError("APPLY_FAILED", 500);
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import * as proposalService from "@/lib/services/proposal-service";
import { ServiceError } from "@/lib/services/errors";

const allowed = new Set(["ACCEPTED", "REJECTED"]);

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...extra }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);
  const userLimit = await checkRateLimit({ scope: "proposals:status:user", key: session.user.id, limit: 120, windowSeconds: 15 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const status = String(body?.status ?? "").toUpperCase();
  if (!allowed.has(status)) {
    return jsonError("STATUS_INVALID", 400);
  }

  try {
    const updated = await proposalService.decide({
      proposalId: id,
      employerId: session.user.id,
      status: status as "ACCEPTED" | "REJECTED",
    });
    return NextResponse.json({ ok: true, proposal: updated }, { status: 200 });
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    return jsonError("REQUEST_FAILED", 500);
  }
}

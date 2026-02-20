import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import * as threadService from "@/lib/services/thread-service";
import { ServiceError } from "@/lib/services/errors";

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...extra }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  const userLimit = await checkRateLimit({ scope: "threads:create:user", key: session.user.id, limit: 60, windowSeconds: 15 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const body = (await req.json().catch(() => null)) as { projectId?: unknown; freelancerId?: unknown } | null;
  const projectId = String(body?.projectId ?? "").trim();
  const freelancerIdRaw = String(body?.freelancerId ?? "").trim();
  if (!projectId) return jsonError("INVALID_REQUEST", 400);

  try {
    const thread = await threadService.findOrCreateThread({
      projectId,
      freelancerId: freelancerIdRaw,
      userId: session.user.id,
      userRole: session.user.role,
    });
    return NextResponse.json({ ok: true, threadId: thread.id }, { status: 200 });
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    return jsonError("REQUEST_FAILED", 500);
  }
}

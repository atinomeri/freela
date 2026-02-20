import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import * as threadService from "@/lib/services/thread-service";
import { ServiceError } from "@/lib/services/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...(extra ?? {}) }, { status });
}

function isFormData(req: Request) {
  const ct = req.headers.get("content-type") || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const { id } = await params;

  try {
    const messages = await threadService.getMessages(id, session.user.id);
    return NextResponse.json({ ok: true, messages }, { status: 200 });
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    return jsonError("REQUEST_FAILED", 500);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  const userLimit = await checkRateLimit({ scope: "threads:messages:user", key: session.user.id, limit: 120, windowSeconds: 5 * 60 });
  if (!userLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const { id } = await params;
  let content = "";
  let projectId = "";
  let freelancerId = "";
  let files: File[] = [];

  if (isFormData(req)) {
    const form = await req.formData().catch(() => null);
    if (!form) return jsonError("INVALID_FORM", 400);
    content = String(form.get("body") ?? "").trim();
    projectId = String(form.get("projectId") ?? "").trim();
    freelancerId = String(form.get("freelancerId") ?? "").trim();
    files = form
      .getAll("files")
      .filter((v): v is File => v instanceof File);
  } else {
    const body = (await req.json().catch(() => null)) as { body?: unknown; projectId?: unknown; freelancerId?: unknown } | null;
    content = String(body?.body ?? "").trim();
    projectId = String(body?.projectId ?? "").trim();
    freelancerId = String(body?.freelancerId ?? "").trim();
  }

  try {
    const result = await threadService.sendMessage({
      threadId: id,
      senderId: session.user.id,
      body: content,
      files: files.length > 0 ? files : undefined,
      projectId: projectId || undefined,
      freelancerId: freelancerId || undefined,
    });

    return NextResponse.json({ ok: true, message: result.message, threadId: result.threadId }, { status: 200 });
  } catch (e) {
    if (e instanceof ServiceError) return jsonError(e.code, e.statusHint, e.extra);
    return jsonError("SEND_FAILED", 500);
  }
}

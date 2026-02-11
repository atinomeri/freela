import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, employerId: true }
  });
  if (!project) return jsonError("NOT_FOUND", 404);

  let freelancerId = "";
  if (session.user.role === "FREELANCER") {
    freelancerId = session.user.id;
  } else if (session.user.role === "EMPLOYER") {
    freelancerId = freelancerIdRaw;
  } else {
    return jsonError("FORBIDDEN", 403);
  }
  if (!freelancerId) return jsonError("INVALID_REQUEST", 400);

  const isEmployer = session.user.id === project.employerId;
  const isFreelancer = session.user.id === freelancerId;
  if (!isEmployer && !isFreelancer) {
    return jsonError("FORBIDDEN", 403);
  }

  const proposal = await prisma.proposal.findFirst({
    where: { projectId, freelancerId },
    select: { id: true }
  });
  if (!proposal) {
    return jsonError("FORBIDDEN", 403);
  }

  try {
    const thread = await prisma.thread.create({
      data: {
        projectId: project.id,
        employerId: project.employerId,
        freelancerId
      },
      select: { id: true }
    });
    return NextResponse.json({ ok: true, threadId: thread.id }, { status: 200 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.thread.findUnique({
        where: { projectId_freelancerId: { projectId, freelancerId } },
        select: { id: true }
      });
      if (existing) return NextResponse.json({ ok: true, threadId: existing.id }, { status: 200 });
    }
    return jsonError("REQUEST_FAILED", 500);
  }
}

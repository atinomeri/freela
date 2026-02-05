import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const where =
    session.user.role === "EMPLOYER"
      ? { employerId: session.user.id }
      : session.user.role === "FREELANCER"
        ? { freelancerId: session.user.id }
        : { id: "none" };

  const threads = await prisma.thread.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true, title: true } },
      employer: { select: { id: true, name: true } },
      freelancer: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    items: threads.map((t) => ({
      id: t.id,
      project: t.project,
      employer: t.employer,
      freelancer: t.freelancer,
      lastMessage: t.messages[0] ?? null,
      updatedAt: t.updatedAt
    }))
  });
}

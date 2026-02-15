import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateProjectListingCache } from "@/lib/cache";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, employerId: session.user.id },
    select: { id: true, completedAt: true }
  });
  if (!project) return jsonError("NOT_FOUND", 404);
  if (project.completedAt) return jsonError("PROJECT_ALREADY_COMPLETED", 409);

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { completedAt: new Date(), isOpen: false },
    select: { id: true, completedAt: true, isOpen: true }
  });

  await invalidateProjectListingCache();

  return NextResponse.json({ ok: true, project: updated }, { status: 200 });
}


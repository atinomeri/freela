import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "EMPLOYER") return jsonError("FORBIDDEN", 403);

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { isOpen?: unknown; action?: unknown } | null;

  let isOpen: boolean | null = null;
  if (typeof body?.isOpen === "boolean") isOpen = body.isOpen;
  else if (typeof body?.action === "string") {
    const action = body.action.trim().toLowerCase();
    if (action === "cancel") isOpen = false;
    if (action === "restore") isOpen = true;
  }
  if (isOpen === null) return jsonError("BAD_REQUEST", 400);

  const project = await prisma.project.findFirst({
    where: { id, employerId: session.user.id },
    select: { id: true, isOpen: true, completedAt: true }
  });
  if (!project) return jsonError("NOT_FOUND", 404);
  if (project.completedAt) return jsonError("PROJECT_COMPLETED", 409);

  if (project.isOpen === isOpen) {
    return NextResponse.json({ ok: true, project }, { status: 200 });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { isOpen },
    select: { id: true, isOpen: true }
  });

  return NextResponse.json({ ok: true, project: updated }, { status: 200 });
}

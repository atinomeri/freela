import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttachmentAbsolutePath } from "@/lib/uploads";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function isParticipant(thread: { employerId: string; freelancerId: string }, userId: string) {
  return thread.employerId === userId || thread.freelancerId === userId;
}

function encodeFilename(name: string) {
  return encodeURIComponent(name).replace(/['()]/g, escape).replace(/\*/g, "%2A");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const { id } = await params;
  const attachment = await prisma.messageAttachment.findUnique({
    where: { id },
    select: {
      id: true,
      originalName: true,
      storagePath: true,
      mimeType: true,
      sizeBytes: true,
      message: { select: { thread: { select: { employerId: true, freelancerId: true } } } }
    }
  });

  if (!attachment || !isParticipant(attachment.message.thread, session.user.id)) {
    return jsonError("NOT_FOUND", 404);
  }

  let absPath = "";
  try {
    absPath = getAttachmentAbsolutePath(attachment.storagePath);
  } catch {
    return jsonError("NOT_FOUND", 404);
  }

  try {
    const stream = createReadStream(absPath);
    const body = Readable.toWeb(stream) as unknown as ReadableStream;

    const filename = attachment.originalName || "file";
    const headers = new Headers();
    headers.set("Content-Type", attachment.mimeType || "application/octet-stream");
    headers.set("Content-Length", String(attachment.sizeBytes));
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeFilename(filename)}`);
    headers.set("Cache-Control", "private, max-age=0, no-store");

    return new NextResponse(body, { status: 200, headers });
  } catch {
    return jsonError("NOT_FOUND", 404);
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime-bus";
import { Prisma } from "@prisma/client";
import { ATTACHMENT_LIMITS, getAttachmentAbsolutePath, saveAttachmentFile } from "@/lib/uploads";
import fs from "node:fs";
import { reportError } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...(extra ?? {}) }, { status });
}

function isParticipant(thread: { employerId: string; freelancerId: string }, userId: string) {
  return thread.employerId === userId || thread.freelancerId === userId;
}

function isFormData(req: Request) {
  const ct = req.headers.get("content-type") || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

  const { id } = await params;
  const thread = await prisma.thread.findUnique({
    where: { id },
    select: { id: true, employerId: true, freelancerId: true }
  });
  if (!thread || !isParticipant(thread, session.user.id)) {
    return jsonError("NOT_FOUND", 404);
  }

  const messages = await prisma.message.findMany({
    where: { threadId: id },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
      attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
    }
  });

  return NextResponse.json({ ok: true, messages }, { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);

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
      .filter((v): v is File => typeof v === "object" && v !== null && typeof (v as any).arrayBuffer === "function");
  } else {
    const body = (await req.json().catch(() => null)) as { body?: unknown; projectId?: unknown; freelancerId?: unknown } | null;
    content = String(body?.body ?? "").trim();
    projectId = String(body?.projectId ?? "").trim();
    freelancerId = String(body?.freelancerId ?? "").trim();
  }

  if (content.length > 2000) {
    return jsonError("MESSAGE_TOO_LONG", 400);
  }
  if (files.length > ATTACHMENT_LIMITS.maxFiles) {
    return jsonError("MAX_FILES", 400, { maxFiles: ATTACHMENT_LIMITS.maxFiles });
  }
  if (content.length < 1 && files.length < 1) {
    return jsonError("REQUIRED", 400);
  }

  let thread = await prisma.thread.findUnique({
    where: { id },
    select: { id: true, employerId: true, freelancerId: true, projectId: true }
  });

  if (!thread) {
    if (!projectId || !freelancerId) {
      return jsonError("THREAD_NOT_FOUND", 404);
    }

    const proposal = await prisma.proposal.findFirst({
      where: { projectId, freelancerId }
    });
    if (!proposal) {
      return jsonError("FORBIDDEN", 403);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, employerId: true }
    });
    if (!project) return jsonError("NOT_FOUND", 404);

    const isEmployer = session.user.id === project.employerId;
    const isFreelancer = session.user.id === freelancerId;
    if (!isEmployer && !isFreelancer) {
      return jsonError("FORBIDDEN", 403);
    }

    try {
      thread = await prisma.thread.create({
        data: {
          projectId: project.id,
          employerId: project.employerId,
          freelancerId
        },
        select: { id: true, employerId: true, freelancerId: true, projectId: true }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        thread = await prisma.thread.findUnique({
          where: { projectId_freelancerId: { projectId, freelancerId } },
          select: { id: true, employerId: true, freelancerId: true, projectId: true }
        });
      } else {
        throw err;
      }
    }
  }

  if (!thread || !isParticipant(thread, session.user.id)) {
    return jsonError("NOT_FOUND", 404);
  }

  // Quota check (existing attachments in this thread + incoming files).
  if (files.length > 0) {
    const incomingBytes = files.reduce((sum, f) => sum + (Number.isFinite(f.size) ? f.size : 0), 0);
    const [existingFiles, existingBytesAgg] = await Promise.all([
      prisma.messageAttachment.count({ where: { message: { threadId: thread.id } } }),
      prisma.messageAttachment.aggregate({
        where: { message: { threadId: thread.id } },
        _sum: { sizeBytes: true }
      })
    ]);

    const existingBytes = existingBytesAgg._sum.sizeBytes ?? 0;
    const totalFiles = existingFiles + files.length;
    const totalBytes = existingBytes + incomingBytes;

    if (totalFiles > ATTACHMENT_LIMITS.maxThreadFiles || totalBytes > ATTACHMENT_LIMITS.maxThreadBytes) {
      return jsonError("ATTACHMENT_QUOTA_EXCEEDED", 413, {
        maxThreadFiles: ATTACHMENT_LIMITS.maxThreadFiles,
        maxThreadBytes: ATTACHMENT_LIMITS.maxThreadBytes
      });
    }
  }

  const saved: { absPath: string }[] = [];
  const attachmentCreates: { originalName: string; storagePath: string; mimeType: string | null; sizeBytes: number }[] = [];
  try {
    for (const f of files) {
      const s = await saveAttachmentFile({ threadId: thread.id, file: f });
      saved.push({ absPath: getAttachmentAbsolutePath(s.storagePath) });
      attachmentCreates.push(s);
    }
  } catch (e) {
    for (const s of saved) {
      try {
        fs.unlinkSync(s.absPath);
      } catch {
        // ignore
      }
    }
    return jsonError("FILE_UPLOAD_FAILED", 400);
  }

  let message:
    | {
        id: string;
        body: string;
        createdAt: Date;
        deliveredAt: Date | null;
        readAt: Date | null;
        senderId: string;
        sender: { id: string; name: string };
        attachments: { id: string; originalName: string; mimeType: string | null; sizeBytes: number }[];
      }
    | null = null;

  try {
    message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId: session.user.id,
        body: content,
        ...(attachmentCreates.length > 0 ? { attachments: { create: attachmentCreates } } : {})
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        deliveredAt: true,
        readAt: true,
        senderId: true,
        sender: { select: { id: true, name: true } },
        attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
      }
    });
  } catch (e) {
    reportError("[messages] create failed", e, { threadId: thread.id });
    for (const s of saved) {
      try {
        fs.unlinkSync(s.absPath);
      } catch {
        // ignore
      }
    }
    return jsonError("SEND_FAILED", 500);
  }

  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() }
  });

  const recipientId = session.user.id === thread.employerId ? thread.freelancerId : thread.employerId;
  const notificationBody =
    content.length > 0
      ? content.length > 120
        ? `${content.slice(0, 120)}…`
        : content
      : message.attachments.length > 1
        ? `ATTACHMENTS:${message.attachments.length}`
        : `ATTACHMENT:${message.attachments[0]?.originalName ?? ""}`.trim();
  const notification = await prisma.notification.create({
    data: {
      userId: recipientId,
      type: "MESSAGE",
      title: "MESSAGE",
      body: notificationBody,
      href: `/dashboard/messages/${thread.id}`
    },
    select: { id: true, type: true, title: true, body: true, href: true, createdAt: true }
  });

  await publish("events", {
    type: "message",
    toUserIds: [thread.employerId, thread.freelancerId],
    data: {
      threadId: thread.id,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        sender: message.sender,
        attachments: message.attachments
      }
    }
  });
  await publish("events", {
    type: "notification",
    toUserIds: [recipientId],
    data: { notification }
  });

  return NextResponse.json({ ok: true, message, threadId: thread.id }, { status: 200 });
}

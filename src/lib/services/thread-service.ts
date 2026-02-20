/**
 * Thread / Message Service
 * Thread creation and message sending with attachment support
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ATTACHMENT_LIMITS, getAttachmentAbsolutePath, saveAttachmentFile } from "@/lib/uploads";
import { reportError } from "@/lib/logger";
import * as notificationService from "./notification-service";
import { forbidden, notFound, badRequest, ServiceError } from "./errors";
import fs from "node:fs";

// ─── Types ──────────────────────────────────────────────────

export type CreateThreadInput = {
  projectId: string;
  freelancerId: string;
  userId: string;
  userRole: string;
};

export type SendMessageInput = {
  threadId: string;
  senderId: string;
  body: string;
  files?: File[];
  /** For auto-creating thread if it doesn't exist */
  projectId?: string;
  freelancerId?: string;
};

const messageSelect = {
  id: true,
  body: true,
  createdAt: true,
  deliveredAt: true,
  readAt: true,
  senderId: true,
  sender: { select: { id: true, name: true } },
  attachments: {
    select: { id: true, originalName: true, mimeType: true, sizeBytes: true },
  },
} as const;

// ─── Thread ─────────────────────────────────────────────────

export async function findOrCreateThread(input: CreateThreadInput) {
  const { projectId, freelancerId, userId, userRole } = input;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, employerId: true },
  });
  if (!project) throw notFound("NOT_FOUND");

  const resolvedFreelancerId =
    userRole === "FREELANCER" ? userId : freelancerId;
  if (!resolvedFreelancerId) throw badRequest("INVALID_REQUEST");

  const isEmployer = userId === project.employerId;
  const isFreelancer = userId === resolvedFreelancerId;
  if (!isEmployer && !isFreelancer) throw forbidden("FORBIDDEN");

  // Require proposal
  const proposal = await prisma.proposal.findFirst({
    where: { projectId, freelancerId: resolvedFreelancerId },
    select: { id: true },
  });
  if (!proposal) throw forbidden("FORBIDDEN");

  try {
    const thread = await prisma.thread.create({
      data: {
        projectId: project.id,
        employerId: project.employerId,
        freelancerId: resolvedFreelancerId,
      },
      select: { id: true },
    });
    return thread;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.thread.findUnique({
        where: {
          projectId_freelancerId: {
            projectId,
            freelancerId: resolvedFreelancerId,
          },
        },
        select: { id: true },
      });
      if (existing) return existing;
    }
    throw new ServiceError("REQUEST_FAILED", 500);
  }
}

// ─── Messages ───────────────────────────────────────────────

export async function getMessages(threadId: string, userId: string) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, employerId: true, freelancerId: true },
  });
  if (!thread || !isParticipant(thread, userId)) {
    throw notFound("NOT_FOUND");
  }

  return prisma.message.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
  });
}

export async function sendMessage(input: SendMessageInput) {
  const { threadId, senderId, body, files = [], projectId, freelancerId } =
    input;

  if (body.length > 2000) throw badRequest("MESSAGE_TOO_LONG");
  if (files.length > ATTACHMENT_LIMITS.maxFiles)
    throw badRequest("MAX_FILES", { maxFiles: ATTACHMENT_LIMITS.maxFiles });
  if (body.length < 1 && files.length < 1) throw badRequest("REQUIRED");

  // Resolve thread (auto-create if needed)
  let thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      employerId: true,
      freelancerId: true,
      projectId: true,
    },
  });

  if (!thread) {
    if (!projectId || !freelancerId)
      throw notFound("THREAD_NOT_FOUND");

    thread = await autoCreateThread(projectId, freelancerId, senderId);
  }

  if (!isParticipant(thread, senderId)) throw notFound("NOT_FOUND");

  // Attachment quota check
  if (files.length > 0) {
    await checkAttachmentQuota(thread.id, files);
  }

  // Save files
  const { attachmentCreates, savedPaths } = await saveFiles(
    thread.id,
    files
  );

  // Create message
  let message;
  try {
    message = await prisma.message.create({
      data: {
        threadId: thread.id,
        senderId,
        body,
        ...(attachmentCreates.length > 0
          ? { attachments: { create: attachmentCreates } }
          : {}),
      },
      select: messageSelect,
    });
  } catch (e) {
    reportError("[thread-service] message create failed", e, {
      threadId: thread.id,
    });
    cleanupFiles(savedPaths);
    throw new ServiceError("SEND_FAILED", 500);
  }

  // Update thread timestamp
  await prisma.thread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  // Notification
  const recipientId =
    senderId === thread.employerId
      ? thread.freelancerId
      : thread.employerId;

  const notifBody = buildNotificationBody(body, message.attachments);

  await notificationService.createAndEmit({
    userId: recipientId,
    type: "MESSAGE",
    title: "MESSAGE",
    body: notifBody,
    href: `/dashboard/messages/${thread.id}`,
  });

  await notificationService.emitEvent(
    "message",
    [thread.employerId, thread.freelancerId],
    {
      threadId: thread.id,
      message: {
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        sender: message.sender,
        attachments: message.attachments,
      },
    }
  );

  return { message, threadId: thread.id };
}

// ─── Internal helpers ───────────────────────────────────────

function isParticipant(
  thread: { employerId: string; freelancerId: string },
  userId: string
) {
  return thread.employerId === userId || thread.freelancerId === userId;
}

function buildNotificationBody(
  body: string,
  attachments: { originalName: string }[]
) {
  if (body.length > 0) {
    return body.length > 120 ? `${body.slice(0, 120)}…` : body;
  }
  if (attachments.length > 1) {
    return `ATTACHMENTS:${attachments.length}`;
  }
  return `ATTACHMENT:${attachments[0]?.originalName ?? ""}`.trim();
}

async function autoCreateThread(
  projectId: string,
  freelancerId: string,
  senderId: string
) {
  const proposal = await prisma.proposal.findFirst({
    where: { projectId, freelancerId },
  });
  if (!proposal) throw forbidden("FORBIDDEN");

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, employerId: true },
  });
  if (!project) throw notFound("NOT_FOUND");

  const isEmployer = senderId === project.employerId;
  const isFreelancer = senderId === freelancerId;
  if (!isEmployer && !isFreelancer) throw forbidden("FORBIDDEN");

  try {
    return await prisma.thread.create({
      data: {
        projectId: project.id,
        employerId: project.employerId,
        freelancerId,
      },
      select: {
        id: true,
        employerId: true,
        freelancerId: true,
        projectId: true,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existing = await prisma.thread.findUnique({
        where: {
          projectId_freelancerId: { projectId, freelancerId },
        },
        select: {
          id: true,
          employerId: true,
          freelancerId: true,
          projectId: true,
        },
      });
      if (existing) return existing;
    }
    throw err;
  }
}

async function checkAttachmentQuota(threadId: string, files: File[]) {
  const incomingBytes = files.reduce(
    (sum, f) => sum + (Number.isFinite(f.size) ? f.size : 0),
    0
  );
  const [existingFiles, existingBytesAgg] = await Promise.all([
    prisma.messageAttachment.count({
      where: { message: { threadId } },
    }),
    prisma.messageAttachment.aggregate({
      where: { message: { threadId } },
      _sum: { sizeBytes: true },
    }),
  ]);

  const totalFiles = existingFiles + files.length;
  const totalBytes = (existingBytesAgg._sum.sizeBytes ?? 0) + incomingBytes;

  if (
    totalFiles > ATTACHMENT_LIMITS.maxThreadFiles ||
    totalBytes > ATTACHMENT_LIMITS.maxThreadBytes
  ) {
    throw new ServiceError("ATTACHMENT_QUOTA_EXCEEDED", 413, {
      maxThreadFiles: ATTACHMENT_LIMITS.maxThreadFiles,
      maxThreadBytes: ATTACHMENT_LIMITS.maxThreadBytes,
    });
  }
}

async function saveFiles(
  threadId: string,
  files: File[]
): Promise<{
  attachmentCreates: {
    originalName: string;
    storagePath: string;
    mimeType: string | null;
    sizeBytes: number;
  }[];
  savedPaths: string[];
}> {
  const saved: string[] = [];
  const creates: {
    originalName: string;
    storagePath: string;
    mimeType: string | null;
    sizeBytes: number;
  }[] = [];

  try {
    for (const f of files) {
      const s = await saveAttachmentFile({ threadId, file: f });
      saved.push(getAttachmentAbsolutePath(s.storagePath));
      creates.push(s);
    }
  } catch (e) {
    cleanupFiles(saved);
    const message = e instanceof Error ? e.message : "";
    const fsCode =
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : "";

    reportError("[thread-service] file upload failed", e, {
      threadId,
      files: files.length,
    });

    if (message === "File too large") {
      throw new ServiceError("FILE_TOO_LARGE", 400, {
        maxFileBytes: ATTACHMENT_LIMITS.maxFileBytes,
      });
    }
    if (message === "Empty file") throw badRequest("EMPTY_FILE");
    if (
      message === "No writable uploads directory found" ||
      ["EACCES", "EPERM", "EROFS", "ENOSPC", "EMFILE", "ENOENT"].includes(
        fsCode
      )
    ) {
      throw new ServiceError("UPLOADS_UNAVAILABLE", 503);
    }
    throw new ServiceError("FILE_UPLOAD_FAILED", 400);
  }

  return { attachmentCreates: creates, savedPaths: saved };
}

function cleanupFiles(paths: string[]) {
  for (const p of paths) {
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

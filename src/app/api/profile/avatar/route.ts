import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_LIMITS, getAttachmentAbsolutePath, saveAvatarFile } from "@/lib/uploads";
import { invalidateFreelancerListingCache } from "@/lib/cache";
import fs from "node:fs";
import path from "node:path";
import { logDebug, logWarn, reportError } from "@/lib/logger";

export const runtime = "nodejs";
const NEXT_BODY_SOFT_LIMIT_BYTES = 4 * 1024 * 1024;

function jsonError(errorCode: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, errorCode, ...(extra ?? {}) }, { status });
}

function extractAvatarStoragePath(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return "";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(avatarUrl, "http://localhost");
  } catch {
    return "";
  }
  if (parsedUrl.pathname !== "/api/avatars") return "";
  const storagePath = parsedUrl.searchParams.get("path") ?? "";
  return storagePath.startsWith("avatars/") ? storagePath : "";
}

export async function POST(req: Request) {
  try {
    logDebug("Upload started");

    const session = await getServerSession(authOptions);
    if (!session?.user) return jsonError("UNAUTHORIZED", 401);

    const contentLengthRaw = req.headers.get("content-length");
    const contentLength = contentLengthRaw ? Number(contentLengthRaw) : 0;
    if (Number.isFinite(contentLength) && contentLength > NEXT_BODY_SOFT_LIMIT_BYTES) {
      logWarn("Upload request body is larger than 4MB", { contentLength });
    }

    const form = await req.formData().catch(() => null);
    if (!form) return jsonError("INVALID_FORM", 400);

    const file = form.get("avatar");
    if (!(file instanceof File)) return jsonError("INVALID_FORM", 400);

    logDebug("File received", { name: file.name, size: file.size, type: file.type });

    if (file.size > AVATAR_LIMITS.maxFileBytes) {
      logWarn("Upload rejected: file is larger than avatar limit", {
        fileSize: file.size,
        maxFileBytes: AVATAR_LIMITS.maxFileBytes
      });
      return NextResponse.json(
        {
          ok: false,
          errorCode: "FILE_TOO_LARGE",
          error: `File exceeds avatar limit (${file.size} bytes > ${AVATAR_LIMITS.maxFileBytes} bytes)`,
          maxFileBytes: AVATAR_LIMITS.maxFileBytes
        },
        { status: 413 }
      );
    }

    const uploadsRoot = (process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "data", "uploads")).trim();
    const avatarDir = path.join(uploadsRoot, "avatars", session.user.id);
    await fs.promises.mkdir(avatarDir, { recursive: true });
    logDebug("Upload directory ready", { avatarDir });

    let saved: { storagePath: string } | null = null;
    try {
      saved = await saveAvatarFile({ userId: session.user.id, file });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "File too large") {
        return jsonError("FILE_TOO_LARGE", 400, { maxFileBytes: AVATAR_LIMITS.maxFileBytes });
      }
      if (message === "Invalid avatar type") {
        return jsonError("AVATAR_INVALID_TYPE", 400);
      }
      if (message === "Empty file") {
        return jsonError("EMPTY_FILE", 400);
      }
      throw e;
    }

    const avatarVersion = Date.now();
    const avatarUrl = `/api/avatars?path=${encodeURIComponent(saved.storagePath)}&v=${avatarVersion}`;

    const previous = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true }
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl }
    });

    const oldStoragePath = extractAvatarStoragePath(previous?.avatarUrl);
    if (oldStoragePath && oldStoragePath !== saved.storagePath) {
      try {
        fs.unlinkSync(getAttachmentAbsolutePath(oldStoragePath));
      } catch {
        // ignore cleanup failures
      }
    }

    if (session.user.role === "FREELANCER") {
      await invalidateFreelancerListingCache();
    }

    return NextResponse.json({ ok: true, avatarUrl }, { status: 200 });
  } catch (error) {
    reportError("Avatar upload failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        errorCode: "UPLOAD_INTERNAL_ERROR",
        error: message
      },
      { status: 500 }
    );
  }
}

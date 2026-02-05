import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export type SavedUpload = {
  storagePath: string; // relative to uploads root
  originalName: string;
  mimeType: string | null;
  sizeBytes: number;
};

function uploadsRoot() {
  const root = process.env.UPLOADS_DIR?.trim();
  if (root) return root;
  return path.join(process.cwd(), "data", "uploads");
}

function safeFilename(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const cleaned = trimmed.replace(/[^a-zA-Z0-9.\-_\u10A0-\u10FF ()]/g, "");
  const noDots = cleaned.replace(/^\.+/, "");
  const fallback = noDots.length > 0 ? noDots : "file";
  return fallback.slice(0, 120);
}

export async function saveAttachmentFile(params: { threadId: string; file: File }): Promise<SavedUpload> {
  const { threadId, file } = params;

  const sizeBytes = file.size;
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Empty file");
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    throw new Error("File too large");
  }

  const id = crypto.randomUUID();
  const originalName = safeFilename(file.name || "file");
  const dirRel = path.join("threads", threadId);
  const dirAbs = path.join(uploadsRoot(), dirRel);
  fs.mkdirSync(dirAbs, { recursive: true });

  const filename = `${id}_${originalName}`;
  const storagePath = path.join(dirRel, filename);
  const absPath = path.join(uploadsRoot(), storagePath);

  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absPath, buf);

  return {
    storagePath: storagePath.replace(/\\/g, "/"),
    originalName: file.name || originalName,
    mimeType: file.type || null,
    sizeBytes
  };
}

export function getAttachmentAbsolutePath(storagePath: string) {
  const root = uploadsRoot();
  const rel = storagePath.replace(/\\/g, "/");
  const abs = path.join(root, rel);
  const normalizedRoot = path.resolve(root);
  const normalizedAbs = path.resolve(abs);
  if (!normalizedAbs.startsWith(normalizedRoot)) {
    throw new Error("Invalid storage path");
  }
  return normalizedAbs;
}

export const ATTACHMENT_LIMITS = {
  maxFiles: 3,
  maxFileBytes: MAX_FILE_BYTES,
  // Per-thread quota to prevent unlimited disk growth.
  maxThreadFiles: 60,
  maxThreadBytes: 150 * 1024 * 1024 // 150MB
};

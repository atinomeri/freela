import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const VERSION = "v1";

function getCryptoSecret(): string {
  const secret =
    process.env.SMTP_CONFIG_SECRET?.trim() ||
    process.env.INTERNAL_API_SECRET?.trim() ||
    process.env.DESKTOP_JWT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "Missing SMTP_CONFIG_SECRET (or INTERNAL_API_SECRET/DESKTOP_JWT_SECRET/NEXTAUTH_SECRET fallback) for SMTP credential encryption",
    );
  }
  return secret;
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecretValue(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(getCryptoSecret());
  const cipher = createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

export function decryptSecretValue(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted secret format");
  }

  const [version, ivB64, dataB64, tagB64] = parts;
  if (version !== VERSION) {
    throw new Error(`Unsupported encrypted secret version: ${version}`);
  }

  const iv = Buffer.from(ivB64, "base64url");
  const encrypted = Buffer.from(dataB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid encrypted secret payload");
  }

  const key = deriveKey(getCryptoSecret());
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf-8",
  );
}

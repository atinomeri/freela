import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({ scope: "pwdreset:confirm:ip", key: ip, limit: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const body = (await req.json().catch(() => null)) as {
    token?: unknown;
    password?: unknown;
    confirmPassword?: unknown;
  } | null;

  const token = String(body?.token ?? "").trim();
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!token) return jsonError("TOKEN_INVALID", 400);
  if (password.length < 8) return jsonError("PASSWORD_MIN", 400);
  if (!confirmPassword) return jsonError("CONFIRM_REQUIRED", 400);
  if (password !== confirmPassword) return jsonError("PASSWORDS_MISMATCH", 400);

  if (!(prisma as any).passwordResetToken) {
    return jsonError("SERVER_RESTART_REQUIRED", 500);
  }

  const tokenHash = sha256(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true }
  });

  if (!row || row.usedAt) return jsonError("TOKEN_INVALID", 400);
  if (row.expiresAt.getTime() <= Date.now()) return jsonError("TOKEN_INVALID", 400);

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  ]);

  return NextResponse.json({ ok: true }, { status: 200 });
}

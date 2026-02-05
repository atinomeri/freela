import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { passwordResetEmailTemplate } from "@/lib/email-templates/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/log";
import { cookies } from "next/headers";

const TOKEN_TTL_MINUTES = 60;

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function baseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value ?? "ka";
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return jsonError("EMAIL_INVALID", 400);

  if (!(prisma as any).passwordResetToken) {
    return jsonError("SERVER_RESTART_REQUIRED", 500);
  }

  if (process.env.NODE_ENV === "production" && !isEmailConfigured()) {
    return jsonError("EMAIL_SERVICE_UNAVAILABLE", 500);
  }

  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({ scope: "pwdreset:req:ip", key: ip, limit: 10, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) return jsonError("RATE_LIMITED", 429);
  const emailLimit = await checkRateLimit({ scope: "pwdreset:req:email", key: email, limit: 3, windowSeconds: 15 * 60 });
  if (!emailLimit.allowed) return jsonError("RATE_LIMITED", 429);

  // Avoid user enumeration: always return the same success response shape.
  const okResponse = (debugResetUrl?: string) =>
    NextResponse.json(
      {
        ok: true,
        messageCode: "PASSWORD_RESET_SENT",
        ...(process.env.NODE_ENV !== "production" && debugResetUrl ? { debugResetUrl } : {})
      },
      { status: 200 }
    );

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return okResponse();

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt }
  });

  const resetUrl = `${baseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, text, html } = passwordResetEmailTemplate({ resetUrl, ttlMinutes: TOKEN_TTL_MINUTES, locale });

  if (isEmailConfigured()) {
    try {
      await sendEmail({ to: email, subject, text, html });
    } catch (e) {
      reportError("[password-reset] failed to send email", e, { email });
      if (process.env.NODE_ENV === "production") {
        return jsonError("REQUEST_FAILED", 500);
      }
      console.info(`[password-reset] ${email} -> ${resetUrl}`);
      return okResponse(resetUrl);
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.info(`[password-reset] ${email} -> ${resetUrl}`);
    return okResponse(resetUrl);
  }

  return okResponse();
}

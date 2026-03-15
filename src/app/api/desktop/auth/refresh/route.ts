import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  hashToken,
} from "@/lib/desktop-jwt";
import { desktopRefreshSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // ── Parse body ──────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = desktopRefreshSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { refresh_token } = parsed.data;

    // ── Rate limit ──────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const ipLimit = await checkRateLimit({
      scope: "desktop:refresh:ip",
      key: ip,
      limit: 30,
      windowSeconds: 900,
    });
    if (!ipLimit.allowed) {
      return errors.rateLimited(ipLimit.retryAfterSeconds);
    }

    // ── Verify refresh token JWT ────────────────────────────────
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch {
      return errors.unauthorized("Invalid or expired refresh token");
    }

    // ── Find token in DB ────────────────────────────────────────
    const tokenHash = hashToken(payload.jti);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return errors.unauthorized("Invalid or expired refresh token");
    }

    // ── Check user ──────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      select: { id: true, isDisabled: true },
    });

    if (!user || user.isDisabled) {
      return errors.unauthorized("Account not available");
    }

    // ── Rotate: revoke old, issue new ───────────────────────────
    const newAccessToken = signAccessToken(user.id);
    const { token: newRefreshToken, jti: newJti } = signRefreshToken(user.id);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(newJti),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (err) {
    console.error("[Desktop Refresh] Error:", err);
    return errors.serverError();
  }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, hashToken } from "@/lib/desktop-jwt";
import { desktopRegisterSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // ── Parse body ──────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = desktopRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { email, password, name } = parsed.data;

    // ── Rate limit ──────────────────────────────────────────────
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const ipLimit = await checkRateLimit({
      scope: "desktop:register:ip",
      key: ip,
      limit: 5,
      windowSeconds: 900,
    });
    if (!ipLimit.allowed) {
      return errors.rateLimited(ipLimit.retryAfterSeconds);
    }

    // ── Check if email already taken ────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT", message: "Email already registered" } },
        { status: 409 }
      );
    }

    // ── Create user ─────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        balance: 0,
        emailVerifiedAt: new Date(), // desktop registration auto-verifies
      },
      select: { id: true, email: true, balance: true },
    });

    // ── Issue tokens ────────────────────────────────────────────
    const accessToken = signAccessToken(user.id);
    const { token: refreshToken, jti } = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(jti),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        user: {
          email: user.email,
          balance: user.balance,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Desktop Register] Error:", err);
    return errors.serverError();
  }
}

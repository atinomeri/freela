import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { quotaReserveSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";

const PRICE_PER_EMAIL = Number(process.env.PRICE_PER_EMAIL) || 5; // тетри

export async function POST(req: Request) {
  try {
    // ── Auth (DesktopUser, Bearer JWT) ───────────────────────────
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = quotaReserveSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { count } = parsed.data;
    const totalCost = count * PRICE_PER_EMAIL;

    // ── Reserve with row-level locking ───────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Lock the desktop_user row
      const [lockedUser] = await tx.$queryRaw<
        { id: string; balance: number }[]
      >`SELECT id, balance FROM "DesktopUser" WHERE id = ${auth.user.id} FOR UPDATE`;

      if (!lockedUser) throw new Error("USER_NOT_FOUND");

      if (lockedUser.balance < totalCost) {
        const maxAllowed = Math.floor(lockedUser.balance / PRICE_PER_EMAIL);
        return {
          insufficient: true as const,
          balance: lockedUser.balance,
          maxAllowed,
        };
      }

      // Deduct balance
      await tx.$executeRaw`UPDATE "DesktopUser" SET balance = balance - ${totalCost} WHERE id = ${auth.user.id}`;

      // Create quota
      const quota = await tx.desktopQuota.create({
        data: {
          userId: auth.user.id,
          allowed: count,
          charged: totalCost,
          status: "active",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        },
      });

      return {
        insufficient: false as const,
        quotaId: quota.id,
        allowed: count,
        charged: totalCost,
        expiresAt: quota.expiresAt.getTime() / 1000,
        balance: lockedUser.balance - totalCost,
      };
    });

    if (result.insufficient) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          balance: result.balance,
          max_allowed: result.maxAllowed,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      quota_id: result.quotaId,
      allowed: result.allowed,
      charged: result.charged,
      expires_at: result.expiresAt,
      balance: result.balance,
    });
  } catch (err) {
    console.error("[Quota Reserve] Error:", err);
    return errors.serverError();
  }
}

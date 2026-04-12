import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminTopupSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";
import {
  adjustDesktopUserBalance,
  createDesktopLedgerEntry,
  createDesktopPayment,
} from "@/lib/desktop-billing";

export async function POST(req: Request) {
  try {
    // ── Admin auth (NextAuth session — сайт) ─────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return errors.unauthorized();
    }
    if (session.user.role !== "ADMIN") {
      return errors.forbidden();
    }
    const adminUserId = session.user.id;

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = adminTopupSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { email, amount, reason, externalPaymentId } = parsed.data;

    // ── Find desktop user ────────────────────────────────────────
    const user = await prisma.desktopUser.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return errors.notFound("Desktop user");
    }

    // ── Add balance + write payment/ledger atomically ────────────
    const updated = await prisma.$transaction(async (tx) => {
      const balance = await adjustDesktopUserBalance(tx, user.id, amount);

      const payment = await createDesktopPayment(tx, {
        userId: user.id,
        amount,
        status: "SUCCEEDED",
        provider: "MANUAL",
        externalPaymentId,
        processedByAdminId: adminUserId,
        completedAt: new Date(),
        metadata: {
          reason: reason ?? null,
          source: "admin-topup",
          adminUserId,
        },
      });

      await createDesktopLedgerEntry(tx, {
        userId: user.id,
        type: "TOPUP",
        amount,
        balanceBefore: balance.before,
        balanceAfter: balance.after,
        referenceType: "payment",
        referenceId: payment.id,
        description: "Admin manual top-up",
        metadata: {
          adminUserId,
          reason: reason ?? null,
          externalPaymentId: externalPaymentId ?? null,
        },
      });

      return {
        email: user.email,
        balance: balance.after,
        paymentId: payment.id,
      };
    });

    return NextResponse.json({
      email: updated.email,
      new_balance: updated.balance,
      payment_id: updated.paymentId,
    });
  } catch (err) {
    console.error("[Admin Topup] Error:", err);
    return errors.serverError();
  }
}

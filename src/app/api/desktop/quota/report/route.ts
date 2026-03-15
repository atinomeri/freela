import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { quotaReportSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = quotaReportSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { quota_id, sent, failed } = parsed.data;

    // ── Find reservation ─────────────────────────────────────────
    const reservation = await prisma.quotaReservation.findUnique({
      where: { id: quota_id },
    });

    if (!reservation || reservation.userId !== auth.user.id) {
      return errors.notFound("Quota");
    }

    if (reservation.reportedAt) {
      return errors.badRequest("Quota already reported");
    }

    if (reservation.expiresAt < new Date()) {
      return errors.badRequest("Quota has expired");
    }

    // Cap sent+failed to the allowed amount
    const totalReported = sent + failed;
    if (totalReported > reservation.amount) {
      return errors.badRequest(
        `sent + failed (${totalReported}) exceeds allowed amount (${reservation.amount})`
      );
    }

    // ── Refund failed emails in a transaction ────────────────────
    const refundAmount = failed * reservation.costPerEmail;

    const result = await prisma.$transaction(async (tx) => {
      // Update reservation
      await tx.quotaReservation.update({
        where: { id: quota_id },
        data: {
          reportedAt: new Date(),
          sent,
          failed,
          refunded: refundAmount,
        },
      });

      // Refund to balance if there are failed emails
      if (refundAmount > 0) {
        await tx.$executeRaw`UPDATE "User" SET balance = balance + ${refundAmount} WHERE id = ${auth.user.id}`;
      }

      // Get updated balance
      const user = await tx.user.findUniqueOrThrow({
        where: { id: auth.user.id },
        select: { balance: true },
      });

      return { refunded: refundAmount, balance: user.balance };
    });

    return NextResponse.json({
      refunded: result.refunded,
      balance: result.balance,
    });
  } catch (err) {
    console.error("[Quota Report] Error:", err);
    return errors.serverError();
  }
}

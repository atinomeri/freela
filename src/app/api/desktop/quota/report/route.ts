import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { quotaReportSchema } from "@/lib/validation";
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

    const parsed = quotaReportSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { quota_id, sent, failed } = parsed.data;

    // ── Find quota in desktop_quotas ─────────────────────────────
    const quota = await prisma.desktopQuota.findUnique({
      where: { id: quota_id },
    });

    if (!quota || quota.userId !== auth.user.id) {
      return errors.notFound("Quota");
    }

    if (quota.status !== "active") {
      return errors.badRequest("Quota already reported or expired");
    }

    if (quota.expiresAt < new Date()) {
      return errors.badRequest("Quota has expired");
    }

    if (sent + failed > quota.allowed) {
      return errors.badRequest(
        `sent + failed (${sent + failed}) exceeds allowed amount (${quota.allowed})`
      );
    }

    // ── Refund failed emails in a transaction ────────────────────
    const refundAmount = failed * PRICE_PER_EMAIL;

    const result = await prisma.$transaction(async (tx) => {
      // Update quota status
      await tx.desktopQuota.update({
        where: { id: quota_id },
        data: {
          status: "reported",
          sent,
          failed,
          refunded: refundAmount,
        },
      });

      // Refund balance if there are failed emails
      if (refundAmount > 0) {
        await tx.$executeRaw`UPDATE "DesktopUser" SET balance = balance + ${refundAmount} WHERE id = ${auth.user.id}`;
      }

      // Get updated balance
      const user = await tx.desktopUser.findUniqueOrThrow({
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

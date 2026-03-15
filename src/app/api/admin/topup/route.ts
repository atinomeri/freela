import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminTopupSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";

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

    // ── Parse body ───────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = adminTopupSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { email, amount } = parsed.data;

    // ── Find desktop user ────────────────────────────────────────
    const user = await prisma.desktopUser.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return errors.notFound("Desktop user");
    }

    // ── Add balance in transaction with row lock ─────────────────
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "DesktopUser" SET balance = balance + ${amount} WHERE id = ${user.id}`;

      return tx.desktopUser.findUniqueOrThrow({
        where: { id: user.id },
        select: { email: true, balance: true },
      });
    });

    return NextResponse.json({
      email: updated.email,
      new_balance: updated.balance,
    });
  } catch (err) {
    console.error("[Admin Topup] Error:", err);
    return errors.serverError();
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminTopupSchema } from "@/lib/validation";
import { errors } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    // ── Admin auth (NextAuth session) ────────────────────────────
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

    // ── Find user ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      return errors.notFound("User");
    }

    // ── Add balance in transaction ───────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "User" SET balance = balance + ${amount} WHERE id = ${user.id}`;

      return tx.user.findUniqueOrThrow({
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

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

interface UnsubscribeBody {
  endpoint?: string;
}

export async function POST(req: Request) {
  // Require authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  // Parse body
  const body = (await req.json().catch(() => null)) as UnsubscribeBody | null;
  
  if (!body?.endpoint) {
    return jsonError("INVALID_ENDPOINT", 400);
  }

  try {
    // Delete subscription if it exists and belongs to user
    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: body.endpoint,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Push unsubscribe error:", error);
    return jsonError("UNSUBSCRIBE_FAILED", 500);
  }
}

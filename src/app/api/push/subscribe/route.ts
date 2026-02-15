import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPushConfigured } from "@/lib/push";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

interface SubscribeBody {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(req: Request) {
  // Check if push is configured
  if (!isPushConfigured()) {
    return jsonError("PUSH_NOT_CONFIGURED", 503);
  }

  // Require authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", 401);
  }

  // Parse body
  const body = (await req.json().catch(() => null)) as SubscribeBody | null;
  
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return jsonError("INVALID_SUBSCRIPTION", 400);
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys.p256dh;
  const auth = body.keys.auth;

  try {
    // Upsert subscription (update if endpoint exists, create if not)
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") || undefined,
      },
      update: {
        userId: session.user.id,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Push subscribe error:", error);
    return jsonError("SUBSCRIBE_FAILED", 500);
  }
}

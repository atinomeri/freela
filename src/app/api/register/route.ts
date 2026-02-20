import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getClientIp } from "@/lib/rate-limit";
import { register } from "@/lib/services/auth-service";
import { ServiceError } from "@/lib/services/errors";

export async function POST(req: Request) {
  const locale = (await cookies()).get("NEXT_LOCALE")?.value ?? "ka";
  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ ok: false, errorCode: "INVALID_REQUEST" }, { status: 400 });

  const ip = getClientIp(req);

  try {
    const result = await register({ raw, ip, locale });

    return NextResponse.json(
      {
        ok: true,
        user: result.user,
        messageCode: result.messageCode,
        ...(result.debugVerifyUrl ? { debugVerifyUrl: result.debugVerifyUrl } : {}),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, errorCode: err.code, ...err.extra },
        { status: err.statusHint }
      );
    }

    const message = err instanceof Error ? err.message : "";
    if (message.includes("Unique constraint") || message.includes("unique")) {
      return NextResponse.json({ ok: false, errorCode: "DUPLICATE_ID" }, { status: 409 });
    }

    return NextResponse.json({ ok: false, errorCode: "REGISTER_FAILED" }, { status: 500 });
  }
}

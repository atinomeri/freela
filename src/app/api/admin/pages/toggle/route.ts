import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidPagePath } from "@/lib/site-pages";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session) return jsonError("UNAUTHORIZED", 401);
  if (role !== "ADMIN") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as
    | { path?: unknown; field?: unknown; value?: unknown }
    | { path?: unknown; isEnabled?: unknown }
    | null;
  const bodyObj = (body ?? {}) as Record<string, unknown>;
  const path = String(body?.path ?? "").trim();
  if (!isValidPagePath(path)) return jsonError("PAGE_PATH_INVALID", 400);

  // Backwards compatible: older UI posted {isEnabled}.
  const fieldRaw = "field" in bodyObj ? String(bodyObj.field ?? "").trim() : "";
  const value =
    "value" in bodyObj ? Boolean(bodyObj.value) : "isEnabled" in bodyObj ? Boolean(bodyObj.isEnabled) : null;

  const field = fieldRaw === "isVisible" ? "isVisible" : "isEnabled";
  if (value === null) return jsonError("BAD_REQUEST", 400);

  await prisma.sitePage.upsert({
    where: { path },
    create: field === "isVisible" ? { path, isVisible: value } : { path, isEnabled: value },
    update: field === "isVisible" ? { isVisible: value } : { isEnabled: value }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

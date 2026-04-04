import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

/**
 * GET /api/csrf — issue a fresh CSRF token.
 * The token is also stored in an httpOnly cookie (double-submit pattern).
 */
export async function GET() {
  const token = await generateCsrfToken();
  return NextResponse.json({ csrfToken: token });
}

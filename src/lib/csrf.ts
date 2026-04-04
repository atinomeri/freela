/**
 * CSRF protection for state-changing API routes.
 *
 * Strategy: Double Submit Cookie.
 * 1. Client calls GET /api/csrf to receive a token (also set as httpOnly cookie).
 * 2. Client sends the token in the X-CSRF-Token header on every POST/PATCH/PUT/DELETE.
 * 3. Server compares the header value to the cookie value.
 *
 * Desktop app routes (Bearer JWT) are exempt — CSRF only applies to
 * cookie-based browser sessions managed by NextAuth.
 */

import "server-only";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CSRF_COOKIE = "__csrf";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_LENGTH = 32; // 256-bit random

/**
 * Generate a fresh CSRF token and set it as an httpOnly cookie.
 * Returns the token so it can also be sent to the client in the body.
 */
export async function generateCsrfToken(): Promise<string> {
  const token = randomBytes(TOKEN_LENGTH).toString("hex");
  const store = await cookies();
  store.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return token;
}

/**
 * Validate the CSRF token in a request.
 *
 * Skips validation when the request carries a Bearer token (desktop/API clients)
 * because those are not vulnerable to CSRF (no ambient cookies).
 *
 * Returns null on success, or a 403 NextResponse on failure.
 */
export async function validateCsrf(req: Request): Promise<NextResponse | null> {
  // Bearer-authenticated requests are CSRF-exempt
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return null; // OK — not a cookie-based session
  }

  const headerToken = req.headers.get(CSRF_HEADER);
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return NextResponse.json(
      { ok: false, error: { code: "CSRF_INVALID", message: "Invalid or missing CSRF token" } },
      { status: 403 }
    );
  }

  return null; // OK
}

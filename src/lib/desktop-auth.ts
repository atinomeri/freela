/**
 * Bearer-token auth middleware for desktop app API routes.
 * Extracts JWT from Authorization header, verifies, and loads the user.
 */

import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/desktop-jwt";
import { errors } from "@/lib/api-response";
import type { Role } from "@prisma/client";
import type { NextResponse } from "next/server";

export interface DesktopUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  balance: number;
}

type AuthResult =
  | { user: DesktopUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * Extracts Bearer token, verifies JWT, loads user from DB.
 * Returns { user } on success or { error: NextResponse } on failure.
 */
export async function requireDesktopAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: errors.unauthorized("Missing or invalid Authorization header") };
  }

  const token = authHeader.slice(7);

  let userId: string;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.sub;
  } catch {
    return { error: errors.unauthorized("Invalid or expired access token") };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, balance: true, isDisabled: true, emailVerifiedAt: true },
  });

  if (!user) {
    return { error: errors.unauthorized("User not found") };
  }

  if (user.isDisabled) {
    return { error: errors.forbidden("Account is disabled") };
  }

  if (!user.emailVerifiedAt) {
    return { error: errors.forbidden("Email not verified") };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
    },
  };
}

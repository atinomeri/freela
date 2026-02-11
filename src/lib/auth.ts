import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";

function requireEnv(name: "NEXTAUTH_URL" | "NEXTAUTH_SECRET") {
  const value = process.env[name];
  if (value && value.trim().length > 0) return value;
  throw new Error(
    [
      `Missing required env var: ${name}.`,
      `Create \`.env.local\` in the project root (same level as package.json) and add:`,
      ``,
      `NEXTAUTH_URL=http://localhost:3000`,
      `NEXTAUTH_SECRET=<generate a strong secret>`,
      ``,
      `Tip: see \`.env.example\` for the template.`
    ].join("\n")
  );
}

// Fail fast (dev + prod) with a clear message instead of redirecting to /api/auth/error?error=Configuration.
requireEnv("NEXTAUTH_URL");
const nextAuthSecret = requireEnv("NEXTAUTH_SECRET");

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function markTokenInactive(token: JWT) {
  const next = token;
  delete next.role;
  delete next.sub;
  next.isActive = false;
  return next;
}

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  debug: process.env.NODE_ENV !== "production",
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const ip = getClientIpFromHeaders((req as any)?.headers);
        const ipLimit = await checkRateLimit({ scope: "login:ip", key: ip, limit: 30, windowSeconds: 15 * 60 });
        if (!ipLimit.allowed) return null;
        const emailLimit = await checkRateLimit({ scope: "login:email", key: email, limit: 10, windowSeconds: 15 * 60 });
        if (!emailLimit.allowed) return null;

        let user:
          | {
              id: string;
              name: string;
              email: string;
              role: Role;
              passwordHash: string | null;
              emailVerifiedAt: Date | null;
              isDisabled: boolean;
            }
          | null = null;

        try {
          user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, role: true, passwordHash: true, emailVerifiedAt: true, isDisabled: true }
          });
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[auth] prisma.user.findUnique failed", { email, err });
          }
          return null;
        }

        if (!user || !user.passwordHash) return null;
        if (!user.emailVerifiedAt) return null;
        if (user.isDisabled) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        const authUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };

        return authUser;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as unknown as AuthUser;
        token.role = authUser.role;
        token.sub = authUser.id;
        token.isActive = true;
        return token;
      }

      const userId = typeof token.sub === "string" ? token.sub : "";
      if (!userId) return markTokenInactive(token);

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, emailVerifiedAt: true, isDisabled: true }
        });
        if (!dbUser || dbUser.isDisabled || !dbUser.emailVerifiedAt) {
          return markTokenInactive(token);
        }

        token.sub = dbUser.id;
        token.role = dbUser.role;
        token.isActive = true;
      } catch {
        return markTokenInactive(token);
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.sub || !token.role || token.isActive === false) {
        return { ...session, user: undefined };
      }

      session.user = {
        ...(session.user ?? {}),
        id: token.sub,
        role: token.role
      };
      return session;
    }
  }
};

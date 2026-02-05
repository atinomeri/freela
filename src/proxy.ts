import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function needsRole(pathnameNoLocale: string) {
  if (pathnameNoLocale.startsWith("/admin")) return "ADMIN" as const;
  if (pathnameNoLocale.startsWith("/projects/new")) return "EMPLOYER" as const;
  return null;
}

export default async function proxy(req: NextRequest) {
  // Locale is cookie-based (no URL prefixes), so this middleware only handles auth/role gating.
  const pathnameNoLocale = req.nextUrl.pathname;
  const roleNeeded = needsRole(pathnameNoLocale);
  const needsAuth =
    pathnameNoLocale.startsWith("/dashboard") || pathnameNoLocale.startsWith("/admin") || pathnameNoLocale.startsWith("/projects/new");

  if (needsAuth) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const tokenRole = (token as any)?.role as string | undefined;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }

    if (roleNeeded === "ADMIN" && tokenRole !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }

    if (roleNeeded === "EMPLOYER" && tokenRole !== "EMPLOYER" && tokenRole !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "forbidden");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};

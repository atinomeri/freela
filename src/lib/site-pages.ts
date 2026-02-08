import "server-only";

import { prisma } from "@/lib/prisma";

export const BUILTIN_PAGE_PATHS = [
  "/",
  "/projects",
  "/freelancers",
  "/pricing",
  "/about",
  "/contact",
  "/legal/terms",
  "/legal/privacy"
] as const;

export type BuiltinPagePath = (typeof BUILTIN_PAGE_PATHS)[number];

export function isValidPagePath(path: string) {
  if (!path.startsWith("/")) return false;
  if (path.length > 200) return false;
  if (path.includes(" ")) return false;
  if (path.includes("?") || path.includes("#")) return false;
  if (path.includes("//")) return false;
  if (path !== "/" && path.endsWith("/")) return false;
  return true;
}

export async function isPageEnabled(path: string) {
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  const page = await prisma.sitePage.findUnique({ where: { path }, select: { isEnabled: true } });
  if (!page) return true;
  return page.isEnabled;
}

import "server-only";

import { prisma } from "@/lib/prisma";

export const BUILTIN_PAGE_PATHS = [
  "/",
  "/projects",
  "/freelancers",
  "/guide",
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

export async function getDisabledPaths(paths: readonly string[]) {
  if (process.env.NEXT_PHASE === "phase-production-build") return new Set<string>();
  if (paths.length === 0) return new Set<string>();

  const rows = await prisma.sitePage.findMany({
    where: { path: { in: [...paths] }, isEnabled: false },
    select: { path: true }
  });

  return new Set(rows.map((r) => r.path));
}

export async function getHiddenPaths(paths: readonly string[]) {
  if (process.env.NEXT_PHASE === "phase-production-build") return new Set<string>();
  if (paths.length === 0) return new Set<string>();

  const rows = await prisma.sitePage.findMany({
    where: { path: { in: [...paths] }, isVisible: false },
    select: { path: true }
  });

  return new Set(rows.map((r) => r.path));
}

export async function getUnlistedPaths(paths: readonly string[]) {
  if (process.env.NEXT_PHASE === "phase-production-build") return new Set<string>();
  if (paths.length === 0) return new Set<string>();

  const rows = await prisma.sitePage.findMany({
    where: { path: { in: [...paths] }, OR: [{ isEnabled: false }, { isVisible: false }] },
    select: { path: true }
  });

  return new Set(rows.map((r) => r.path));
}

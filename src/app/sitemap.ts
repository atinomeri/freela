import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getDisabledPaths, getHiddenPaths } from "@/lib/site-pages";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const routes = [
  "/",
  "/projects",
  "/projects/new",
  "/freelancers",
  "/guide",
  "/pricing",
  "/about",
  "/contact",
  "/auth/login",
  "/auth/register",
  "/legal/terms",
  "/legal/privacy"
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [disabled, hidden, activeProjects] = await Promise.all([
    getDisabledPaths(routes),
    getHiddenPaths(routes),
    prisma.project.findMany({
      where: { isOpen: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const staticRoutes = routes
    .filter((path) => !disabled.has(path) && !hidden.has(path))
    .map((path) => ({ url: `${site.url}${path}`, lastModified: now }));

  const projectRoutes: MetadataRoute.Sitemap = activeProjects.map((project) => ({
    url: `${site.url}/projects/${project.id}`,
    lastModified: project.updatedAt,
    changeFrequency: "hourly",
    priority: 0.8
  }));

  return [...staticRoutes, ...projectRoutes];
}

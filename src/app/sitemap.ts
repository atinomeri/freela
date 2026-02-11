import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getDisabledPaths, getHiddenPaths } from "@/lib/site-pages";

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
  const [disabled, hidden] = await Promise.all([getDisabledPaths(routes), getHiddenPaths(routes)]);
  return routes
    .filter((path) => !disabled.has(path) && !hidden.has(path))
    .map((path) => ({ url: `${site.url}${path}`, lastModified: now }));
}

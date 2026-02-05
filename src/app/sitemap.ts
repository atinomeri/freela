import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const routes = [
  "/",
  "/projects",
  "/projects/new",
  "/freelancers",
  "/pricing",
  "/about",
  "/contact",
  "/auth/login",
  "/auth/register",
  "/legal/terms",
  "/legal/privacy"
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({ url: `${site.url}${path}`, lastModified: now }));
}

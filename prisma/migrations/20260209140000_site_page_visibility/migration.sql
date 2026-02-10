-- Add per-page visibility (hide/show in navigation and sitemap) separate from enable/disable (route access).
ALTER TABLE "SitePage"
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;


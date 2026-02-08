-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitePageContent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SitePage_path_key" ON "SitePage"("path");

-- CreateIndex
CREATE INDEX "SitePage_path_idx" ON "SitePage"("path");

-- CreateIndex
CREATE UNIQUE INDEX "SitePageContent_pageId_locale_key" ON "SitePageContent"("pageId", "locale");

-- CreateIndex
CREATE INDEX "SitePageContent_pageId_idx" ON "SitePageContent"("pageId");

-- CreateIndex
CREATE INDEX "SitePageContent_locale_idx" ON "SitePageContent"("locale");

-- AddForeignKey
ALTER TABLE "SitePageContent" ADD CONSTRAINT "SitePageContent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;


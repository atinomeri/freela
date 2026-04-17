CREATE TYPE "ReportExportSection" AS ENUM ('SENT', 'OPENED', 'CLICKED', 'ALL');
CREATE TYPE "ReportExportFormat" AS ENUM ('CSV', 'XLSX');
CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "Campaign"
  ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bounceCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CampaignRecipientActivity" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "sender" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "firstOpenedAt" TIMESTAMP(3),
  "lastOpenedAt" TIMESTAMP(3),
  "opensCount" INTEGER NOT NULL DEFAULT 0,
  "firstClickedAt" TIMESTAMP(3),
  "lastClickedAt" TIMESTAMP(3),
  "clicksCount" INTEGER NOT NULL DEFAULT 0,
  "lastClickedUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignRecipientActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignRecipientActivity_campaignId_emailHash_key"
  ON "CampaignRecipientActivity"("campaignId", "emailHash");

CREATE INDEX "CampaignRecipientActivity_campaignId_sentAt_idx"
  ON "CampaignRecipientActivity"("campaignId", "sentAt");

CREATE INDEX "CampaignRecipientActivity_campaignId_firstOpenedAt_idx"
  ON "CampaignRecipientActivity"("campaignId", "firstOpenedAt");

CREATE INDEX "CampaignRecipientActivity_campaignId_firstClickedAt_idx"
  ON "CampaignRecipientActivity"("campaignId", "firstClickedAt");

ALTER TABLE "CampaignRecipientActivity"
  ADD CONSTRAINT "CampaignRecipientActivity_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReportExportJob" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "campaignId" TEXT,
  "section" "ReportExportSection" NOT NULL,
  "format" "ReportExportFormat" NOT NULL,
  "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
  "dateFrom" TIMESTAMP(3),
  "dateTo" TIMESTAMP(3),
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "filePath" TEXT,
  "fileName" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExportJob_desktopUserId_status_createdAt_idx"
  ON "ReportExportJob"("desktopUserId", "status", "createdAt");

ALTER TABLE "ReportExportJob"
  ADD CONSTRAINT "ReportExportJob_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExportJob"
  ADD CONSTRAINT "ReportExportJob_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

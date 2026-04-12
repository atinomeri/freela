-- Add per-desktop SMTP configuration and campaign template library
CREATE TABLE "DesktopSmtpConfig" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 465,
  "secure" BOOLEAN NOT NULL DEFAULT true,
  "username" TEXT NOT NULL,
  "passwordEnc" TEXT NOT NULL,
  "fromEmail" TEXT,
  "fromName" TEXT,
  "trackOpens" BOOLEAN NOT NULL DEFAULT true,
  "trackClicks" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesktopSmtpConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesktopSmtpConfig_desktopUserId_key" ON "DesktopSmtpConfig"("desktopUserId");

ALTER TABLE "DesktopSmtpConfig"
  ADD CONSTRAINT "DesktopSmtpConfig_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CampaignTemplate" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'custom',
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampaignTemplate_desktopUserId_createdAt_idx" ON "CampaignTemplate"("desktopUserId", "createdAt");

ALTER TABLE "CampaignTemplate"
  ADD CONSTRAINT "CampaignTemplate_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

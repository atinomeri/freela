CREATE TYPE "CampaignScheduleMode" AS ENUM ('ONCE', 'DAILY');

ALTER TABLE "Campaign"
  ADD COLUMN "scheduleMode" "CampaignScheduleMode" NOT NULL DEFAULT 'ONCE',
  ADD COLUMN "dailyLimit" INTEGER,
  ADD COLUMN "dailySendTime" TEXT,
  ADD COLUMN "dailySentOffset" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dailyTotalCount" INTEGER;

CREATE TABLE "CampaignFailedRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignFailedRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignFailedRecipient_campaignId_email_key"
  ON "CampaignFailedRecipient"("campaignId", "email");

CREATE INDEX "CampaignFailedRecipient_campaignId_createdAt_idx"
  ON "CampaignFailedRecipient"("campaignId", "createdAt");

ALTER TABLE "CampaignFailedRecipient"
  ADD CONSTRAINT "CampaignFailedRecipient_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DesktopWarmupSender" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "senderKey" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSentDate" TEXT,
  "sentToday" INTEGER NOT NULL DEFAULT 0,
  "totalSent" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesktopWarmupSender_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesktopWarmupSender_desktopUserId_senderKey_key"
  ON "DesktopWarmupSender"("desktopUserId", "senderKey");

CREATE INDEX "DesktopWarmupSender_desktopUserId_senderKey_idx"
  ON "DesktopWarmupSender"("desktopUserId", "senderKey");

ALTER TABLE "DesktopWarmupSender"
  ADD CONSTRAINT "DesktopWarmupSender_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
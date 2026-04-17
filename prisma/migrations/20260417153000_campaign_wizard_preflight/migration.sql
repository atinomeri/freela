-- CreateEnum
CREATE TYPE "CampaignPreflightStatus" AS ENUM ('GOOD', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "Campaign"
ADD COLUMN "previewText" TEXT,
ADD COLUMN "preflightStatus" "CampaignPreflightStatus",
ADD COLUMN "preflightRecommendations" JSONB,
ADD COLUMN "preflightCheckedAt" TIMESTAMP(3);

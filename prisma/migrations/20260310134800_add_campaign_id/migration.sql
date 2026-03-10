-- AlterTable
ALTER TABLE "EmailTrackingEvent" ADD COLUMN "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "EmailTrackingEvent_campaignId_eventType_idx" ON "EmailTrackingEvent"("campaignId", "eventType");

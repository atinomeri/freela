-- AlterTable: make email nullable (code no longer provides it)
ALTER TABLE "EmailTrackingEvent" ALTER COLUMN "email" DROP NOT NULL;

-- AddColumn: emailHash for privacy-safe tracking
ALTER TABLE "EmailTrackingEvent" ADD COLUMN "emailHash" TEXT;

-- CreateIndex: emailHash + eventType for stats queries
CREATE INDEX "EmailTrackingEvent_emailHash_eventType_idx" ON "EmailTrackingEvent"("emailHash", "eventType");

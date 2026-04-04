-- AlterTable: add ownership column to CampaignReport (nullable for legacy records)
ALTER TABLE "CampaignReport" ADD COLUMN IF NOT EXISTS "desktopUserId" TEXT;

-- Backfill ownership for legacy campaigns where hwid was email
UPDATE "CampaignReport" AS cr
SET "desktopUserId" = du."id"
FROM "DesktopUser" AS du
WHERE cr."desktopUserId" IS NULL
  AND lower(cr."hwid") = lower(du."email");

-- Index for scoped desktop-user queries
CREATE INDEX IF NOT EXISTS "CampaignReport_desktopUserId_idx" ON "CampaignReport"("desktopUserId");

-- Foreign key for referential integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CampaignReport_desktopUserId_fkey'
  ) THEN
    ALTER TABLE "CampaignReport"
      ADD CONSTRAINT "CampaignReport_desktopUserId_fkey"
      FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

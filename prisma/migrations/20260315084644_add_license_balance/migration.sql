-- DropIndex
DROP INDEX IF EXISTS "Profile_bio_trgm_idx";

-- DropIndex
DROP INDEX IF EXISTS "Profile_title_trgm_idx";

-- DropIndex
DROP INDEX IF EXISTS "Project_description_trgm_idx";

-- DropIndex
DROP INDEX IF EXISTS "Project_title_trgm_idx";

-- AlterTable
ALTER TABLE "LicenseKey" ADD COLUMN IF NOT EXISTS "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

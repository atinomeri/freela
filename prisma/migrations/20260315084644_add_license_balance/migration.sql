-- DropIndex
DROP INDEX "Profile_bio_trgm_idx";

-- DropIndex
DROP INDEX "Profile_title_trgm_idx";

-- DropIndex
DROP INDEX "Project_description_trgm_idx";

-- DropIndex
DROP INDEX "Project_title_trgm_idx";

-- AlterTable
ALTER TABLE "LicenseKey" ADD COLUMN     "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;

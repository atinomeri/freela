-- CreateEnum
CREATE TYPE "FreelancerCategory" AS ENUM ('IT_DEVELOPMENT', 'DESIGN_CREATIVE', 'MARKETING_CONTENT', 'FINANCE', 'LOGISTICS', 'BUSINESS_ADMIN', 'CONSTRUCTION', 'TRANSPORT', 'OTHER');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "category" "FreelancerCategory";

-- CreateIndex
CREATE INDEX "Profile_category_idx" ON "Profile"("category");

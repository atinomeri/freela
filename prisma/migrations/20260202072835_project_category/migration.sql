-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "category" "FreelancerCategory";

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");

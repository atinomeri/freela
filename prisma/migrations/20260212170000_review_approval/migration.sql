-- AlterTable
ALTER TABLE "Review"
  ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Review_isApproved_createdAt_idx" ON "Review"("isApproved", "createdAt");

-- AddForeignKey
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_approvedByUserId_fkey"
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

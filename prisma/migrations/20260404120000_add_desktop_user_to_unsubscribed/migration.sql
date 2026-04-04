-- AlterTable: Add desktopUserId to UnsubscribedEmail
ALTER TABLE "UnsubscribedEmail" ADD COLUMN "desktopUserId" TEXT;

-- Drop unique constraint on email only
DROP INDEX IF EXISTS "UnsubscribedEmail_email_key";

-- CreateIndex: unique on (email, desktopUserId)
CREATE UNIQUE INDEX "UnsubscribedEmail_email_desktopUserId_key" ON "UnsubscribedEmail"("email", "desktopUserId");

-- CreateIndex: index on desktopUserId
CREATE INDEX "UnsubscribedEmail_desktopUserId_idx" ON "UnsubscribedEmail"("desktopUserId");

-- AddForeignKey
ALTER TABLE "UnsubscribedEmail" ADD CONSTRAINT "UnsubscribedEmail_desktopUserId_fkey" FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

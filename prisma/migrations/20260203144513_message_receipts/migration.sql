-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_threadId_deliveredAt_idx" ON "Message"("threadId", "deliveredAt");

-- CreateIndex
CREATE INDEX "Message_threadId_readAt_idx" ON "Message"("threadId", "readAt");

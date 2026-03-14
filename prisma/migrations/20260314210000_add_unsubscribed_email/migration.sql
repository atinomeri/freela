-- CreateTable
CREATE TABLE "UnsubscribedEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'link',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnsubscribedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnsubscribedEmail_email_key" ON "UnsubscribedEmail"("email");

-- CreateIndex
CREATE INDEX "UnsubscribedEmail_createdAt_idx" ON "UnsubscribedEmail"("createdAt");

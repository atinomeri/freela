-- CreateEnum
CREATE TYPE "DesktopLedgerEntryType" AS ENUM ('TOPUP', 'QUOTA_RESERVE', 'QUOTA_REFUND', 'ADJUSTMENT', 'PAYMENT_CAPTURE', 'PAYMENT_REFUND');

-- CreateEnum
CREATE TYPE "DesktopPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DesktopPaymentProvider" AS ENUM ('MANUAL', 'STRIPE', 'BOG');

-- CreateTable
CREATE TABLE "DesktopPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GEL',
    "status" "DesktopPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "DesktopPaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "externalPaymentId" TEXT,
    "metadata" JSONB,
    "processedByAdminId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DesktopLedgerEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GEL',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesktopLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesktopPayment_userId_createdAt_idx" ON "DesktopPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DesktopPayment_status_createdAt_idx" ON "DesktopPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DesktopPayment_externalPaymentId_idx" ON "DesktopPayment"("externalPaymentId");

-- CreateIndex
CREATE INDEX "DesktopLedgerEntry_userId_createdAt_idx" ON "DesktopLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DesktopLedgerEntry_referenceType_referenceId_idx" ON "DesktopLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopLedgerEntry_idempotencyKey_key" ON "DesktopLedgerEntry"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "DesktopPayment" ADD CONSTRAINT "DesktopPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DesktopUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesktopLedgerEntry" ADD CONSTRAINT "DesktopLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DesktopUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
/*
  Warnings:

  - You are about to drop the column `balance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `QuotaReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DesktopUserType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- DropForeignKey
ALTER TABLE "QuotaReservation" DROP CONSTRAINT "QuotaReservation_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "balance";

-- DropTable
DROP TABLE "QuotaReservation";

-- DropTable
DROP TABLE "RefreshToken";

-- CreateTable
CREATE TABLE "DesktopUser" (
    "id" TEXT NOT NULL,
    "userType" "DesktopUserType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "personalNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "companyName" TEXT,
    "companyIdCode" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesktopUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopRefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesktopRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allowed" INTEGER NOT NULL,
    "charged" INTEGER NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "refunded" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesktopQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DesktopUser_personalNumber_key" ON "DesktopUser"("personalNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopUser_companyIdCode_key" ON "DesktopUser"("companyIdCode");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopUser_email_key" ON "DesktopUser"("email");

-- CreateIndex
CREATE INDEX "DesktopUser_email_idx" ON "DesktopUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopRefreshToken_tokenHash_key" ON "DesktopRefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "DesktopRefreshToken_userId_idx" ON "DesktopRefreshToken"("userId");

-- CreateIndex
CREATE INDEX "DesktopRefreshToken_expiresAt_idx" ON "DesktopRefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "DesktopQuota_userId_idx" ON "DesktopQuota"("userId");

-- CreateIndex
CREATE INDEX "DesktopQuota_expiresAt_idx" ON "DesktopQuota"("expiresAt");

-- CreateIndex
CREATE INDEX "DesktopQuota_status_expiresAt_idx" ON "DesktopQuota"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "DesktopRefreshToken" ADD CONSTRAINT "DesktopRefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DesktopUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesktopQuota" ADD CONSTRAINT "DesktopQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "DesktopUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

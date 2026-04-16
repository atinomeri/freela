CREATE TYPE "DesktopSendingAccountProvider" AS ENUM ('GMAIL', 'OUTLOOK', 'YAHOO', 'CUSTOM');

CREATE TYPE "DesktopSendingAccountStatus" AS ENUM ('NOT_TESTED', 'CONNECTED', 'FAILED', 'NEEDS_ATTENTION', 'PAUSED', 'TESTING');

CREATE TABLE "DesktopSendingAccount" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "provider" "DesktopSendingAccountProvider" NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 465,
  "secure" BOOLEAN NOT NULL DEFAULT true,
  "username" TEXT NOT NULL,
  "passwordEnc" TEXT NOT NULL,
  "senderEmail" TEXT,
  "senderName" TEXT,
  "rotationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "status" "DesktopSendingAccountStatus" NOT NULL DEFAULT 'NOT_TESTED',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "lastTestedAt" TIMESTAMP(3),
  "lastTestSuccess" BOOLEAN,
  "lastTestError" TEXT,
  "lastTestLatencyMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesktopSendingAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesktopSendingAccount_desktopUserId_provider_host_port_username_key"
  ON "DesktopSendingAccount"("desktopUserId", "provider", "host", "port", "username");

CREATE INDEX "DesktopSendingAccount_desktopUserId_status_rotationEnabled_createdAt_idx"
  ON "DesktopSendingAccount"("desktopUserId", "status", "rotationEnabled", "createdAt");

CREATE INDEX "DesktopSendingAccount_desktopUserId_active_createdAt_idx"
  ON "DesktopSendingAccount"("desktopUserId", "active", "createdAt");

ALTER TABLE "DesktopSendingAccount"
  ADD CONSTRAINT "DesktopSendingAccount_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

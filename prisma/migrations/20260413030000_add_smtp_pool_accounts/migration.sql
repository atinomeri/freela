CREATE TABLE "DesktopSmtpPoolAccount" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 465,
  "secure" BOOLEAN NOT NULL DEFAULT true,
  "username" TEXT NOT NULL,
  "passwordEnc" TEXT NOT NULL,
  "fromEmail" TEXT,
  "fromName" TEXT,
  "proxyType" TEXT,
  "proxyHost" TEXT,
  "proxyPort" INTEGER,
  "proxyUsername" TEXT,
  "proxyPasswordEnc" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesktopSmtpPoolAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DesktopSmtpPoolAccount_desktopUserId_active_priority_createdAt_idx"
  ON "DesktopSmtpPoolAccount"("desktopUserId", "active", "priority", "createdAt");

ALTER TABLE "DesktopSmtpPoolAccount"
  ADD CONSTRAINT "DesktopSmtpPoolAccount_desktopUserId_fkey"
  FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

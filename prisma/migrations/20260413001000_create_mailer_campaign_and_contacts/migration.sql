-- Create enum for campaign lifecycle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CampaignStatus') THEN
    CREATE TYPE "CampaignStatus" AS ENUM (
      'DRAFT',
      'QUEUED',
      'SENDING',
      'PAUSED',
      'COMPLETED',
      'FAILED'
    );
  END IF;
END $$;

-- Campaign entity
CREATE TABLE IF NOT EXISTS "Campaign" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "senderName" TEXT,
  "senderEmail" TEXT,
  "html" TEXT NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "contactListId" TEXT,
  "scheduledAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- Contact lists
CREATE TABLE IF NOT EXISTS "ContactList" (
  "id" TEXT NOT NULL,
  "desktopUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "columns" JSONB NOT NULL,
  "emailColumn" TEXT NOT NULL,
  "contactCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- Contacts inside a list
CREATE TABLE IF NOT EXISTS "Contact" (
  "id" TEXT NOT NULL,
  "contactListId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Campaign_desktopUserId_createdAt_idx"
  ON "Campaign"("desktopUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "Campaign_status_idx"
  ON "Campaign"("status");

CREATE INDEX IF NOT EXISTS "ContactList_desktopUserId_createdAt_idx"
  ON "ContactList"("desktopUserId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Contact_contactListId_email_key"
  ON "Contact"("contactListId", "email");
CREATE INDEX IF NOT EXISTS "Contact_contactListId_idx"
  ON "Contact"("contactListId");
CREATE INDEX IF NOT EXISTS "Contact_email_idx"
  ON "Contact"("email");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_desktopUserId_fkey'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_desktopUserId_fkey"
      FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_contactListId_fkey'
  ) THEN
    ALTER TABLE "Campaign"
      ADD CONSTRAINT "Campaign_contactListId_fkey"
      FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactList_desktopUserId_fkey'
  ) THEN
    ALTER TABLE "ContactList"
      ADD CONSTRAINT "ContactList_desktopUserId_fkey"
      FOREIGN KEY ("desktopUserId") REFERENCES "DesktopUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contact_contactListId_fkey'
  ) THEN
    ALTER TABLE "Contact"
      ADD CONSTRAINT "Contact_contactListId_fkey"
      FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

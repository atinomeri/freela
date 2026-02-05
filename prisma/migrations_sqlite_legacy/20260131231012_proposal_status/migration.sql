-- Add status to Proposal with default PENDING for existing rows
ALTER TABLE "Proposal" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';

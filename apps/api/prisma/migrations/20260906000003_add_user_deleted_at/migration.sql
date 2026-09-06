-- Add deletedAt to User for safe account deactivation
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Backfill: mark already-anonymized accounts as deleted
UPDATE "User" SET "deletedAt" = "updatedAt" WHERE "email" LIKE '%@campusmarche.invalid';

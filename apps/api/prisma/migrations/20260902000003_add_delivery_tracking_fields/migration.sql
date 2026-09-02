-- Add columns to DeliveryTracking that exist in schema.prisma but were never migrated
ALTER TABLE "DeliveryTracking"
  ADD COLUMN IF NOT EXISTS "heading"                DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "speed"                  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "buyerLatitude"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "buyerLongitude"         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "buyerLocationUpdatedAt" TIMESTAMP(3);

-- Product draft lifecycle: add status field and backfill

ALTER TABLE "Product" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED';

-- Backfill: sold products
UPDATE "Product" SET status = 'SOLD'     WHERE active = false AND "soldAt" IS NOT NULL;
-- Backfill: archived/paused products
UPDATE "Product" SET status = 'ARCHIVED' WHERE active = false AND "soldAt" IS NULL;
-- active = true products keep the default 'PUBLISHED' already set above

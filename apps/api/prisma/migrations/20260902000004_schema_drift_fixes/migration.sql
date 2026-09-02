-- ─────────────────────────────────────────────────────────────────────────────
-- Schema-drift catch-up: columns/tables present in schema.prisma but never
-- added via a migration file. All statements use IF NOT EXISTS / DO blocks
-- so they are safe to replay on a DB that already has some of these.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. MessageType enum (used by Message.type)
DO $$ BEGIN
  CREATE TYPE "MessageType" AS ENUM (
    'TEXT', 'IMAGE', 'FILE', 'AUDIO',
    'LOCATION', 'LIVE_LOCATION', 'VIDEO_CALL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Message — make content nullable and add rich-message columns
ALTER TABLE "Message"
  ALTER COLUMN "content" DROP NOT NULL;

ALTER TABLE "Message"
  ADD COLUMN IF NOT EXISTS "type"         "MessageType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "mediaUrl"     TEXT,
  ADD COLUMN IF NOT EXISTS "fileName"     TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize"     INTEGER,
  ADD COLUMN IF NOT EXISTS "mimeType"     TEXT,
  ADD COLUMN IF NOT EXISTS "latitude"     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationName" TEXT,
  ADD COLUMN IF NOT EXISTS "liveUntil"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "viewOnce"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "viewedBy"     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "duration"     INTEGER,
  ADD COLUMN IF NOT EXISTS "callStatus"   TEXT;

-- 3. ProductView table (tracks unique views per product)
CREATE TABLE IF NOT EXISTS "ProductView" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "viewerKey" TEXT NOT NULL,
  "viewedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductView_productId_viewerKey_key"
  ON "ProductView"("productId", "viewerKey");

CREATE INDEX IF NOT EXISTS "ProductView_productId_idx"
  ON "ProductView"("productId");

ALTER TABLE "ProductView"
  DROP CONSTRAINT IF EXISTS "ProductView_productId_fkey";

ALTER TABLE "ProductView"
  ADD CONSTRAINT "ProductView_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. CampusEvent — registrationLink column
ALTER TABLE "CampusEvent"
  ADD COLUMN IF NOT EXISTS "registrationLink" TEXT;

-- ─── Create Enum Types ────────────────────────────────────────────────────────

CREATE TYPE "EscrowStatus" AS ENUM (
  'PENDING_PAYMENT', 'PAYMENT_INITIALIZED', 'PAYMENT_VERIFIED',
  'ESCROW_HELD', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'RELEASE_PENDING', 'RELEASED', 'DISPUTED', 'REFUNDED', 'FAILED'
);

CREATE TYPE "PayoutStatus" AS ENUM (
  'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
);

CREATE TYPE "PayoutMethod" AS ENUM (
  'MTN_MOMO', 'TELECEL_CASH', 'AIRTELTIGO_MONEY', 'BANK_TRANSFER'
);

-- ─── Update Order Table ───────────────────────────────────────────────────────

-- Add new financial and relation columns
ALTER TABLE "Order"
  ADD COLUMN "sellerId"            TEXT,
  ADD COLUMN "totalAmount"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "platformFee"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "sellerAmount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "paymentReference"    TEXT,
  ADD COLUMN "deliveryConfirmedAt" TIMESTAMP(3);

-- Backfill sellerId from the related Product
UPDATE "Order" o
SET "sellerId" = (SELECT p."sellerId" FROM "Product" p WHERE p."id" = o."productId");

-- Backfill financial columns from existing price
UPDATE "Order"
SET "totalAmount"  = "price",
    "sellerAmount" = "price";

-- Convert escrowStatus: String → EscrowStatus enum
-- Step 1: add a temporary enum column
ALTER TABLE "Order"
  ADD COLUMN "escrowStatusNew" "EscrowStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';

-- Step 2: migrate existing string values to enum values
UPDATE "Order" SET "escrowStatusNew" =
  CASE "escrowStatus"
    WHEN 'Held in escrow' THEN 'ESCROW_HELD'::"EscrowStatus"
    WHEN 'Released'       THEN 'RELEASED'::"EscrowStatus"
    ELSE                       'PENDING_PAYMENT'::"EscrowStatus"
  END;

-- Step 3: update status string to match new vocabulary
UPDATE "Order" SET "status" =
  CASE "escrowStatus"
    WHEN 'Held in escrow' THEN 'In progress'
    WHEN 'Released'       THEN 'Completed'
    ELSE                       'Awaiting payment'
  END
WHERE "status" IN ('Payment pending', 'Not funded');

-- Step 4: drop old string column, rename new enum column
ALTER TABLE "Order" DROP COLUMN "escrowStatus";
ALTER TABLE "Order" RENAME COLUMN "escrowStatusNew" TO "escrowStatus";

-- Add indexes
CREATE INDEX "Order_sellerId_idx"      ON "Order"("sellerId");
CREATE INDEX "Order_escrowStatus_idx"  ON "Order"("escrowStatus");

-- Add foreign key for sellerId
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Update PaymentTransaction Table ─────────────────────────────────────────

ALTER TABLE "PaymentTransaction"
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

CREATE INDEX "PaymentTransaction_reference_idx" ON "PaymentTransaction"("reference");

-- ─── Create Wallet Table ──────────────────────────────────────────────────────

CREATE TABLE "Wallet" (
  "id"               TEXT NOT NULL,
  "availableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "pendingBalance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalEarnings"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalWithdrawn"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"           TEXT NOT NULL,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Create TransferRecipient Table ──────────────────────────────────────────

CREATE TABLE "TransferRecipient" (
  "id"            TEXT NOT NULL,
  "recipientCode" TEXT NOT NULL,
  "type"          TEXT NOT NULL DEFAULT 'mobile_money',
  "bankName"      TEXT,
  "accountNumber" TEXT,
  "momoPhone"     TEXT,
  "momoNetwork"   TEXT,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sellerId"      TEXT NOT NULL,
  CONSTRAINT "TransferRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TransferRecipient_recipientCode_key" ON "TransferRecipient"("recipientCode");
CREATE INDEX "TransferRecipient_sellerId_idx" ON "TransferRecipient"("sellerId");

ALTER TABLE "TransferRecipient"
  ADD CONSTRAINT "TransferRecipient_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Create Payout Table ─────────────────────────────────────────────────────

CREATE TABLE "Payout" (
  "id"                TEXT NOT NULL,
  "amount"            DOUBLE PRECISION NOT NULL,
  "payoutMethod"      "PayoutMethod" NOT NULL DEFAULT 'MTN_MOMO',
  "transferReference" TEXT,
  "transferCode"      TEXT,
  "recipientCode"     TEXT,
  "status"            "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason"     TEXT,
  "approvedAt"        TIMESTAMP(3),
  "processedAt"       TIMESTAMP(3),
  "completedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sellerId"          TEXT NOT NULL,
  "orderId"           TEXT,
  CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payout_sellerId_idx" ON "Payout"("sellerId");
CREATE INDEX "Payout_orderId_idx"  ON "Payout"("orderId");
CREATE INDEX "Payout_status_idx"   ON "Payout"("status");
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Create PlatformRevenue Table ────────────────────────────────────────────

CREATE TABLE "PlatformRevenue" (
  "id"           TEXT NOT NULL,
  "feeAmount"    DOUBLE PRECISION NOT NULL,
  "feePercent"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "feeFixed"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount"  DOUBLE PRECISION NOT NULL,
  "sellerAmount" DOUBLE PRECISION NOT NULL,
  "recordedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orderId"      TEXT NOT NULL,
  CONSTRAINT "PlatformRevenue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformRevenue_orderId_key" ON "PlatformRevenue"("orderId");
CREATE INDEX "PlatformRevenue_recordedAt_idx"     ON "PlatformRevenue"("recordedAt");

ALTER TABLE "PlatformRevenue"
  ADD CONSTRAINT "PlatformRevenue_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Create WebhookLog Table ──────────────────────────────────────────────────

CREATE TABLE "WebhookLog" (
  "id"        TEXT NOT NULL,
  "provider"  TEXT NOT NULL DEFAULT 'paystack',
  "eventType" TEXT NOT NULL,
  "reference" TEXT,
  "payload"   TEXT NOT NULL,
  "verified"  BOOLEAN NOT NULL DEFAULT false,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "error"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookLog_reference_idx"  ON "WebhookLog"("reference");
CREATE INDEX "WebhookLog_eventType_idx"  ON "WebhookLog"("eventType");
CREATE INDEX "WebhookLog_createdAt_idx"  ON "WebhookLog"("createdAt");

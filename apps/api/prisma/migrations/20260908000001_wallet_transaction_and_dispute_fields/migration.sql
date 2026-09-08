-- These changes were applied to the development database via `prisma db push`
-- during the escrow/service-booking audit (2026-09-08) but were never captured
-- in a migration file. This migration applies them to production via
-- `prisma migrate deploy` so the Prisma client can use these models.

-- ─── WalletTransaction: immutable audit trail for every wallet balance change ──

CREATE TABLE "WalletTransaction" (
  "id"        TEXT NOT NULL,
  -- CREDIT_PENDING | PENDING_TO_AVAILABLE | DEBIT_AVAILABLE |
  -- REFUND_AVAILABLE | REVERSE_PENDING | FINALIZE_WITHDRAWAL
  "type"      TEXT NOT NULL,
  "amount"    DOUBLE PRECISION NOT NULL,
  "orderId"   TEXT,
  "payoutId"  TEXT,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "walletId"  TEXT NOT NULL,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletTransaction_walletId_idx"  ON "WalletTransaction"("walletId");
CREATE INDEX "WalletTransaction_orderId_idx"   ON "WalletTransaction"("orderId");
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

ALTER TABLE "WalletTransaction"
  ADD CONSTRAINT "WalletTransaction_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "Wallet"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Order: dispute resolution decision fields ────────────────────────────────
-- Set when an admin resolves a dispute via adminResolveDispute().

ALTER TABLE "Order" ADD COLUMN "disputeResolvedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "disputeDecision"   TEXT;

-- ─── PaymentTransaction: refund timestamp ────────────────────────────────────
-- Stamped when adminRefundOrder() marks the payment as Refunded.

ALTER TABLE "PaymentTransaction" ADD COLUMN "refundedAt" TIMESTAMP(3);

-- ─── PlatformRevenue: revenue reversal timestamp ─────────────────────────────
-- Stamped when a refund reverses a previously recorded platform fee.

ALTER TABLE "PlatformRevenue" ADD COLUMN "reversedAt" TIMESTAMP(3);

-- ─── ServiceBooking: completion timestamp for 48-hour auto-release timer ──────
-- Set when seller marks service complete (status → AWAITING_CONFIRMATION).
-- Used by getForUser() to auto-release escrow after 48 hours if buyer is silent.

ALTER TABLE "ServiceBooking" ADD COLUMN "completedAt" TIMESTAMP(3);

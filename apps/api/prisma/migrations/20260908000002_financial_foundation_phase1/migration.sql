-- ─── Campus Marche — Financial Foundation Phase 1 ────────────────────────────
-- This migration is ADDITIVE ONLY. It does not alter, drop, or rewrite any
-- existing column, row, or constraint. Safe to apply with prisma migrate deploy.
--
-- REQUIRED PRE-CHECKS (run against production BEFORE applying this migration):
--
--   /* 1. Check for duplicate webhook event identities (must return 0 rows) */
--   SELECT "eventType", "reference", COUNT(*) AS cnt,
--          array_agg("id") AS ids, array_agg("processed"::text) AS processed
--   FROM "WebhookLog"
--   WHERE "reference" IS NOT NULL
--   GROUP BY "eventType", "reference"
--   HAVING COUNT(*) > 1;
--
--   /* 2. Check for negative wallet balances (must return 0 rows) */
--   SELECT "id", "userId", "pendingBalance", "availableBalance"
--   FROM "Wallet"
--   WHERE "pendingBalance" < 0 OR "availableBalance" < 0;
--
-- If either query returns rows, STOP and report before applying.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. WebhookLog: database-level event-identity uniqueness ─────────────────
--
-- Replaces the application-level TOCTOU findFirst check with a constraint
-- that is enforced atomically by PostgreSQL.
--
-- Why a standard UNIQUE INDEX rather than a partial (WHERE reference IS NOT NULL)?
-- PostgreSQL's unique index semantics treat NULLs as distinct from each other,
-- meaning two rows with the same eventType and reference = NULL are both allowed.
-- This is exactly the behaviour we need: non-payment events that arrive with no
-- reference value do not block each other, while duplicate (eventType, reference)
-- pairs for real payment events are rejected at INSERT time.
--
-- Behaviour:
--   ('charge.success', 'REF123') + ('charge.success', 'REF123') → REJECTED  ✓
--   ('charge.success', 'REF123') + ('transfer.success', 'REF123') → ALLOWED  ✓
--   ('charge.success', NULL)     + ('charge.success', NULL)       → ALLOWED  ✓

CREATE UNIQUE INDEX "WebhookLog_eventType_reference_key"
  ON "WebhookLog"("eventType", "reference");


-- ─── 2. PayoutStatus enum: add REVERSED and TRANSFER_UNKNOWN ─────────────────
--
-- REVERSED:         A payout that was COMPLETED and then reversed by Paystack.
--                   Financially distinct from FAILED: the transfer DID complete
--                   and then was clawed back. Requires a TRANSFER_REVERSED
--                   WalletTransaction and totalWithdrawn decrement (Phase 2).
--
-- TRANSFER_UNKNOWN: Paystack API timed out; we do not know if a transfer was
--                   created. availableBalance is NOT debited in this state.
--                   Requires admin reconciliation before re-attempting (Phase 2).
--
-- ALTER TYPE ADD VALUE is safe inside a Prisma transaction on PostgreSQL 12+.
-- The new values are not used in this migration, only declared.

ALTER TYPE "PayoutStatus" ADD VALUE 'REVERSED';
ALTER TYPE "PayoutStatus" ADD VALUE 'TRANSFER_UNKNOWN';


-- ─── 3. Wallet: non-negative balance safety constraints ──────────────────────
--
-- These CHECK constraints enforce the invariants:
--   "pendingBalance >= 0"   — seller entitlement can never be negative
--   "availableBalance >= 0" — available payout funds can never be negative
--
-- A violation indicates a code bug (double-reversal, incorrect amount, etc.)
-- and should surface as a DB error rather than silently corrupting the ledger.
--
-- IMPORTANT: These constraints will fail to add if any existing row violates
-- them. Run Pre-check 2 above before applying.

ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_pendingBalance_non_negative"
  CHECK ("pendingBalance" >= 0);

ALTER TABLE "Wallet"
  ADD CONSTRAINT "Wallet_availableBalance_non_negative"
  CHECK ("availableBalance" >= 0);

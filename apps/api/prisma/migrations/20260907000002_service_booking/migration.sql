-- ServiceAvailability: per-service scheduling configuration (1:1 with Product)
CREATE TABLE "ServiceAvailability" (
  "id"                 TEXT NOT NULL,
  "productId"          TEXT NOT NULL,
  "durationMin"        INTEGER NOT NULL DEFAULT 60,
  "priceType"          TEXT    NOT NULL DEFAULT 'session',
  "availableDays"      TEXT    NOT NULL DEFAULT '1,2,3,4,5',
  "startHour"          INTEGER NOT NULL DEFAULT 8,
  "endHour"            INTEGER NOT NULL DEFAULT 18,
  "maxBookingsPerDay"  INTEGER NOT NULL DEFAULT 3,
  "advanceNoticeHours" INTEGER NOT NULL DEFAULT 24,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceAvailability_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServiceAvailability"
  ADD CONSTRAINT "ServiceAvailability_productId_key" UNIQUE ("productId");

ALTER TABLE "ServiceAvailability"
  ADD CONSTRAINT "ServiceAvailability_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceBooking: individual booking records
CREATE TABLE "ServiceBooking" (
  "id"            TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'REQUESTED',
  "productId"     TEXT NOT NULL,
  "buyerId"       TEXT NOT NULL,
  "sellerId"      TEXT NOT NULL,
  "scheduledAt"   TIMESTAMP(3) NOT NULL,
  "durationMin"   INTEGER NOT NULL,
  "price"         DOUBLE PRECISION NOT NULL,
  "totalAmount"   DOUBLE PRECISION NOT NULL,
  "platformFee"   DOUBLE PRECISION NOT NULL,
  "sellerAmount"  DOUBLE PRECISION NOT NULL,
  "notes"         TEXT,
  "cancelReason"  TEXT,
  "cancelledById" TEXT,
  "orderId"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceBooking_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_orderId_key" UNIQUE ("orderId");

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ServiceBooking_buyerId_idx"     ON "ServiceBooking"("buyerId");
CREATE INDEX "ServiceBooking_sellerId_idx"    ON "ServiceBooking"("sellerId");
CREATE INDEX "ServiceBooking_productId_idx"   ON "ServiceBooking"("productId");
CREATE INDEX "ServiceBooking_scheduledAt_idx" ON "ServiceBooking"("scheduledAt");
CREATE INDEX "ServiceBooking_status_idx"      ON "ServiceBooking"("status");

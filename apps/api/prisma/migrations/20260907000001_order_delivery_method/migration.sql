-- Add deliveryMethod to Order
-- SELLER_DELIVERY = seller ships directly
-- ASSIGNED_PERSON = a third party (registered or external) carries the item
-- BUYER_PICKUP    = buyer collects from seller's location

ALTER TABLE "Order"
  ADD COLUMN "deliveryMethod" TEXT NOT NULL DEFAULT 'SELLER_DELIVERY';

CREATE INDEX "Order_deliveryMethod_idx" ON "Order"("deliveryMethod");

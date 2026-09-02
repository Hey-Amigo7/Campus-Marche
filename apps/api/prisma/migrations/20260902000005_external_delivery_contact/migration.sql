-- Support delivery persons who are not registered Campus Marche users.
-- When the seller assigns a phone/email not found in User table, these
-- fields store their contact info instead of linking a deliveryPersonId.
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "externalDeliveryName"    TEXT,
  ADD COLUMN IF NOT EXISTS "externalDeliveryContact" TEXT;

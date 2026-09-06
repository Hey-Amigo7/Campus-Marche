-- AddColumn: pickup and delivery verification codes + dispute fields to Order

ALTER TABLE "Order" ADD COLUMN "pickupCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "pickupCodeExpires" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "pickupVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveryCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryCodeExpires" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "deliveryVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "disputeReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "disputedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'Awaiting payment';

-- AlterTable
ALTER TABLE "Payout" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CampusEvent" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "listingType" TEXT NOT NULL DEFAULT 'product',
ADD COLUMN     "soldAt" TIMESTAMP(3);

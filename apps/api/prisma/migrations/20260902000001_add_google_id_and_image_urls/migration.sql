-- Add googleId to User for Google OAuth
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- Add imageUrls to Product
ALTER TABLE "Product" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT '{}';

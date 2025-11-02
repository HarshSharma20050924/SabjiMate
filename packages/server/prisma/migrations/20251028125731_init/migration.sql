/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Coupon` table. All the data in the column will be lost.
  - You are about to drop the column `marketPriceAtSale` on the `SaleItem` table. All the data in the column will be lost.
  - The `category` column on the `Vegetable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `choice` on the `DeliveryConfirmation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vegetable` table without a default value. This is not possible if the table is not empty.
  - Made the column `marketPrice` on table `Vegetable` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sabzimatePrice` on table `Vegetable` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_saleItemId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_vegetableId_fkey";

-- DropForeignKey
ALTER TABLE "StandingOrder" DROP CONSTRAINT "StandingOrder_vegetableId_fkey";

-- DropForeignKey
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_vegetableId_fkey";

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "DeliveryConfirmation" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "choice",
ADD COLUMN     "choice" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "marketPriceAtSale";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Vegetable" ADD COLUMN     "averageRating" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" TEXT,
ALTER COLUMN "marketPrice" SET NOT NULL,
ALTER COLUMN "sabzimatePrice" SET NOT NULL;

-- AlterTable
ALTER TABLE "Wishlist" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "DeliveryChoice";

-- DropEnum
DROP TYPE "VegetableCategory";

-- CreateIndex
CREATE INDEX "LocationPrice_areaId_idx" ON "LocationPrice"("areaId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_vegetableId_idx" ON "Review"("vegetableId");

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");

-- CreateIndex
CREATE INDEX "Sale_paymentStatus_idx" ON "Sale"("paymentStatus");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_vegetableId_idx" ON "SaleItem"("vegetableId");

-- CreateIndex
CREATE INDEX "StandingOrder_userId_idx" ON "StandingOrder"("userId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Vegetable_isAvailable_idx" ON "Vegetable"("isAvailable");

-- CreateIndex
CREATE INDEX "WishlistItem_wishlistId_idx" ON "WishlistItem"("wishlistId");

-- CreateIndex
CREATE INDEX "WishlistItem_vegetableId_idx" ON "WishlistItem"("vegetableId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingOrder" ADD CONSTRAINT "StandingOrder_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

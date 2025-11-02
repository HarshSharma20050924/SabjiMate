/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DeliveryArea` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `DeliveryArea` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `DeliveryConfirmation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `paymentId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Wishlist` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Wishlist` table. All the data in the column will be lost.
  - Changed the type of `date` on the `DeliveryConfirmation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `choice` on the `DeliveryConfirmation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `date` on the `Wishlist` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DeliveryChoice" AS ENUM ('YES', 'NO');

-- DropForeignKey
ALTER TABLE "DeliveryConfirmation" DROP CONSTRAINT "DeliveryConfirmation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_userId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_vegetableId_fkey";

-- DropForeignKey
ALTER TABLE "StandingOrder" DROP CONSTRAINT "StandingOrder_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_userId_fkey";

-- AlterTable
ALTER TABLE "DeliveryArea" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "DeliveryConfirmation" DROP COLUMN "createdAt",
DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL,
DROP COLUMN "choice",
ADD COLUMN     "choice" "DeliveryChoice" NOT NULL;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "createdAt",
DROP COLUMN "paymentId",
DROP COLUMN "updatedAt",
ALTER COLUMN "date" DROP DEFAULT,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "fcmToken" TEXT,
ALTER COLUMN "paymentPreference" DROP NOT NULL,
ALTER COLUMN "paymentPreference" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Vegetable" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Wishlist" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
DROP COLUMN "date",
ADD COLUMN     "date" DATE NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryConfirmation_userId_date_key" ON "DeliveryConfirmation"("userId", "date");

-- CreateIndex
CREATE INDEX "Sale_date_idx" ON "Sale"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_date_key" ON "Wishlist"("userId", "date");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryConfirmation" ADD CONSTRAINT "DeliveryConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingOrder" ADD CONSTRAINT "StandingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE RESTRICT ON UPDATE CASCADE;

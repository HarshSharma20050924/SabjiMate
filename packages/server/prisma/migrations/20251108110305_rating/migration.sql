/*
  Warnings:

  - You are about to drop the column `fcmToken` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_saleItemId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_vegetableId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "fcmToken";

-- AlterTable
ALTER TABLE "Vegetable" ADD COLUMN     "highlights" JSONB,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nutritionalInfo" JSONB,
ADD COLUMN     "videoUrl" TEXT;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - The values [YES,NO] on the enum `DeliveryDecision` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `priceAtSale` on the `SaleItem` table. All the data in the column will be lost.
  - Added the required column `price` to the `SaleItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vegetableName` to the `SaleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryDecision_new" AS ENUM ('CONFIRMED', 'REJECTED');
ALTER TABLE "DailyDeliveryDecision" ALTER COLUMN "decision" TYPE "DeliveryDecision_new" USING ("decision"::text::"DeliveryDecision_new");
ALTER TYPE "DeliveryDecision" RENAME TO "DeliveryDecision_old";
ALTER TYPE "DeliveryDecision_new" RENAME TO "DeliveryDecision";
DROP TYPE "public"."DeliveryDecision_old";
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DRIVER';

-- DropForeignKey
ALTER TABLE "public"."SaleItem" DROP CONSTRAINT "SaleItem_saleId_fkey";

-- AlterTable
ALTER TABLE "SaleItem" DROP COLUMN "priceAtSale",
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "vegetableName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "address" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

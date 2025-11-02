/*
  Warnings:

  - You are about to drop the column `nameEn` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the column `nameHi` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the column `unitEn` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the column `unitHi` on the `Vegetable` table. All the data in the column will be lost.
  - You are about to drop the `DailyDeliveryDecision` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `name` to the `Vegetable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `Vegetable` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DailyDeliveryDecision" DROP CONSTRAINT "DailyDeliveryDecision_userId_fkey";

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "isUrgent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Vegetable" DROP COLUMN "nameEn",
DROP COLUMN "nameHi",
DROP COLUMN "unitEn",
DROP COLUMN "unitHi",
ADD COLUMN     "name" JSONB NOT NULL,
ADD COLUMN     "unit" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "date" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "DailyDeliveryDecision";

-- DropEnum
DROP TYPE "DeliveryDecision";

-- CreateTable
CREATE TABLE "DeliveryConfirmation" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingOrder" (
    "id" SERIAL NOT NULL,
    "quantity" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vegetableId" INTEGER NOT NULL,

    CONSTRAINT "StandingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryConfirmation_userId_date_key" ON "DeliveryConfirmation"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StandingOrder_userId_vegetableId_key" ON "StandingOrder"("userId", "vegetableId");

-- AddForeignKey
ALTER TABLE "DeliveryConfirmation" ADD CONSTRAINT "DeliveryConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingOrder" ADD CONSTRAINT "StandingOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingOrder" ADD CONSTRAINT "StandingOrder_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

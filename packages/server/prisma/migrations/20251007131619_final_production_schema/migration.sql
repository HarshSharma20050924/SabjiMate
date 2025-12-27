/*
  Warnings:

  - You are about to drop the column `price` on the `Vegetable` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `Vegetable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Vegetable" DROP COLUMN "price",
ADD COLUMN     "basePrice" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "DeliveryArea" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPrice" (
    "id" SERIAL NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vegetableId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,

    CONSTRAINT "LocationPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryArea_city_state_key" ON "DeliveryArea"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "LocationPrice_vegetableId_areaId_key" ON "LocationPrice"("vegetableId", "areaId");

-- AddForeignKey
ALTER TABLE "LocationPrice" ADD CONSTRAINT "LocationPrice_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPrice" ADD CONSTRAINT "LocationPrice_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "DeliveryArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

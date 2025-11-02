/*
  Warnings:

  - You are about to drop the column `price` on the `LocationPrice` table. All the data in the column will be lost.
  - You are about to drop the column `basePrice` on the `Vegetable` table. All the data in the column will be lost.
  - Added the required column `marketPrice` to the `LocationPrice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sabzimatePrice` to the `LocationPrice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VegetableCategory" AS ENUM ('LEAFY', 'ROOT', 'FRUIT', 'OTHER');

-- AlterTable
ALTER TABLE "LocationPrice" DROP COLUMN "price",
ADD COLUMN     "marketPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sabzimatePrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "marketPriceAtSale" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Vegetable" DROP COLUMN "basePrice",
ADD COLUMN     "category" "VegetableCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marketPrice" DOUBLE PRECISION,
ADD COLUMN     "offerTag" TEXT,
ADD COLUMN     "sabzimatePrice" DOUBLE PRECISION;

/*
  Warnings:

  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_saleItemId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_vegetableId_fkey";

-- DropTable
DROP TABLE "Review";

-- CreateTable
CREATE TABLE "BatchReview" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchReview_saleId_key" ON "BatchReview"("saleId");

-- CreateIndex
CREATE INDEX "BatchReview_userId_idx" ON "BatchReview"("userId");

-- AddForeignKey
ALTER TABLE "BatchReview" ADD CONSTRAINT "BatchReview_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchReview" ADD CONSTRAINT "BatchReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

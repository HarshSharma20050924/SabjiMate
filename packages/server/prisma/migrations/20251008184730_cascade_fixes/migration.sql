-- DropForeignKey
ALTER TABLE "public"."DailyDeliveryDecision" DROP CONSTRAINT "DailyDeliveryDecision_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Sale" DROP CONSTRAINT "Sale_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SaleItem" DROP CONSTRAINT "SaleItem_vegetableId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Wishlist" DROP CONSTRAINT "Wishlist_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WishlistItem" DROP CONSTRAINT "WishlistItem_vegetableId_fkey";

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyDeliveryDecision" ADD CONSTRAINT "DailyDeliveryDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("phone") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_vegetableId_fkey" FOREIGN KEY ("vegetableId") REFERENCES "Vegetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID_CASH', 'PAID_ONLINE');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "paymentPreference" SET DEFAULT 'MONTHLY';

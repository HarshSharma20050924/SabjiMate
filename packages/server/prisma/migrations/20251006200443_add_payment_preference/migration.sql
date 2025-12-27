-- CreateEnum
CREATE TYPE "PaymentPreference" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paymentPreference" "PaymentPreference" NOT NULL DEFAULT 'DAILY';

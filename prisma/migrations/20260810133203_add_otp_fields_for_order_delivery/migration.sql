-- DropIndex
DROP INDEX "User_country_idx";

-- DropIndex
DROP INDEX "User_pagbankAccountId_idx";

-- DropIndex
DROP INDEX "User_paymentProvider_idx";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryOtp" TEXT,
ADD COLUMN     "deliveryOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "deliveryOtpSentAt" TIMESTAMP(3);

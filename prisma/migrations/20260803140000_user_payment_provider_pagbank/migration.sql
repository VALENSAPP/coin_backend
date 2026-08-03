-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagbankAccountId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagbankCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagbankAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagbankRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pagbankTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_paymentProvider_idx" ON "User"("paymentProvider");
CREATE INDEX IF NOT EXISTS "User_country_idx" ON "User"("country");
CREATE INDEX IF NOT EXISTS "User_pagbankAccountId_idx" ON "User"("pagbankAccountId");

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'SCHEDULED', 'RELEASED', 'FROZEN', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED_BUYER', 'RESOLVED_SELLER');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "payoutReleasedAt" TIMESTAMP(3),
ADD COLUMN     "platformFeeMinor" INTEGER,
ADD COLUMN     "protectionEndsAt" TIMESTAMP(3),
ADD COLUMN     "sellerAmountMinor" INTEGER,
ADD COLUMN     "sellerStripeAccountId" TEXT,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT,
ADD COLUMN     "transferStatus" "TransferStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Order_sellerId_transferStatus_createdAt_idx" ON "Order"("sellerId", "transferStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_transferStatus_protectionEndsAt_idx" ON "Order"("transferStatus", "protectionEndsAt");

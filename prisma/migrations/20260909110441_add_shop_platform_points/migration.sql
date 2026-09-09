-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shopPlatformPoints" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopRewardPointsAward" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopRewardPointsAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopRewardPointsAward_orderId_key" ON "ShopRewardPointsAward"("orderId");

-- CreateIndex
CREATE INDEX "ShopRewardPointsAward_userId_idx" ON "ShopRewardPointsAward"("userId");

-- CreateIndex
CREATE INDEX "ShopRewardPointsAward_orderId_idx" ON "ShopRewardPointsAward"("orderId");

-- CreateIndex
CREATE INDEX "ShopRewardPointsAward_awardedAt_idx" ON "ShopRewardPointsAward"("awardedAt");

-- AddForeignKey
ALTER TABLE "ShopRewardPointsAward" ADD CONSTRAINT "ShopRewardPointsAward_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopRewardPointsAward" ADD CONSTRAINT "ShopRewardPointsAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

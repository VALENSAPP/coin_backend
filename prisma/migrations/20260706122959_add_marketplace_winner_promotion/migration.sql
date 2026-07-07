-- CreateEnum
CREATE TYPE "MarketplaceWinnerPromotionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "MarketplaceWinnerPromotion" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "MarketplaceWinnerPromotionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceWinnerPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceWinnerPromotion_battleId_key" ON "MarketplaceWinnerPromotion"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_sellerId_idx" ON "MarketplaceWinnerPromotion"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_closetId_idx" ON "MarketplaceWinnerPromotion"("closetId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_battleId_idx" ON "MarketplaceWinnerPromotion"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_productId_idx" ON "MarketplaceWinnerPromotion"("productId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_status_startAt_idx" ON "MarketplaceWinnerPromotion"("status", "startAt");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_status_endAt_idx" ON "MarketplaceWinnerPromotion"("status", "endAt");

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MarketplaceBattleParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "closetItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

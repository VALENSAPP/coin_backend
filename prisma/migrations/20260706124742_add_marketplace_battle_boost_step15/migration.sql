-- CreateEnum
CREATE TYPE "MarketplaceBattleBoostStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "MarketplaceBattleBoostPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleBoostPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceBattleBoost" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "paymentId" TEXT,
    "status" "MarketplaceBattleBoostStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentProvider" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleBoost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoostPackage_isActive_idx" ON "MarketplaceBattleBoostPackage"("isActive");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_sellerId_idx" ON "MarketplaceBattleBoost"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_closetId_idx" ON "MarketplaceBattleBoost"("closetId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_battleId_idx" ON "MarketplaceBattleBoost"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_packageId_idx" ON "MarketplaceBattleBoost"("packageId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_paymentId_idx" ON "MarketplaceBattleBoost"("paymentId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_status_startAt_idx" ON "MarketplaceBattleBoost"("status", "startAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattleBoost_status_endAt_idx" ON "MarketplaceBattleBoost"("status", "endAt");

-- AddForeignKey
ALTER TABLE "MarketplaceBattleBoost" ADD CONSTRAINT "MarketplaceBattleBoost_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleBoost" ADD CONSTRAINT "MarketplaceBattleBoost_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleBoost" ADD CONSTRAINT "MarketplaceBattleBoost_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleBoost" ADD CONSTRAINT "MarketplaceBattleBoost_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MarketplaceBattleBoostPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleBoost" ADD CONSTRAINT "MarketplaceBattleBoost_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "marketPlacePayments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

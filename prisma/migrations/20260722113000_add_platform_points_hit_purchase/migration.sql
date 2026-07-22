-- CreateTable
CREATE TABLE "PlatformPointsHitPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsSpent" DOUBLE PRECISION NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "yearMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPointsHitPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformPointsHitPurchase_userId_idx" ON "PlatformPointsHitPurchase"("userId");

-- CreateIndex
CREATE INDEX "PlatformPointsHitPurchase_createdAt_idx" ON "PlatformPointsHitPurchase"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPointsHitPurchase_userId_yearMonth_key" ON "PlatformPointsHitPurchase"("userId", "yearMonth");

-- AddForeignKey
ALTER TABLE "PlatformPointsHitPurchase" ADD CONSTRAINT "PlatformPointsHitPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

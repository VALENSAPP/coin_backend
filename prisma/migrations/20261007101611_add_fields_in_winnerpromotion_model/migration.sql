-- AlterEnum: Recreate enum type safely within single transaction
ALTER TABLE "MarketplaceWinnerPromotion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MarketplaceWinnerPromotion" ALTER COLUMN "status" TYPE text;
DROP TYPE IF EXISTS "MarketplaceWinnerPromotionStatus";
CREATE TYPE "MarketplaceWinnerPromotionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'FAILED');
ALTER TABLE "MarketplaceWinnerPromotion" ALTER COLUMN "status" TYPE "MarketplaceWinnerPromotionStatus" USING ("status"::"MarketplaceWinnerPromotionStatus");
ALTER TABLE "MarketplaceWinnerPromotion" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "MarketplaceWinnerPromotion" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ALTER COLUMN "startAt" DROP NOT NULL,
ALTER COLUMN "endAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MarketplaceWinnerPromotionPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceWinnerPromotionPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotionPackage_isActive_idx" ON "MarketplaceWinnerPromotionPackage"("isActive");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_packageId_idx" ON "MarketplaceWinnerPromotion"("packageId");

-- CreateIndex
CREATE INDEX "MarketplaceWinnerPromotion_paymentId_idx" ON "MarketplaceWinnerPromotion"("paymentId");

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "MarketplaceWinnerPromotionPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceWinnerPromotion" ADD CONSTRAINT "MarketplaceWinnerPromotion_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "marketPlacePayments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

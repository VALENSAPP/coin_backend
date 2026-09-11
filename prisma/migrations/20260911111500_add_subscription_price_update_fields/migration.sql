-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "previousAmount" DOUBLE PRECISION,
ADD COLUMN     "priceUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "nextPriceUpdateAvailableAt" TIMESTAMP(3);

-- Allow sellers to run multiple winner-promotion records over time and combine
-- different active promo types for a winning product.
DROP INDEX IF EXISTS "MarketplaceWinnerPromotion_battleId_key";

CREATE TYPE "MarketplaceWinnerPromotionType" AS ENUM ('DISCOUNT_10_PERCENT_24H', 'FREE_SHIPPING');

ALTER TABLE "MarketplaceWinnerPromotion"
ADD COLUMN "promoType" "MarketplaceWinnerPromotionType",
ADD COLUMN "discountPercent" INTEGER,
ADD COLUMN "freeShipping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "originalPrice" DOUBLE PRECISION,
ADD COLUMN "promoPrice" DOUBLE PRECISION,
ADD COLUMN "originalShippingFee" DOUBLE PRECISION,
ADD COLUMN "promoShippingFee" DOUBLE PRECISION;

CREATE INDEX "MarketplaceWinnerPromotion_promoType_idx"
ON "MarketplaceWinnerPromotion"("promoType");

CREATE INDEX "MarketplaceWinnerPromotion_status_promoType_startAt_endAt_idx"
ON "MarketplaceWinnerPromotion"("status", "promoType", "startAt", "endAt");

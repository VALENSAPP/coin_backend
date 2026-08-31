-- AlterTable
ALTER TABLE "FansSubscriptionBuyData" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentProvider" TEXT NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "priceAtSubscription" DOUBLE PRECISION,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "pricingPolicy" TEXT NOT NULL DEFAULT 'REQUIRE_NEW_CONSENT';

-- CreateIndex
CREATE INDEX "FansSubscriptionBuyData_stripeSubscriptionId_idx" ON "FansSubscriptionBuyData"("stripeSubscriptionId");

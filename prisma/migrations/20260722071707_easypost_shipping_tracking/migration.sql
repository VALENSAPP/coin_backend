-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('NOT_SHIPPED', 'TRACKING_SUBMITTED', 'TRACKING_VALIDATED', 'PRE_TRANSIT', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'AVAILABLE_FOR_PICKUP', 'DELIVERY_EXCEPTION', 'RETURNING_TO_SELLER', 'RETURNED', 'CANCELLED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "carrierDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "easypostTrackerId" TEXT,
ADD COLUMN     "lastTrackingPayload" JSONB,
ADD COLUMN     "shippingProvider" TEXT,
ADD COLUMN     "shippingStatus" "ShippingStatus" NOT NULL DEFAULT 'NOT_SHIPPED',
ADD COLUMN     "trackingValidatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_easypostTrackerId_idx" ON "Order"("easypostTrackerId");

-- CreateIndex
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");

-- CreateIndex
CREATE INDEX "Order_shippingStatus_idx" ON "Order"("shippingStatus");

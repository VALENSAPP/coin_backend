-- AlterTable
ALTER TABLE "closetItems" ADD COLUMN     "buyerChatEnabled" BOOLEAN,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupAvailableHours" TEXT,
ADD COLUMN     "shippingFee" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Order_sellerId_paymentStatus_createdAt_idx" ON "Order"("sellerId", "paymentStatus", "createdAt");

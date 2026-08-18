-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isViewedBySeller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerViewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_sellerId_isViewedBySeller_idx" ON "Order"("sellerId", "isViewedBySeller");

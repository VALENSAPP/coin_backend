-- AlterTable
ALTER TABLE "closetItems"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "soldCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "marketPlacePayments"
ADD COLUMN "userId" TEXT,
ADD COLUMN "cartId" TEXT,
ADD COLUMN "metadata" JSONB,
ALTER COLUMN "orderId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "marketPlaceOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketPlaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketPlaceOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketPlaceOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketPlacePayments_userId_idx" ON "marketPlacePayments"("userId");

-- CreateIndex
CREATE INDEX "marketPlacePayments_cartId_idx" ON "marketPlacePayments"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "marketPlaceOrder_paymentId_key" ON "marketPlaceOrder"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "marketPlaceOrder_paymentIntentId_key" ON "marketPlaceOrder"("paymentIntentId");

-- CreateIndex
CREATE INDEX "marketPlaceOrder_userId_idx" ON "marketPlaceOrder"("userId");

-- CreateIndex
CREATE INDEX "marketPlaceOrder_createdAt_idx" ON "marketPlaceOrder"("createdAt");

-- CreateIndex
CREATE INDEX "marketPlaceOrderItem_orderId_idx" ON "marketPlaceOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "marketPlaceOrderItem_productId_idx" ON "marketPlaceOrderItem"("productId");

-- CreateIndex
CREATE INDEX "marketPlaceOrderItem_sellerId_idx" ON "marketPlaceOrderItem"("sellerId");

-- AddForeignKey
ALTER TABLE "marketPlaceOrder" ADD CONSTRAINT "marketPlaceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketPlaceOrder" ADD CONSTRAINT "marketPlaceOrder_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "marketPlacePayments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketPlaceOrderItem" ADD CONSTRAINT "marketPlaceOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "marketPlaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketPlaceOrderItem" ADD CONSTRAINT "marketPlaceOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "closetItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

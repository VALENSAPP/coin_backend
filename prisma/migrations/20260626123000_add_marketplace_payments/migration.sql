-- CreateTable
CREATE TABLE "marketPlacePayments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentIntentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketPlacePayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketPlacePayments_orderId_key" ON "marketPlacePayments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "marketPlacePayments_paymentIntentId_key" ON "marketPlacePayments"("paymentIntentId");

-- CreateIndex
CREATE INDEX "marketPlacePayments_status_idx" ON "marketPlacePayments"("status");

-- CreateIndex
CREATE INDEX "marketPlacePayments_createdAt_idx" ON "marketPlacePayments"("createdAt");

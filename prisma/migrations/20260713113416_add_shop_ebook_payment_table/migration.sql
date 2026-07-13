-- CreateTable
CREATE TABLE "shopEbookPayments" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "sellerAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "checkoutSessionId" TEXT,
    "paymentIntentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopEbookPayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopEbookPayments_checkoutSessionId_key" ON "shopEbookPayments"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "shopEbookPayments_paymentIntentId_key" ON "shopEbookPayments"("paymentIntentId");

-- CreateIndex
CREATE INDEX "shopEbookPayments_buyerId_idx" ON "shopEbookPayments"("buyerId");

-- CreateIndex
CREATE INDEX "shopEbookPayments_sellerId_idx" ON "shopEbookPayments"("sellerId");

-- CreateIndex
CREATE INDEX "shopEbookPayments_closetId_idx" ON "shopEbookPayments"("closetId");

-- CreateIndex
CREATE INDEX "shopEbookPayments_ebookId_idx" ON "shopEbookPayments"("ebookId");

-- CreateIndex
CREATE INDEX "shopEbookPayments_status_idx" ON "shopEbookPayments"("status");

-- CreateIndex
CREATE INDEX "shopEbookPayments_createdAt_idx" ON "shopEbookPayments"("createdAt");

-- AddForeignKey
ALTER TABLE "shopEbookPayments" ADD CONSTRAINT "shopEbookPayments_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopEbookPayments" ADD CONSTRAINT "shopEbookPayments_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopEbookPayments" ADD CONSTRAINT "shopEbookPayments_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopEbookPayments" ADD CONSTRAINT "shopEbookPayments_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "shopEbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

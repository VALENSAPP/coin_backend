-- CreateTable
CREATE TABLE "ebookPayments" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
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

    CONSTRAINT "ebookPayments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ebookPayments_checkoutSessionId_key" ON "ebookPayments"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ebookPayments_paymentIntentId_key" ON "ebookPayments"("paymentIntentId");

-- CreateIndex
CREATE INDEX "ebookPayments_buyerId_idx" ON "ebookPayments"("buyerId");

-- CreateIndex
CREATE INDEX "ebookPayments_sellerId_idx" ON "ebookPayments"("sellerId");

-- CreateIndex
CREATE INDEX "ebookPayments_postId_idx" ON "ebookPayments"("postId");

-- CreateIndex
CREATE INDEX "ebookPayments_status_idx" ON "ebookPayments"("status");

-- CreateIndex
CREATE INDEX "ebookPayments_createdAt_idx" ON "ebookPayments"("createdAt");

-- AddForeignKey
ALTER TABLE "ebookPayments" ADD CONSTRAINT "ebookPayments_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebookPayments" ADD CONSTRAINT "ebookPayments_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebookPayments" ADD CONSTRAINT "ebookPayments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

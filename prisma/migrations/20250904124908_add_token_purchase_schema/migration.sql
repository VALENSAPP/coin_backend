-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TokenPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platformFee" DOUBLE PRECISION NOT NULL,
    "vendorFee" DOUBLE PRECISION NOT NULL,
    "restAmount" DOUBLE PRECISION NOT NULL,
    "tokensReceived" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TokenPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenPurchase_userId_idx" ON "TokenPurchase"("userId");

-- CreateIndex
CREATE INDEX "TokenPurchase_vendorId_idx" ON "TokenPurchase"("vendorId");

-- CreateIndex
CREATE INDEX "TokenPurchase_status_idx" ON "TokenPurchase"("status");

-- AddForeignKey
ALTER TABLE "TokenPurchase" ADD CONSTRAINT "TokenPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

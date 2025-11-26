-- CreateTable
CREATE TABLE "DonationData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "purchaseTokenPrice" DOUBLE PRECISION DEFAULT 0,
    "stripeInvoiceId" TEXT,
    "action" TEXT NOT NULL DEFAULT 'donate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DonationData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonationData_userId_idx" ON "DonationData"("userId");

-- CreateIndex
CREATE INDEX "DonationData_vendorId_idx" ON "DonationData"("vendorId");

-- CreateIndex
CREATE INDEX "DonationData_status_idx" ON "DonationData"("status");

-- AddForeignKey
ALTER TABLE "DonationData" ADD CONSTRAINT "DonationData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

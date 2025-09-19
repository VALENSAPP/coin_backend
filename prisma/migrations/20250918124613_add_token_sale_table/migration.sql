-- CreateTable
CREATE TABLE "TokenSale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amountTokens" TEXT NOT NULL,
    "amountTokensFloat" DOUBLE PRECISION NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenSale_userId_idx" ON "TokenSale"("userId");

-- CreateIndex
CREATE INDEX "TokenSale_tokenAddress_idx" ON "TokenSale"("tokenAddress");

-- CreateIndex
CREATE INDEX "TokenSale_vendorId_idx" ON "TokenSale"("vendorId");

-- CreateIndex
CREATE INDEX "TokenSale_status_idx" ON "TokenSale"("status");

-- AddForeignKey
ALTER TABLE "TokenSale" ADD CONSTRAINT "TokenSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

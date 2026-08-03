-- CreateTable
CREATE TABLE "sellerWallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "provider" TEXT NOT NULL DEFAULT 'STRIPE',
    "pendingBalance" INTEGER NOT NULL DEFAULT 0,
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sellerWallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "walletLedgerEntries" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walletLedgerEntries_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WithdrawalRecord" ADD COLUMN IF NOT EXISTS "amountMinor" INTEGER;
ALTER TABLE "WithdrawalRecord" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'usd';
ALTER TABLE "WithdrawalRecord" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "WithdrawalRecord" ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- CreateIndex
CREATE INDEX "sellerWallets_userId_idx" ON "sellerWallets"("userId");

-- CreateIndex
CREATE INDEX "sellerWallets_provider_idx" ON "sellerWallets"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "sellerWallets_userId_currency_provider_key" ON "sellerWallets"("userId", "currency", "provider");

-- CreateIndex
CREATE INDEX "walletLedgerEntries_walletId_idx" ON "walletLedgerEntries"("walletId");

-- CreateIndex
CREATE INDEX "walletLedgerEntries_userId_idx" ON "walletLedgerEntries"("userId");

-- CreateIndex
CREATE INDEX "walletLedgerEntries_source_idx" ON "walletLedgerEntries"("source");

-- CreateIndex
CREATE INDEX "walletLedgerEntries_createdAt_idx" ON "walletLedgerEntries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "walletLedgerEntries_refType_refId_entryType_key" ON "walletLedgerEntries"("refType", "refId", "entryType");

-- CreateIndex
CREATE INDEX "WithdrawalRecord_provider_idx" ON "WithdrawalRecord"("provider");

-- CreateIndex
CREATE INDEX "WithdrawalRecord_createdAt_idx" ON "WithdrawalRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "sellerWallets" ADD CONSTRAINT "sellerWallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walletLedgerEntries" ADD CONSTRAINT "walletLedgerEntries_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "sellerWallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walletLedgerEntries" ADD CONSTRAINT "walletLedgerEntries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - The column `amountTokensFloat` on the `TokenSale` table will be renamed to `sellAmount`.
  - Added the optional column `actualReceivedAmount` to the `TokenSale` table.
  - Added the optional column `adminFeeAmount` to the `TokenSale` table.

*/
-- AlterTable
ALTER TABLE "TokenSale" RENAME COLUMN "amountTokensFloat" TO "sellAmount";
ALTER TABLE "TokenSale" ADD COLUMN "actualReceivedAmount" DOUBLE PRECISION;
ALTER TABLE "TokenSale" ADD COLUMN "adminFeeAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "WithdrawalRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawAmount" DOUBLE PRECISION,
    "txhash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WithdrawalRecord_userId_idx" ON "WithdrawalRecord"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRecord_status_idx" ON "WithdrawalRecord"("status");

-- AddForeignKey
ALTER TABLE "WithdrawalRecord" ADD CONSTRAINT "WithdrawalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

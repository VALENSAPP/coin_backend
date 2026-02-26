-- CreateTable
CREATE TABLE "digital_transaction" (
    "id" SERIAL NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "txId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "digital_transaction_txId_key" ON "digital_transaction"("txId");

-- CreateIndex
CREATE INDEX "digital_transaction_senderId_idx" ON "digital_transaction"("senderId");

-- CreateIndex
CREATE INDEX "digital_transaction_receiverId_idx" ON "digital_transaction"("receiverId");

-- AddForeignKey
ALTER TABLE "digital_transaction" ADD CONSTRAINT "digital_transaction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_transaction" ADD CONSTRAINT "digital_transaction_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

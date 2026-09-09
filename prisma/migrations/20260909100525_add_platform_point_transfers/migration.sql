-- CreateTable
CREATE TABLE "platform_point_transfers" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" VARCHAR(255),
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_point_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_point_transfers_senderId_createdAt_idx" ON "platform_point_transfers"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "platform_point_transfers_recipientId_createdAt_idx" ON "platform_point_transfers"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "platform_point_transfers" ADD CONSTRAINT "platform_point_transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_point_transfers" ADD CONSTRAINT "platform_point_transfers_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "FansSubscriptionStatus" AS ENUM ('ACTIVE', 'STOP');

-- CreateTable
CREATE TABLE "FansSubscriptionBuyData" (
    "id" TEXT NOT NULL,
    "fanUserId" TEXT NOT NULL,
    "buyUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "FansSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "FansSubscriptionBuyData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FansSubscriptionBuyData_fanUserId_idx" ON "FansSubscriptionBuyData"("fanUserId");

-- CreateIndex
CREATE INDEX "FansSubscriptionBuyData_buyUserId_idx" ON "FansSubscriptionBuyData"("buyUserId");

-- CreateIndex
CREATE INDEX "FansSubscriptionBuyData_status_idx" ON "FansSubscriptionBuyData"("status");

-- AddForeignKey
ALTER TABLE "FansSubscriptionBuyData" ADD CONSTRAINT "FansSubscriptionBuyData_fanUserId_fkey" FOREIGN KEY ("fanUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FansSubscriptionBuyData" ADD CONSTRAINT "FansSubscriptionBuyData_buyUserId_fkey" FOREIGN KEY ("buyUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

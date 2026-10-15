-- CreateEnum
CREATE TYPE "RewardProvider" AS ENUM ('MERIT', 'POINTS_COM', 'EXPEDIA', 'INTERNAL');

-- CreateEnum
CREATE TYPE "RedemptionCategory" AS ENUM ('AIRLINE_MILES', 'HOTEL_POINTS', 'TRAVEL_BOOKING', 'GIFT_CARD', 'SHOPPING', 'EXPERIENCES', 'MISSION_POSTS');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "UserLoyaltyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "RewardProvider" NOT NULL,
    "programCode" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsRedemption" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "RewardProvider" NOT NULL,
    "category" "RedemptionCategory" NOT NULL,
    "partnerProgramCode" TEXT,
    "valensPointsSpent" DOUBLE PRECISION NOT NULL,
    "rewardAmountReceived" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "feePoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "externalReferenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLoyaltyAccount_userId_idx" ON "UserLoyaltyAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLoyaltyAccount_userId_provider_programCode_accountNumbe_key" ON "UserLoyaltyAccount"("userId", "provider", "programCode", "accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PointsRedemption_idempotencyKey_key" ON "PointsRedemption"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PointsRedemption_userId_idx" ON "PointsRedemption"("userId");

-- CreateIndex
CREATE INDEX "PointsRedemption_status_idx" ON "PointsRedemption"("status");

-- AddForeignKey
ALTER TABLE "UserLoyaltyAccount" ADD CONSTRAINT "UserLoyaltyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsRedemption" ADD CONSTRAINT "PointsRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

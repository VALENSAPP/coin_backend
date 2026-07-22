-- AlterTable
ALTER TABLE "User" ADD COLUMN "marketplaceBattlePoints" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MarketplaceBattlePointsAward" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "baseJoinPoints" INTEGER NOT NULL DEFAULT 0,
    "argumentPoints" INTEGER NOT NULL DEFAULT 0,
    "engagementPoints" INTEGER NOT NULL DEFAULT 0,
    "timingBonus" INTEGER NOT NULL DEFAULT 0,
    "winnerBonus" INTEGER NOT NULL DEFAULT 0,
    "loserPenalty" INTEGER NOT NULL DEFAULT 0,
    "votedParticipantId" TEXT,
    "votedForWinner" BOOLEAN NOT NULL DEFAULT false,
    "argumentSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattlePointsAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceBattlePointsAward_battleId_idx" ON "MarketplaceBattlePointsAward"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattlePointsAward_userId_idx" ON "MarketplaceBattlePointsAward"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceBattlePointsAward_awardedAt_idx" ON "MarketplaceBattlePointsAward"("awardedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBattlePointsAward_battleId_userId_key" ON "MarketplaceBattlePointsAward"("battleId", "userId");

-- AddForeignKey
ALTER TABLE "MarketplaceBattlePointsAward" ADD CONSTRAINT "MarketplaceBattlePointsAward_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattlePointsAward" ADD CONSTRAINT "MarketplaceBattlePointsAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

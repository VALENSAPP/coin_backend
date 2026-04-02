-- AlterTable
ALTER TABLE "BattleParticipant" ADD COLUMN     "argumentPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "argumentSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awardedAt" TIMESTAMP(3),
ADD COLUMN     "baseJoinPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "engagementPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loserPenalty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "timingBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "underdogBonus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "winnerBonus" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserBattleStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalBattlePoints" INTEGER NOT NULL DEFAULT 0,
    "totalBattlesJoined" INTEGER NOT NULL DEFAULT 0,
    "totalBattlesWon" INTEGER NOT NULL DEFAULT 0,
    "totalPredictionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalPredictionsWrong" INTEGER NOT NULL DEFAULT 0,
    "totalArgumentsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "totalArgumentLikes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBattleStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBattleStats_userId_key" ON "UserBattleStats"("userId");

-- CreateIndex
CREATE INDEX "UserBattleStats_userId_idx" ON "UserBattleStats"("userId");

-- AddForeignKey
ALTER TABLE "UserBattleStats" ADD CONSTRAINT "UserBattleStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

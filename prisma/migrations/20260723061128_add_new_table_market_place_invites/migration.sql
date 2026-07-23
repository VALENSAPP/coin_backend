-- CreateEnum
CREATE TYPE "MarketplaceBattleMode" AS ENUM ('SAME_CLOSET', 'CROSS_SHOP');

-- AlterEnum
ALTER TYPE "MarketplaceBattleStatus" ADD VALUE 'PENDING_INVITE';

-- AlterTable
ALTER TABLE "MarketplaceBattle" ADD COLUMN     "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mode" "MarketplaceBattleMode" NOT NULL DEFAULT 'SAME_CLOSET',
ADD COLUMN     "opponentClosetId" TEXT,
ADD COLUMN     "opponentSellerId" TEXT,
ADD COLUMN     "question" TEXT,
ADD COLUMN     "stakeAmount" DOUBLE PRECISION,
ADD COLUMN     "stakeSettled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MarketplaceBattleChallengeInvite" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "challengerProductId" TEXT NOT NULL,
    "opponentProductId" TEXT NOT NULL,
    "status" "BattleInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceBattleChallengeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBattleChallengeInvite_battleId_key" ON "MarketplaceBattleChallengeInvite"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleChallengeInvite_inviterId_idx" ON "MarketplaceBattleChallengeInvite"("inviterId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleChallengeInvite_invitedUserId_idx" ON "MarketplaceBattleChallengeInvite"("invitedUserId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleChallengeInvite_status_idx" ON "MarketplaceBattleChallengeInvite"("status");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_opponentSellerId_idx" ON "MarketplaceBattle"("opponentSellerId");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_opponentClosetId_idx" ON "MarketplaceBattle"("opponentClosetId");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_mode_idx" ON "MarketplaceBattle"("mode");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_inviteExpiresAt_idx" ON "MarketplaceBattle"("inviteExpiresAt");

-- AddForeignKey
ALTER TABLE "MarketplaceBattle" ADD CONSTRAINT "MarketplaceBattle_opponentSellerId_fkey" FOREIGN KEY ("opponentSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattle" ADD CONSTRAINT "MarketplaceBattle_opponentClosetId_fkey" FOREIGN KEY ("opponentClosetId") REFERENCES "Mycloset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleChallengeInvite" ADD CONSTRAINT "MarketplaceBattleChallengeInvite_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleChallengeInvite" ADD CONSTRAINT "MarketplaceBattleChallengeInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleChallengeInvite" ADD CONSTRAINT "MarketplaceBattleChallengeInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

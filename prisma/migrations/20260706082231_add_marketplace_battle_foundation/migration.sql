-- CreateEnum
CREATE TYPE "MarketplaceBattleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceBattleOutcome" AS ENUM ('PENDING', 'WINNER', 'TIE', 'CANCELLED');

-- CreateTable
CREATE TABLE "MarketplaceBattle" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" "MarketplaceBattleStatus" NOT NULL DEFAULT 'DRAFT',
    "outcome" "MarketplaceBattleOutcome" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "winnerParticipantId" TEXT,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceBattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceBattleVote" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceBattleComment" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceBattle_sellerId_idx" ON "MarketplaceBattle"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_closetId_idx" ON "MarketplaceBattle"("closetId");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_status_idx" ON "MarketplaceBattle"("status");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_startAt_idx" ON "MarketplaceBattle"("startAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_endAt_idx" ON "MarketplaceBattle"("endAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_status_startAt_idx" ON "MarketplaceBattle"("status", "startAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattle_status_endAt_idx" ON "MarketplaceBattle"("status", "endAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattleParticipant_battleId_idx" ON "MarketplaceBattleParticipant"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleParticipant_productId_idx" ON "MarketplaceBattleParticipant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBattleParticipant_battleId_productId_key" ON "MarketplaceBattleParticipant"("battleId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBattleParticipant_battleId_position_key" ON "MarketplaceBattleParticipant"("battleId", "position");

-- CreateIndex
CREATE INDEX "MarketplaceBattleVote_battleId_idx" ON "MarketplaceBattleVote"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleVote_participantId_idx" ON "MarketplaceBattleVote"("participantId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleVote_userId_idx" ON "MarketplaceBattleVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceBattleVote_battleId_userId_key" ON "MarketplaceBattleVote"("battleId", "userId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleComment_battleId_idx" ON "MarketplaceBattleComment"("battleId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleComment_userId_idx" ON "MarketplaceBattleComment"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceBattleComment_createdAt_idx" ON "MarketplaceBattleComment"("createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceBattleComment_battleId_createdAt_idx" ON "MarketplaceBattleComment"("battleId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketplaceBattle" ADD CONSTRAINT "MarketplaceBattle_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattle" ADD CONSTRAINT "MarketplaceBattle_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattle" ADD CONSTRAINT "MarketplaceBattle_winnerParticipantId_fkey" FOREIGN KEY ("winnerParticipantId") REFERENCES "MarketplaceBattleParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleParticipant" ADD CONSTRAINT "MarketplaceBattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleParticipant" ADD CONSTRAINT "MarketplaceBattleParticipant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "closetItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleVote" ADD CONSTRAINT "MarketplaceBattleVote_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleVote" ADD CONSTRAINT "MarketplaceBattleVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MarketplaceBattleParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleVote" ADD CONSTRAINT "MarketplaceBattleVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleComment" ADD CONSTRAINT "MarketplaceBattleComment_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceBattleComment" ADD CONSTRAINT "MarketplaceBattleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

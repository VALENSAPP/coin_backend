-- CreateEnum
CREATE TYPE "BattleFormat" AS ENUM ('POLL', 'HEAD_TO_HEAD');

-- CreateEnum
CREATE TYPE "BattleStatus" AS ENUM ('DRAFT', 'PENDING_INVITE', 'LIVE', 'CLOSED', 'RESOLVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BattleInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "format" "BattleFormat" NOT NULL,
    "status" "BattleStatus" NOT NULL DEFAULT 'DRAFT',
    "question" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3) NOT NULL,
    "resolutionMethod" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "stakeAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "liveAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "winningSide" TEXT,
    "correctSide" TEXT,
    "winnerUserId" TEXT,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleInvite" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "status" "BattleInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BattleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleParticipant" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "votePoints" INTEGER NOT NULL DEFAULT 0,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BattleParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePrediction" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattlePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleComment" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleCommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleCommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleVote" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleReward" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER,
    "rewardPoints" DOUBLE PRECISION,
    "rewardType" TEXT DEFAULT 'CRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "battleId" TEXT,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Battle_creatorId_idx" ON "Battle"("creatorId");

-- CreateIndex
CREATE INDEX "Battle_status_idx" ON "Battle"("status");

-- CreateIndex
CREATE INDEX "Battle_format_idx" ON "Battle"("format");

-- CreateIndex
CREATE INDEX "BattleInvite_inviterId_idx" ON "BattleInvite"("inviterId");

-- CreateIndex
CREATE INDEX "BattleInvite_invitedUserId_idx" ON "BattleInvite"("invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleInvite_battleId_invitedUserId_key" ON "BattleInvite"("battleId", "invitedUserId");

-- CreateIndex
CREATE INDEX "BattleParticipant_battleId_idx" ON "BattleParticipant"("battleId");

-- CreateIndex
CREATE INDEX "BattleParticipant_userId_idx" ON "BattleParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleParticipant_battleId_userId_key" ON "BattleParticipant"("battleId", "userId");

-- CreateIndex
CREATE INDEX "BattlePrediction_battleId_idx" ON "BattlePrediction"("battleId");

-- CreateIndex
CREATE INDEX "BattlePrediction_userId_idx" ON "BattlePrediction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePrediction_battleId_userId_key" ON "BattlePrediction"("battleId", "userId");

-- CreateIndex
CREATE INDEX "BattleComment_battleId_idx" ON "BattleComment"("battleId");

-- CreateIndex
CREATE INDEX "BattleComment_userId_idx" ON "BattleComment"("userId");

-- CreateIndex
CREATE INDEX "BattleCommentLike_commentId_idx" ON "BattleCommentLike"("commentId");

-- CreateIndex
CREATE INDEX "BattleCommentLike_userId_idx" ON "BattleCommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleCommentLike_commentId_userId_key" ON "BattleCommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "BattleVote_battleId_idx" ON "BattleVote"("battleId");

-- CreateIndex
CREATE INDEX "BattleVote_userId_idx" ON "BattleVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleVote_battleId_userId_key" ON "BattleVote"("battleId", "userId");

-- CreateIndex
CREATE INDEX "BattleReward_battleId_idx" ON "BattleReward"("battleId");

-- CreateIndex
CREATE INDEX "BattleReward_userId_idx" ON "BattleReward"("userId");

-- CreateIndex
CREATE INDEX "BattleAchievement_userId_idx" ON "BattleAchievement"("userId");

-- CreateIndex
CREATE INDEX "BattleAchievement_battleId_idx" ON "BattleAchievement"("battleId");

-- CreateIndex
CREATE INDEX "BattleAchievement_code_idx" ON "BattleAchievement"("code");

-- CreateIndex
CREATE INDEX "BattleActivity_userId_idx" ON "BattleActivity"("userId");

-- CreateIndex
CREATE INDEX "BattleActivity_battleId_idx" ON "BattleActivity"("battleId");

-- CreateIndex
CREATE INDEX "BattleActivity_type_idx" ON "BattleActivity"("type");

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleInvite" ADD CONSTRAINT "BattleInvite_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleInvite" ADD CONSTRAINT "BattleInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleInvite" ADD CONSTRAINT "BattleInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleParticipant" ADD CONSTRAINT "BattleParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePrediction" ADD CONSTRAINT "BattlePrediction_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePrediction" ADD CONSTRAINT "BattlePrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleComment" ADD CONSTRAINT "BattleComment_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleComment" ADD CONSTRAINT "BattleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleComment" ADD CONSTRAINT "BattleComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BattleComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleCommentLike" ADD CONSTRAINT "BattleCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "BattleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleCommentLike" ADD CONSTRAINT "BattleCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleVote" ADD CONSTRAINT "BattleVote_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleVote" ADD CONSTRAINT "BattleVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAchievement" ADD CONSTRAINT "BattleAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAchievement" ADD CONSTRAINT "BattleAchievement_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleActivity" ADD CONSTRAINT "BattleActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleActivity" ADD CONSTRAINT "BattleActivity_battleId_fkey" FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

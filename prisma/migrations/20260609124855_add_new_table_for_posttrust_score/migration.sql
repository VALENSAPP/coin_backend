-- CreateEnum
CREATE TYPE "TrustVoteType" AS ENUM ('AGREE', 'DISAGREE', 'NOT_SURE');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isTrustPost" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PostTrustVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "voteType" "TrustVoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostTrustVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostTrustVote_postId_idx" ON "PostTrustVote"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTrustVote_userId_postId_key" ON "PostTrustVote"("userId", "postId");

-- AddForeignKey
ALTER TABLE "PostTrustVote" ADD CONSTRAINT "PostTrustVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTrustVote" ADD CONSTRAINT "PostTrustVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

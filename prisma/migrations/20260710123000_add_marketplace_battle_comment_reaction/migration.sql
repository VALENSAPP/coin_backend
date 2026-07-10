-- Create marketplace battle comment reaction table
CREATE TABLE "MarketplaceBattleCommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceBattleCommentReaction_pkey" PRIMARY KEY ("id")
);

-- One reaction per user per marketplace battle comment
CREATE UNIQUE INDEX "MarketplaceBattleCommentReaction_commentId_userId_key"
ON "MarketplaceBattleCommentReaction"("commentId", "userId");

CREATE INDEX "MarketplaceBattleCommentReaction_commentId_idx"
ON "MarketplaceBattleCommentReaction"("commentId");

CREATE INDEX "MarketplaceBattleCommentReaction_userId_idx"
ON "MarketplaceBattleCommentReaction"("userId");

CREATE INDEX "MarketplaceBattleCommentReaction_type_idx"
ON "MarketplaceBattleCommentReaction"("type");

ALTER TABLE "MarketplaceBattleCommentReaction"
ADD CONSTRAINT "MarketplaceBattleCommentReaction_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "MarketplaceBattleComment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceBattleCommentReaction"
ADD CONSTRAINT "MarketplaceBattleCommentReaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

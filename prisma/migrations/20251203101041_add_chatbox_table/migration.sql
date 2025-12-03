-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversationType" ADD VALUE 'POST_SHARE';
ALTER TYPE "ConversationType" ADD VALUE 'STORY_COMMENT';

-- CreateTable
CREATE TABLE "ChatBox" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatBox_senderId_idx" ON "ChatBox"("senderId");

-- CreateIndex
CREATE INDEX "ChatBox_receiverId_idx" ON "ChatBox"("receiverId");

-- AddForeignKey
ALTER TABLE "ChatBox" ADD CONSTRAINT "ChatBox_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatBox" ADD CONSTRAINT "ChatBox_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

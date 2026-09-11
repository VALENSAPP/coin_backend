-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_ownerId_idx" ON "Conversation"("ownerId");

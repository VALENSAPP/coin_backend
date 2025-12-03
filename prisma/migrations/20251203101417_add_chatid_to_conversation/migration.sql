-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "chatId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_chatId_idx" ON "Conversation"("chatId");

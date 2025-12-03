/*
  Warnings:

  - The values [POST_SHARE,STORY_COMMENT] on the enum `ConversationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `postId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `storyId` on the `Conversation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('REEL', 'STORY', 'POST');

-- AlterEnum
BEGIN;
CREATE TYPE "ConversationType_new" AS ENUM ('MEDIA', 'CHAT');
ALTER TABLE "Conversation" ALTER COLUMN "type" TYPE "ConversationType_new" USING ("type"::text::"ConversationType_new");
ALTER TYPE "ConversationType" RENAME TO "ConversationType_old";
ALTER TYPE "ConversationType_new" RENAME TO "ConversationType";
DROP TYPE "ConversationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_postId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_storyId_fkey";

-- DropIndex
DROP INDEX "Conversation_postId_idx";

-- DropIndex
DROP INDEX "Conversation_storyId_idx";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "postId",
DROP COLUMN "storyId",
ADD COLUMN     "mediaId" TEXT,
ADD COLUMN     "mediaType" "MediaType";

-- CreateIndex
CREATE INDEX "Conversation_mediaId_idx" ON "Conversation"("mediaId");

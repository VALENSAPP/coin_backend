-- CreateEnum
CREATE TYPE "cmntType" AS ENUM ('NORMAL', 'AGREE', 'DISAGREE', 'NOT_SURE');

-- AlterTable
ALTER TABLE "PostComment" ADD COLUMN     "commentType" "cmntType" NOT NULL DEFAULT 'NORMAL';

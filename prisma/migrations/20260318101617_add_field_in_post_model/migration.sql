-- CreateEnum
CREATE TYPE "postHide" AS ENUM ('yes', 'no');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "postHide" "postHide" NOT NULL DEFAULT 'no';

-- CreateEnum
CREATE TYPE "isdelete" AS ENUM ('yes', 'no');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isDelete" "isdelete" NOT NULL DEFAULT 'no';

-- CreateEnum
CREATE TYPE "format" AS ENUM ('image', 'video');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "format" "format" NOT NULL DEFAULT 'image';

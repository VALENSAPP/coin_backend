-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "hashtag" TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "music" TEXT,
ADD COLUMN     "taggedPeople" TEXT[];

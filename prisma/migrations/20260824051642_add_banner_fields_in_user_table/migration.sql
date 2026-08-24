-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedUntil" TIMESTAMP(3),
ADD COLUMN     "screenshotAttempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firebaseUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUserId_key" ON "User"("firebaseUserId");
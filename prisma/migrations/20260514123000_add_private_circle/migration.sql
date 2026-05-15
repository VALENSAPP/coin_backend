-- CreateEnum
CREATE TYPE "PrivateCircleMemberStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateTable
CREATE TABLE "PrivateCircle" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minSlots" INTEGER NOT NULL,
    "maxSlots" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateCircleMember" (
    "id" TEXT NOT NULL,
    "privateCircleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PrivateCircleMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateCircleMember_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "privateCircleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PrivateCircle_ownerId_key" ON "PrivateCircle"("ownerId");

-- CreateIndex
CREATE INDEX "PrivateCircle_ownerId_idx" ON "PrivateCircle"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateCircleMember_privateCircleId_userId_key" ON "PrivateCircleMember"("privateCircleId", "userId");

-- CreateIndex
CREATE INDEX "PrivateCircleMember_userId_idx" ON "PrivateCircleMember"("userId");

-- CreateIndex
CREATE INDEX "PrivateCircleMember_privateCircleId_status_idx" ON "PrivateCircleMember"("privateCircleId", "status");

-- CreateIndex
CREATE INDEX "Post_privateCircleId_idx" ON "Post"("privateCircleId");

-- AddForeignKey
ALTER TABLE "PrivateCircle" ADD CONSTRAINT "PrivateCircle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateCircleMember" ADD CONSTRAINT "PrivateCircleMember_privateCircleId_fkey" FOREIGN KEY ("privateCircleId") REFERENCES "PrivateCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateCircleMember" ADD CONSTRAINT "PrivateCircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_privateCircleId_fkey" FOREIGN KEY ("privateCircleId") REFERENCES "PrivateCircle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

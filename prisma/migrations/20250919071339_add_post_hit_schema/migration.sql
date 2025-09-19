-- CreateTable
CREATE TABLE "PostHit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hitLeft" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PostHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostHit_userId_idx" ON "PostHit"("userId");

-- AddForeignKey
ALTER TABLE "PostHit" ADD CONSTRAINT "PostHit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

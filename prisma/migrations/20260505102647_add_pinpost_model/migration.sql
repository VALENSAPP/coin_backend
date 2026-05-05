-- CreateTable
CREATE TABLE "PinnedPost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PinnedPost_userId_pinnedAt_idx" ON "PinnedPost"("userId", "pinnedAt");

-- CreateIndex
CREATE INDEX "PinnedPost_postId_idx" ON "PinnedPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedPost_postId_userId_key" ON "PinnedPost"("postId", "userId");

-- AddForeignKey
ALTER TABLE "PinnedPost" ADD CONSTRAINT "PinnedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinnedPost" ADD CONSTRAINT "PinnedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

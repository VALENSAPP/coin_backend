-- CreateTable
CREATE TABLE "SavePost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavePost_userId_idx" ON "SavePost"("userId");

-- CreateIndex
CREATE INDEX "SavePost_postId_idx" ON "SavePost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SavePost_postId_userId_key" ON "SavePost"("postId", "userId");

-- AddForeignKey
ALTER TABLE "SavePost" ADD CONSTRAINT "SavePost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavePost" ADD CONSTRAINT "SavePost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

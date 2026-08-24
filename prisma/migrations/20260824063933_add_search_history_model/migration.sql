-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT,
    "searchedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchHistory_userId_idx" ON "SearchHistory"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_searchedUserId_idx" ON "SearchHistory"("searchedUserId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_updatedAt_idx" ON "SearchHistory"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_searchedUserId_fkey" FOREIGN KEY ("searchedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

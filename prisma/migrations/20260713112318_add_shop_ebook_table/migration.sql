-- CreateTable
CREATE TABLE "shopEbooks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "caption" TEXT,
    "text" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ebookpdf" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isDownload" BOOLEAN NOT NULL DEFAULT true,
    "promoCode" TEXT,
    "tableContent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopEbooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopEbooks_userId_idx" ON "shopEbooks"("userId");

-- CreateIndex
CREATE INDEX "shopEbooks_closetId_idx" ON "shopEbooks"("closetId");

-- CreateIndex
CREATE INDEX "shopEbooks_createdAt_idx" ON "shopEbooks"("createdAt");

-- AddForeignKey
ALTER TABLE "shopEbooks" ADD CONSTRAINT "shopEbooks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopEbooks" ADD CONSTRAINT "shopEbooks_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

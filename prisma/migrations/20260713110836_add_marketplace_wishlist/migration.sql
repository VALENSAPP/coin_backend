-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlistItems" (
    "id" TEXT NOT NULL,
    "wishlistId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlistItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wishlist_userId_idx" ON "wishlist"("userId");

-- CreateIndex
CREATE INDEX "wishlist_sellerId_idx" ON "wishlist"("sellerId");

-- CreateIndex
CREATE INDEX "wishlist_closetId_idx" ON "wishlist"("closetId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_userId_sellerId_closetId_key" ON "wishlist"("userId", "sellerId", "closetId");

-- CreateIndex
CREATE INDEX "wishlistItems_wishlistId_idx" ON "wishlistItems"("wishlistId");

-- CreateIndex
CREATE INDEX "wishlistItems_productId_idx" ON "wishlistItems"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlistItems_wishlistId_productId_key" ON "wishlistItems"("wishlistId", "productId");

-- AddForeignKey
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItems" ADD CONSTRAINT "wishlistItems_wishlistId_fkey" FOREIGN KEY ("wishlistId") REFERENCES "wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlistItems" ADD CONSTRAINT "wishlistItems_productId_fkey" FOREIGN KEY ("productId") REFERENCES "closetItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

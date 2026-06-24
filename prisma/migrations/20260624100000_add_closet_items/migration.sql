-- CreateEnum
CREATE TYPE "ClosetItemCondition" AS ENUM ('New', 'Used', 'Good_condition', 'Need_attention');

-- CreateTable
CREATE TABLE "closetItems" (
    "id" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "condition" "ClosetItemCondition" NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "shippingOption" "ShippingOptions" NOT NULL,
    "estimateShippingTime" TEXT,
    "returnPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closetItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "closetItems_closetId_idx" ON "closetItems"("closetId");

-- CreateIndex
CREATE INDEX "closetItems_userId_idx" ON "closetItems"("userId");

-- CreateIndex
CREATE INDEX "closetItems_category_idx" ON "closetItems"("category");

-- AddForeignKey
ALTER TABLE "closetItems" ADD CONSTRAINT "closetItems_closetId_fkey" FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closetItems" ADD CONSTRAINT "closetItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

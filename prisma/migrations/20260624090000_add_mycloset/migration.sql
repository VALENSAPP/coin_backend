-- CreateEnum
CREATE TYPE "WhoCanBuy" AS ENUM ('Everyone', 'followers');

-- CreateEnum
CREATE TYPE "ShippingOptions" AS ENUM ('ship_items', 'local_pick');

-- CreateTable
CREATE TABLE "Mycloset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopUsername" TEXT NOT NULL,
    "shopLogo" TEXT,
    "description" TEXT,
    "shopCategory" TEXT,
    "location" TEXT,
    "whoCanBuy" "WhoCanBuy" NOT NULL DEFAULT 'Everyone',
    "paymentMethod" TEXT,
    "shippingOptions" "ShippingOptions" NOT NULL DEFAULT 'ship_items',
    "returnPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mycloset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mycloset_userId_key" ON "Mycloset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mycloset_shopUsername_key" ON "Mycloset"("shopUsername");

-- CreateIndex
CREATE INDEX "Mycloset_userId_idx" ON "Mycloset"("userId");

-- CreateIndex
CREATE INDEX "Mycloset_shopUsername_idx" ON "Mycloset"("shopUsername");

-- AddForeignKey
ALTER TABLE "Mycloset" ADD CONSTRAINT "Mycloset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

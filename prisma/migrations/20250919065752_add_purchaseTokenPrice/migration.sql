/*
  Warnings:

  - Added the required column `purchaseTokenPrice` to the `TokenPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TokenPurchase" ADD COLUMN     "purchaseTokenPrice" DOUBLE PRECISION NOT NULL;

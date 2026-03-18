/*
  Warnings:

  - Added the required column `txType` to the `digital_transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txValue` to the `digital_transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "digital_transaction" ADD COLUMN     "txType" TEXT NOT NULL,
ADD COLUMN     "txValue" DECIMAL(18,8) NOT NULL;

/*
  Warnings:

  - You are about to drop the column `referPoints` on the `UserReferral` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserReferral" DROP COLUMN "referPoints",
ADD COLUMN     "referredUserPoints" INTEGER,
ADD COLUMN     "referrerPoints" INTEGER;

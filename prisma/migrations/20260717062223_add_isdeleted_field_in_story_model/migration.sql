-- CreateEnum
CREATE TYPE "isdeleted" AS ENUM ('yes', 'no');

-- DropIndex
DROP INDEX "MarketplaceWinnerPromotion_promoType_idx";

-- DropIndex
DROP INDEX "MarketplaceWinnerPromotion_status_promoType_startAt_endAt_idx";

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "isDeleted" "isdeleted" NOT NULL DEFAULT 'no';

-- AlterTable
ALTER TABLE "DonationData" ADD COLUMN     "isReadByOwner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isReadByOwner" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PostLike" ADD COLUMN     "isReadByOwner" BOOLEAN NOT NULL DEFAULT false;

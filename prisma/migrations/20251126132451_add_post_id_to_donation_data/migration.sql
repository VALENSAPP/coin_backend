-- AlterTable
ALTER TABLE "DonationData" ADD COLUMN     "postId" TEXT;

-- CreateIndex
CREATE INDEX "DonationData_postId_idx" ON "DonationData"("postId");

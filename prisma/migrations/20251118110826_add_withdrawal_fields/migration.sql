-- AlterTable
ALTER TABLE "WithdrawalRecord" ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "processingAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "documentVerificationAt" TIMESTAMP(3),
ADD COLUMN     "documentVerificationRejectReason" TEXT,
ADD COLUMN     "documentVerificationStatus" TEXT,
ADD COLUMN     "sumSubApplicantId" TEXT;

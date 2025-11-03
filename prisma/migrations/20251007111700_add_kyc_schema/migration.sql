-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM('PENDING', 'SUBMITTED', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "kyc" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Kyc" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "veriffSessionId" TEXT NOT NULL,
    "veriffUrl" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "documentType" TEXT,
    "webhookData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Kyc" ADD CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
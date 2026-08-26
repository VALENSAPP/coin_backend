-- CreateEnum
CREATE TYPE "CancellationStatus" AS ENUM ('NONE', 'REQUESTED', 'APPROVED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClosetChatMessageEventType" ADD VALUE 'CANCELLATION_REQUESTED';
ALTER TYPE "ClosetChatMessageEventType" ADD VALUE 'CANCELLATION_DECLINED';
ALTER TYPE "ClosetChatMessageEventType" ADD VALUE 'CANCELLATION_APPROVED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationDeclineReason" TEXT,
ADD COLUMN     "cancellationRespondedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationStatus" "CancellationStatus" NOT NULL DEFAULT 'NONE';

-- AlterEnum
ALTER TYPE "ClosetChatMessageEventType" ADD VALUE 'ORDER_CANCELLED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationAgreedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundId" TEXT,
ADD COLUMN     "refundStatus" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

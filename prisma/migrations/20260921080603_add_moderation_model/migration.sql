-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('APPROVED', 'PENDING_APPROVAL', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModerationContentType" AS ENUM ('POST', 'COMMENT', 'PRODUCT', 'EBOOK');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationScore" DOUBLE PRECISION,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "PostComment" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationScore" DOUBLE PRECISION,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "closetItems" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationScore" DOUBLE PRECISION,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "shopEbooks" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationScore" DOUBLE PRECISION,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "ModerationAuditLog" (
    "id" TEXT NOT NULL,
    "contentType" "ModerationContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "aiVerdict" "ModerationStatus" NOT NULL,
    "aiReason" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "flaggedLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adminAction" "ModerationStatus",
    "adminReason" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationAuditLog_contentType_contentId_idx" ON "ModerationAuditLog"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_authorId_idx" ON "ModerationAuditLog"("authorId");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_aiVerdict_idx" ON "ModerationAuditLog"("aiVerdict");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_createdAt_idx" ON "ModerationAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Post_moderationStatus_idx" ON "Post"("moderationStatus");

-- CreateIndex
CREATE INDEX "PostComment_moderationStatus_idx" ON "PostComment"("moderationStatus");

-- CreateIndex
CREATE INDEX "closetItems_moderationStatus_idx" ON "closetItems"("moderationStatus");

-- CreateIndex
CREATE INDEX "shopEbooks_moderationStatus_idx" ON "shopEbooks"("moderationStatus");

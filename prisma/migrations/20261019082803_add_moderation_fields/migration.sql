-- CreateEnum
CREATE TYPE "AccountStanding" AS ENUM ('GOOD', 'WARNING', 'RESTRICTED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('ALLOW', 'WARN', 'BLOCK', 'REVIEW');

-- CreateEnum
CREATE TYPE "ModerationCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACTIONED', 'RESOLVED', 'CLOSED', 'APPEALED');

-- CreateEnum
CREATE TYPE "ModerationCategory" AS ENUM ('HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'SEXUAL_CONTENT', 'CHILD_SAFETY', 'SCAM_FRAUD', 'IMPERSONATION', 'PRIVACY', 'SPAM', 'ILLEGAL', 'OFF_TOPIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('HATE_DISCRIMINATION', 'HARASSMENT', 'THREATS_VIOLENCE', 'SEXUAL_EXPLOITATION', 'CHILD_SAFETY', 'SCAM_FRAUD', 'IMPERSONATION', 'PRIVACY', 'SPAM_MANIPULATION', 'ILLEGAL_ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('RECEIVED', 'TRIAGED', 'IN_REVIEW', 'ACTIONED', 'NO_VIOLATION', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountViolationAction" AS ENUM ('WARNING', 'STRIKE', 'FEATURE_RESTRICTION', 'SUSPENSION_24H', 'SUSPENSION_7D', 'SUSPENSION_30D', 'PERMANENT_BAN', 'OTHER');

-- AlterTable
ALTER TABLE "ModerationAuditLog" ADD COLUMN     "action" TEXT,
ADD COLUMN     "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "newState" TEXT,
ADD COLUMN     "previousState" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountStanding" "AccountStanding" NOT NULL DEFAULT 'GOOD',
ADD COLUMN     "standingReason" TEXT,
ADD COLUMN     "standingStrikeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "standingUntil" TIMESTAMP(3),
ADD COLUMN     "standingWarningCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "moderationCases" (
    "id" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "contentId" TEXT,
    "contentType" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'AUTOMATED',
    "category" "ModerationCategory",
    "severity" INTEGER NOT NULL DEFAULT 0,
    "providerScores" JSONB,
    "reasonCode" TEXT,
    "automatedDecision" "ModerationDecision" NOT NULL DEFAULT 'ALLOW',
    "finalDecision" "ModerationDecision",
    "moderatorId" TEXT,
    "moderatorNotes" TEXT,
    "humanReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "ModerationCaseStatus" NOT NULL DEFAULT 'OPEN',
    "appealStatus" TEXT DEFAULT 'NONE',
    "appealReason" TEXT,
    "appealedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderationCases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accountViolations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "category" "ModerationCategory" NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "reasonCode" TEXT NOT NULL,
    "action" "AccountViolationAction" NOT NULL DEFAULT 'WARNING',
    "restrictionScope" TEXT,
    "restrictionStart" TIMESTAMP(3),
    "restrictionEnd" TIMESTAMP(3),
    "appealed" BOOLEAN NOT NULL DEFAULT false,
    "overturned" BOOLEAN NOT NULL DEFAULT false,
    "overturnedReason" TEXT,
    "overturnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accountViolations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universalReports" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "reasonCode" "ReportReason" NOT NULL,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "moderationCaseId" TEXT,
    "moderatorNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universalReports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userMutes" (
    "id" TEXT NOT NULL,
    "muterId" TEXT NOT NULL,
    "mutedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userMutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderationCases_subjectUserId_idx" ON "moderationCases"("subjectUserId");

-- CreateIndex
CREATE INDEX "moderationCases_contentId_contentType_idx" ON "moderationCases"("contentId", "contentType");

-- CreateIndex
CREATE INDEX "moderationCases_status_idx" ON "moderationCases"("status");

-- CreateIndex
CREATE INDEX "moderationCases_severity_idx" ON "moderationCases"("severity");

-- CreateIndex
CREATE INDEX "moderationCases_feature_idx" ON "moderationCases"("feature");

-- CreateIndex
CREATE INDEX "moderationCases_createdAt_idx" ON "moderationCases"("createdAt");

-- CreateIndex
CREATE INDEX "accountViolations_userId_idx" ON "accountViolations"("userId");

-- CreateIndex
CREATE INDEX "accountViolations_caseId_idx" ON "accountViolations"("caseId");

-- CreateIndex
CREATE INDEX "accountViolations_action_idx" ON "accountViolations"("action");

-- CreateIndex
CREATE INDEX "accountViolations_createdAt_idx" ON "accountViolations"("createdAt");

-- CreateIndex
CREATE INDEX "universalReports_reporterUserId_idx" ON "universalReports"("reporterUserId");

-- CreateIndex
CREATE INDEX "universalReports_reportedUserId_idx" ON "universalReports"("reportedUserId");

-- CreateIndex
CREATE INDEX "universalReports_contentId_contentType_idx" ON "universalReports"("contentId", "contentType");

-- CreateIndex
CREATE INDEX "universalReports_status_idx" ON "universalReports"("status");

-- CreateIndex
CREATE INDEX "universalReports_priority_idx" ON "universalReports"("priority");

-- CreateIndex
CREATE INDEX "universalReports_createdAt_idx" ON "universalReports"("createdAt");

-- CreateIndex
CREATE INDEX "userMutes_muterId_idx" ON "userMutes"("muterId");

-- CreateIndex
CREATE INDEX "userMutes_mutedId_idx" ON "userMutes"("mutedId");

-- CreateIndex
CREATE UNIQUE INDEX "userMutes_muterId_mutedId_key" ON "userMutes"("muterId", "mutedId");

-- CreateIndex
CREATE INDEX "ModerationAuditLog_caseId_idx" ON "ModerationAuditLog"("caseId");

-- AddForeignKey
ALTER TABLE "moderationCases" ADD CONSTRAINT "moderationCases_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountViolations" ADD CONSTRAINT "accountViolations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountViolations" ADD CONSTRAINT "accountViolations_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "moderationCases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universalReports" ADD CONSTRAINT "universalReports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universalReports" ADD CONSTRAINT "universalReports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "universalReports" ADD CONSTRAINT "universalReports_moderationCaseId_fkey" FOREIGN KEY ("moderationCaseId") REFERENCES "moderationCases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userMutes" ADD CONSTRAINT "userMutes_muterId_fkey" FOREIGN KEY ("muterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userMutes" ADD CONSTRAINT "userMutes_mutedId_fkey" FOREIGN KEY ("mutedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

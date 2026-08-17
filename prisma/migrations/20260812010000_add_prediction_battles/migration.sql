-- Add provider-backed prediction battles without changing existing battle behavior.
CREATE TYPE "BattleType" AS ENUM ('NORMAL', 'PREDICTION');
CREATE TYPE "PredictionProvider" AS ENUM ('POLYMARKET', 'MANIFOLD');
CREATE TYPE "PredictionCategory" AS ENUM ('SPORTS', 'FINANCE', 'ELECTIONS', 'CRYPTO');

ALTER TABLE "Battle"
ADD COLUMN "battleType" "BattleType" NOT NULL DEFAULT 'NORMAL';

CREATE TABLE "BattleExternalPredictionMarket" (
    "id" TEXT NOT NULL,
    "battleId" TEXT NOT NULL,
    "provider" "PredictionProvider" NOT NULL,
    "category" "PredictionCategory" NOT NULL,
    "externalMarketId" TEXT NOT NULL,
    "externalEventId" TEXT,
    "question" TEXT NOT NULL,
    "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "providerStatus" TEXT,
    "resultSide" TEXT,
    "resultRaw" JSONB,
    "raw" JSONB,
    "closeTime" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleExternalPredictionMarket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BattleExternalPredictionVote" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedSide" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleExternalPredictionVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BattleExternalPredictionMarket_battleId_key" ON "BattleExternalPredictionMarket"("battleId");
CREATE UNIQUE INDEX "BattleExternalPredictionMarket_provider_externalMarketId_key" ON "BattleExternalPredictionMarket"("provider", "externalMarketId");
CREATE INDEX "BattleExternalPredictionMarket_category_idx" ON "BattleExternalPredictionMarket"("category");
CREATE INDEX "BattleExternalPredictionMarket_providerStatus_idx" ON "BattleExternalPredictionMarket"("providerStatus");
CREATE UNIQUE INDEX "BattleExternalPredictionVote_predictionId_userId_key" ON "BattleExternalPredictionVote"("predictionId", "userId");
CREATE INDEX "BattleExternalPredictionVote_userId_idx" ON "BattleExternalPredictionVote"("userId");
CREATE INDEX "Battle_battleType_idx" ON "Battle"("battleType");

ALTER TABLE "BattleExternalPredictionMarket"
ADD CONSTRAINT "BattleExternalPredictionMarket_battleId_fkey"
FOREIGN KEY ("battleId") REFERENCES "Battle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleExternalPredictionVote"
ADD CONSTRAINT "BattleExternalPredictionVote_predictionId_fkey"
FOREIGN KEY ("predictionId") REFERENCES "BattleExternalPredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BattleExternalPredictionVote"
ADD CONSTRAINT "BattleExternalPredictionVote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

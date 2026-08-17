-- Allow multiple battles to reference the same provider market.
DROP INDEX "BattleExternalPredictionMarket_provider_externalMarketId_key";

CREATE INDEX "BattleExternalPredictionMarket_provider_externalMarketId_idx"
ON "BattleExternalPredictionMarket"("provider", "externalMarketId");

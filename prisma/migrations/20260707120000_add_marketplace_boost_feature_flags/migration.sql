ALTER TABLE "MarketplaceBattleBoost"
ADD COLUMN "pinOnTop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "winnerBadge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pinStartAt" TIMESTAMP(3),
ADD COLUMN "pinEndAt" TIMESTAMP(3),
ADD COLUMN "badgeStartAt" TIMESTAMP(3),
ADD COLUMN "badgeEndAt" TIMESTAMP(3);

CREATE INDEX "MarketplaceBattleBoost_pinOnTop_pinStartAt_pinEndAt_idx"
ON "MarketplaceBattleBoost"("pinOnTop", "pinStartAt", "pinEndAt");

CREATE INDEX "MarketplaceBattleBoost_winnerBadge_badgeStartAt_badgeEndAt_idx"
ON "MarketplaceBattleBoost"("winnerBadge", "badgeStartAt", "badgeEndAt");

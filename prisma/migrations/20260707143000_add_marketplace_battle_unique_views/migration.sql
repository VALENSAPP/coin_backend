BEGIN;

CREATE TABLE "MarketplaceBattleView" (
  "id" TEXT NOT NULL,
  "battleId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketplaceBattleView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceBattleView_battleId_viewerId_key" ON "MarketplaceBattleView"("battleId", "viewerId");
CREATE INDEX "MarketplaceBattleView_battleId_idx" ON "MarketplaceBattleView"("battleId");
CREATE INDEX "MarketplaceBattleView_viewerId_idx" ON "MarketplaceBattleView"("viewerId");

ALTER TABLE "MarketplaceBattleView"
  ADD CONSTRAINT "MarketplaceBattleView_battleId_fkey"
  FOREIGN KEY ("battleId") REFERENCES "MarketplaceBattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceBattleView"
  ADD CONSTRAINT "MarketplaceBattleView_viewerId_fkey"
  FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

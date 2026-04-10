-- Add stake points tracking
ALTER TABLE "BattleParticipant" ADD COLUMN "stakeWon" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "UserBattleStats" ADD COLUMN "totalStakeWon" DOUBLE PRECISION NOT NULL DEFAULT 0;

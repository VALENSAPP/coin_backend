-- Add totalPlatformPoints to User and backfill from referPoints + totalBattlePoints
ALTER TABLE "User" ADD COLUMN "totalPlatformPoints" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "User"
SET "totalPlatformPoints" = COALESCE("referPoints", 0)
  + COALESCE((
    SELECT "totalBattlePoints"
    FROM "UserBattleStats" s
    WHERE s."userId" = "User"."id"
  ), 0);

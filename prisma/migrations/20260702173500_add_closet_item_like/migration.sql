BEGIN;

CREATE TABLE "ClosetItemLike" (
  "id" TEXT NOT NULL,
  "closetItemId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClosetItemLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClosetItemLike_closetItemId_userId_key" ON "ClosetItemLike"("closetItemId", "userId");
CREATE INDEX "ClosetItemLike_closetItemId_idx" ON "ClosetItemLike"("closetItemId");
CREATE INDEX "ClosetItemLike_userId_idx" ON "ClosetItemLike"("userId");

ALTER TABLE "ClosetItemLike"
  ADD CONSTRAINT "ClosetItemLike_closetItemId_fkey"
  FOREIGN KEY ("closetItemId") REFERENCES "closetItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClosetItemLike"
  ADD CONSTRAINT "ClosetItemLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

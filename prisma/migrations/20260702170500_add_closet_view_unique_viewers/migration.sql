BEGIN;

CREATE TABLE "ClosetView" (
  "id" TEXT NOT NULL,
  "closetId" TEXT NOT NULL,
  "viewerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClosetView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClosetView_closetId_viewerId_key" ON "ClosetView"("closetId", "viewerId");
CREATE INDEX "ClosetView_closetId_idx" ON "ClosetView"("closetId");
CREATE INDEX "ClosetView_viewerId_idx" ON "ClosetView"("viewerId");

ALTER TABLE "ClosetView"
  ADD CONSTRAINT "ClosetView_closetId_fkey"
  FOREIGN KEY ("closetId") REFERENCES "Mycloset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClosetView"
  ADD CONSTRAINT "ClosetView_viewerId_fkey"
  FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

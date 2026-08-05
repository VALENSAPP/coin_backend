CREATE TABLE "PostMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageForPhotos" TEXT,
    "messageForVideos" TEXT,
    "messageForEbooks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostMessage_userId_key" ON "PostMessage"("userId");

CREATE INDEX "PostMessage_userId_idx" ON "PostMessage"("userId");

ALTER TABLE "PostMessage" ADD CONSTRAINT "PostMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

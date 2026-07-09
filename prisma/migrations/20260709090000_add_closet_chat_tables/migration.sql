-- Create enums for closet chat if they don't exist yet
DO $$ BEGIN
    CREATE TYPE "ClosetChatThreadStatus" AS ENUM ('ACTIVE', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClosetChatMessageType" AS ENUM ('USER', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ClosetChatMessageEventType" AS ENUM ('ORDER_PLACED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClosetChatThread" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "closetId" TEXT NOT NULL,
    "status" "ClosetChatThreadStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosetChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ClosetChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ClosetChatMessageType" NOT NULL DEFAULT 'USER',
    "eventType" "ClosetChatMessageEventType",
    "isSeen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosetChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClosetChatThread_orderId_key" ON "ClosetChatThread"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatThread_buyerId_updatedAt_idx" ON "ClosetChatThread"("buyerId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatThread_sellerId_updatedAt_idx" ON "ClosetChatThread"("sellerId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatThread_closetId_idx" ON "ClosetChatThread"("closetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatThread_status_idx" ON "ClosetChatThread"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClosetChatMessage_threadId_eventType_key" ON "ClosetChatMessage"("threadId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatMessage_threadId_createdAt_idx" ON "ClosetChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatMessage_senderId_createdAt_idx" ON "ClosetChatMessage"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClosetChatMessage_receiverId_isSeen_idx" ON "ClosetChatMessage"("receiverId", "isSeen");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatThread"
    ADD CONSTRAINT "ClosetChatThread_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatThread"
    ADD CONSTRAINT "ClosetChatThread_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatThread"
    ADD CONSTRAINT "ClosetChatThread_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatMessage"
    ADD CONSTRAINT "ClosetChatMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "ClosetChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatMessage"
    ADD CONSTRAINT "ClosetChatMessage_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ClosetChatMessage"
    ADD CONSTRAINT "ClosetChatMessage_receiverId_fkey"
    FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

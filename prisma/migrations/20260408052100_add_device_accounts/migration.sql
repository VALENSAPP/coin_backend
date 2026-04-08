-- CreateTable
CREATE TABLE "DeviceAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceAccount_deviceId_idx" ON "DeviceAccount"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAccount_userId_idx" ON "DeviceAccount"("userId");

-- CreateIndex
CREATE INDEX "DeviceAccount_removedAt_idx" ON "DeviceAccount"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAccount_deviceId_userId_key" ON "DeviceAccount"("deviceId", "userId");

-- AddForeignKey
ALTER TABLE "DeviceAccount" ADD CONSTRAINT "DeviceAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

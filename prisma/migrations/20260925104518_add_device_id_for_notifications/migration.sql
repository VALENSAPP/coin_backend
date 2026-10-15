-- AlterTable
ALTER TABLE "DeviceAccount" ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "DeviceAccount_fcmToken_idx" ON "DeviceAccount"("fcmToken");

-- CreateIndex
CREATE INDEX "DeviceAccount_isActive_idx" ON "DeviceAccount"("isActive");

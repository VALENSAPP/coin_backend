-- CreateTable
CREATE TABLE "UserAddrees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "alternateNumber" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddrees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAddrees_userId_idx" ON "UserAddrees"("userId");

-- CreateIndex
CREATE INDEX "UserAddrees_isDefault_idx" ON "UserAddrees"("isDefault");

-- AddForeignKey
ALTER TABLE "UserAddrees" ADD CONSTRAINT "UserAddrees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

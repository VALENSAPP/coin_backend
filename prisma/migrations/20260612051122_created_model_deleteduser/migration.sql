-- CreateTable
CREATE TABLE "deleted_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profile" TEXT,
    "email" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deleted_users_pkey" PRIMARY KEY ("id")
);

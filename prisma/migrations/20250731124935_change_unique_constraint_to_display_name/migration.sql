/*
  Warnings:

  - A unique constraint covering the columns `[displayName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_userName_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

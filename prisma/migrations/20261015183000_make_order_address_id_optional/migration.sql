-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_addressId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "addressId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "UserAddrees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

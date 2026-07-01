-- AlterEnum
ALTER TYPE "ShippingOptions" ADD VALUE 'both';

-- DropForeignKey
ALTER TABLE "marketPlaceOrder" DROP CONSTRAINT "marketPlaceOrder_paymentId_fkey";

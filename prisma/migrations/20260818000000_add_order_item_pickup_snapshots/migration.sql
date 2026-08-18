-- Preserve the seller's agreed pickup location for local-pickup order items.
ALTER TABLE "OrderItem"
ADD COLUMN "pickupAddress" TEXT,
ADD COLUMN "pickupAvailableHours" TEXT;

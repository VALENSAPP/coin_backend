ALTER TABLE "OrderItem" ADD COLUMN "selectedShippingChoice" "CartItemShippingChoice";
ALTER TABLE "OrderItem" ADD COLUMN "selectedShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "OrderItem" oi
SET "selectedShippingChoice" = CASE
    WHEN o."shippingCost" > 0 THEN 'ship_items'::"CartItemShippingChoice"
    ELSE 'local_pick'::"CartItemShippingChoice"
END
FROM "Order" o
WHERE oi."orderId" = o."id"
  AND oi."selectedShippingChoice" IS NULL;

CREATE INDEX "OrderItem_selectedShippingChoice_idx" ON "OrderItem"("selectedShippingChoice");

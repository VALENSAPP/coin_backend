BEGIN;

CREATE TYPE "CartItemShippingChoice" AS ENUM ('ship_items', 'local_pick');

ALTER TABLE "cartItems"
  ADD COLUMN "selectedShippingChoice" "CartItemShippingChoice",
  ADD COLUMN "selectedShippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "cartItems" ci
SET
  "selectedShippingChoice" = CASE
    WHEN p."shippingOption" = 'ship_items' THEN 'ship_items'::"CartItemShippingChoice"
    WHEN p."shippingOption" = 'local_pick' THEN 'local_pick'::"CartItemShippingChoice"
    ELSE NULL
  END,
  "selectedShippingFee" = CASE
    WHEN p."shippingOption" = 'ship_items' THEN COALESCE(p."shippingFee", 0)
    ELSE 0
  END
FROM "closetItems" p
WHERE p.id = ci."productId";

COMMIT;

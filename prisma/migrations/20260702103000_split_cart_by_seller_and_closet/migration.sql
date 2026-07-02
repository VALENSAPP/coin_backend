-- Split mixed buyer cart into seller/closet scoped carts.
-- This migration is resilient to multiple legacy carts per buyer and merges them into one cart per (buyer, seller, closet).

BEGIN;

ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "sellerId" TEXT;
ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "closetId" TEXT;

-- Snapshot legacy cart items with buyer/seller/closet dimensions.
CREATE TEMP TABLE "_legacy_cart_items" AS
SELECT
  c.id AS "oldCartId",
  c."userId" AS "buyerId",
  p."userId" AS "sellerId",
  p."closetId" AS "closetId",
  ci.id AS "oldCartItemId",
  ci."productId" AS "productId",
  ci."quantity" AS "quantity",
  ci."price" AS "price",
  ci."subtotal" AS "subtotal",
  ci."createdAt" AS "createdAt"
FROM "cart" c
JOIN "cartItems" ci ON ci."cartId" = c.id
JOIN "closetItems" p ON p.id = ci."productId";

-- Build one target cart per buyer/seller/closet.
CREATE TEMP TABLE "_target_carts" AS
SELECT
  l."buyerId",
  l."sellerId",
  l."closetId",
  (
    substr(md5(l."buyerId" || ':' || l."sellerId" || ':' || l."closetId"), 1, 8) || '-' ||
    substr(md5(l."buyerId" || ':' || l."sellerId" || ':' || l."closetId"), 9, 4) || '-' ||
    substr(md5(l."buyerId" || ':' || l."sellerId" || ':' || l."closetId"), 13, 4) || '-' ||
    substr(md5(l."buyerId" || ':' || l."sellerId" || ':' || l."closetId"), 17, 4) || '-' ||
    substr(md5(l."buyerId" || ':' || l."sellerId" || ':' || l."closetId"), 21, 12)
  ) AS "newCartId",
  MIN(l."createdAt") AS "createdAt"
FROM "_legacy_cart_items" l
GROUP BY l."buyerId", l."sellerId", l."closetId";

INSERT INTO "cart" (id, "userId", "sellerId", "closetId", "createdAt", "updatedAt")
SELECT
  t."newCartId",
  t."buyerId",
  t."sellerId",
  t."closetId",
  t."createdAt",
  NOW()
FROM "_target_carts" t;

-- Remove legacy cart items first (to avoid unique collisions on cartId+productId when we merge duplicates).
DELETE FROM "cartItems"
WHERE "cartId" IN (SELECT DISTINCT "oldCartId" FROM "_legacy_cart_items");

-- Recreate merged cart items under target carts.
INSERT INTO "cartItems" (id, "cartId", "productId", "quantity", "price", "subtotal", "createdAt", "updatedAt")
SELECT
  (
    substr(md5(t."newCartId" || ':' || l."productId"), 1, 8) || '-' ||
    substr(md5(t."newCartId" || ':' || l."productId"), 9, 4) || '-' ||
    substr(md5(t."newCartId" || ':' || l."productId"), 13, 4) || '-' ||
    substr(md5(t."newCartId" || ':' || l."productId"), 17, 4) || '-' ||
    substr(md5(t."newCartId" || ':' || l."productId"), 21, 12)
  ) AS id,
  t."newCartId" AS "cartId",
  l."productId",
  SUM(l."quantity")::INTEGER AS "quantity",
  MAX(l."price") AS "price",
  SUM(l."subtotal") AS "subtotal",
  MIN(l."createdAt") AS "createdAt",
  NOW() AS "updatedAt"
FROM "_legacy_cart_items" l
JOIN "_target_carts" t
  ON t."buyerId" = l."buyerId"
 AND t."sellerId" = l."sellerId"
 AND t."closetId" = l."closetId"
GROUP BY t."newCartId", l."productId";

-- Drop legacy cart rows that do not have seller/closet metadata.
DELETE FROM "cart"
WHERE "sellerId" IS NULL OR "closetId" IS NULL;

ALTER TABLE "cart" ALTER COLUMN "sellerId" SET NOT NULL;
ALTER TABLE "cart" ALTER COLUMN "closetId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "cart_sellerId_idx" ON "cart"("sellerId");
CREATE INDEX IF NOT EXISTS "cart_closetId_idx" ON "cart"("closetId");
CREATE UNIQUE INDEX IF NOT EXISTS "cart_userId_sellerId_closetId_key" ON "cart"("userId", "sellerId", "closetId");

COMMIT;

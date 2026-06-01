ALTER TABLE "Payment"
ADD COLUMN "platformFee" INTEGER,
ADD COLUMN "totalAmount" INTEGER;

UPDATE "Payment"
SET
  "totalAmount" = "amount",
  "platformFee" = ROUND("amount" * 0.20)::INTEGER,
  "amount" = "amount" - ROUND("amount" * 0.20)::INTEGER
WHERE "forPayment" = 'following'
  AND "totalAmount" IS NULL;

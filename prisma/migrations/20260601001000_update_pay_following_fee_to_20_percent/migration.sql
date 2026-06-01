UPDATE "Payment"
SET
  "platformFee" = ROUND(COALESCE("totalAmount", "amount") * 0.20)::INTEGER,
  "amount" = COALESCE("totalAmount", "amount") - ROUND(COALESCE("totalAmount", "amount") * 0.20)::INTEGER,
  "totalAmount" = COALESCE("totalAmount", "amount")
WHERE "forPayment" = 'following';

ALTER TABLE "DonationData"
ADD COLUMN "totalAmount" DOUBLE PRECISION,
ADD COLUMN "platformFees" DOUBLE PRECISION;

UPDATE "DonationData"
SET
  "totalAmount" = "amount",
  "platformFees" = ROUND(("amount" * 0.05)::numeric, 2)::double precision,
  "amount" = ROUND(("amount" * 0.95)::numeric, 2)::double precision
WHERE "action" = 'missionDonation'
  AND "totalAmount" IS NULL;

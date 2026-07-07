-- Add battle audience controls and share preference for direct battle creation flow.
ALTER TABLE "MarketplaceBattle"
ADD COLUMN "visibility" "WhoCanBuy" NOT NULL DEFAULT 'Everyone',
ADD COLUMN "whoCanVote" "WhoCanBuy" NOT NULL DEFAULT 'Everyone',
ADD COLUMN "shareToFeed" BOOLEAN NOT NULL DEFAULT false;

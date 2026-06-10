-- Add reel video text overlay metadata fields
ALTER TABLE "Post"
ADD COLUMN "videoText" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "videoTextItems" JSONB;

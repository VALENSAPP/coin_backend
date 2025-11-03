-- AlterTable: ensure media is NOT NULL to match current schema
ALTER TABLE "Story" ALTER COLUMN "media" SET NOT NULL;

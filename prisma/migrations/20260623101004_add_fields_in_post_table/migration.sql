-- AlterEnum
ALTER TYPE "format" ADD VALUE 'ebook';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "allowDownload" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ebookpdf" TEXT,
ADD COLUMN     "tableContent" TEXT[];

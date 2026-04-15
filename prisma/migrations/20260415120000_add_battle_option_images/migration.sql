-- AlterTable
ALTER TABLE "Battle" ADD COLUMN     "optionImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

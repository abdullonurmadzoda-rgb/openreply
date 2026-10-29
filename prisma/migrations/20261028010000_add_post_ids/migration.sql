-- AlterTable
ALTER TABLE "Automation" ADD COLUMN "postIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
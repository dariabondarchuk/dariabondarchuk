-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN "additionalFiles" JSONB NOT NULL DEFAULT '[]';

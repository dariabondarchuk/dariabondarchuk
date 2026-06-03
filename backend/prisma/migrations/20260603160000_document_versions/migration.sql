ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "GeneratedDocument" SET "isCurrent" = true, "version" = 1 WHERE "version" IS NULL OR "version" = 0;

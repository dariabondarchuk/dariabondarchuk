-- AlterEnum
ALTER TYPE "ProcessStatus" ADD VALUE 'NEED_CHECK';
ALTER TYPE "ProcessStatus" ADD VALUE 'VERIFIED';

-- AlterTable
ALTER TABLE "Process" ADD COLUMN "anketaType" TEXT;

-- CreateTable
CREATE TABLE "AnketaInvite" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "anketaType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "comment" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "processId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnketaInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnketaInvite_token_key" ON "AnketaInvite"("token");

ALTER TABLE "AnketaInvite" ADD CONSTRAINT "AnketaInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnketaInvite" ADD CONSTRAINT "AnketaInvite_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE SET NULL ON UPDATE CASCADE;

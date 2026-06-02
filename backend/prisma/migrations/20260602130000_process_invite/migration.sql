-- CreateTable ProcessInvite
CREATE TABLE "ProcessInvite" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "comment" TEXT,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProcessInvite_token_key" ON "ProcessInvite"("token");

ALTER TABLE "ProcessInvite" ADD CONSTRAINT "ProcessInvite_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

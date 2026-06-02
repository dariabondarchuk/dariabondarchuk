-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DPO', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('NOT_SENT', 'SENT', 'FILLING', 'REVIEW', 'ACCEPTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('NOT_FILLED', 'FILLING', 'FILLED');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('SUBJECT', 'RKN');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RknStatus" AS ENUM ('SUBMITTED', 'NOT_SUBMITTED', 'NEEDS_UPDATE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "inn" TEXT NOT NULL,
    "ogrn" TEXT,
    "okved" TEXT,
    "activityType" TEXT,
    "ceoName" TEXT,
    "ceoPosition" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "legalAddress" TEXT,
    "postalAddress" TEXT,
    "city" TEXT,
    "pdStartDate" TIMESTAMP(3),
    "isOperator" BOOLEAN NOT NULL DEFAULT false,
    "hasCrossBorder" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "offices" JSONB NOT NULL DEFAULT '[]',
    "sites" JSONB NOT NULL DEFAULT '[]',
    "apps" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyResponsible" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'organizer',
    "fio" TEXT,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isSecurity" BOOLEAN NOT NULL DEFAULT false,
    "controlsCompliance" BOOLEAN NOT NULL DEFAULT false,
    "informsEmployees" BOOLEAN NOT NULL DEFAULT false,
    "handlesRequests" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CompanyResponsible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "ProcessStatus" NOT NULL DEFAULT 'NOT_SENT',
    "sentTo" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessSection" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "sectionNumber" INTEGER NOT NULL,
    "sectionName" TEXT NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'NOT_FILLED',
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ProcessSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RknNotification" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "status" "RknStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "submitDate" TIMESTAMP(3),
    "changeDate" TIMESTAMP(3),

    CONSTRAINT "RknNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RknDocument" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RknDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "type" "JournalType" NOT NULL,
    "dateIn" TIMESTAMP(3) NOT NULL,
    "dateOut" TIMESTAMP(3),
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentFile" TEXT,
    "answer" TEXT,
    "answerFile" TEXT,
    "status" "JournalStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorEvent" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MonitorEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_inn_key" ON "Company"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessSection_processId_sectionNumber_key" ON "ProcessSection"("processId", "sectionNumber");

-- AddForeignKey
ALTER TABLE "CompanyResponsible" ADD CONSTRAINT "CompanyResponsible_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessSection" ADD CONSTRAINT "ProcessSection_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RknNotification" ADD CONSTRAINT "RknNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RknDocument" ADD CONSTRAINT "RknDocument_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "RknNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorEvent" ADD CONSTRAINT "MonitorEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

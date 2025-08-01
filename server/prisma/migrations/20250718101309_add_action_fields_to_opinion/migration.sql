-- AlterTable
ALTER TABLE "opinions" ADD COLUMN "actionLogs" TEXT;
ALTER TABLE "opinions" ADD COLUMN "actionStatus" TEXT DEFAULT 'unhandled';
ALTER TABLE "opinions" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "opinions" ADD COLUMN "priorityLevel" TEXT;
ALTER TABLE "opinions" ADD COLUMN "priorityReason" TEXT;
ALTER TABLE "opinions" ADD COLUMN "priorityUpdatedAt" DATETIME;

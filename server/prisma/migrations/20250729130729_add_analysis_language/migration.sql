/*
  Warnings:

  - You are about to drop the column `planType` on the `users` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "userAgent" TEXT,
    "browserInfo" TEXT,
    "userPlan" TEXT,
    "projectCount" INTEGER,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "purpose" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "language" TEXT DEFAULT 'ja',
    "analysisLanguage" TEXT,
    "purposeSkipped" BOOLEAN DEFAULT false,
    "avatar" TEXT,
    "trialStartDate" DATETIME,
    "trialEndDate" DATETIME,
    "subscriptionStatus" TEXT DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletionRequestedAt" DATETIME,
    "scheduledDeletionAt" DATETIME,
    "deletionReason" TEXT,
    "deletionCancelledAt" DATETIME
);
INSERT INTO "new_users" ("avatar", "createdAt", "deletionCancelledAt", "deletionReason", "deletionRequestedAt", "email", "id", "isDeleted", "language", "name", "purpose", "purposeSkipped", "scheduledDeletionAt", "stripeCustomerId", "subscriptionStatus", "trialEndDate", "trialStartDate", "updatedAt") SELECT "avatar", "createdAt", "deletionCancelledAt", "deletionReason", "deletionRequestedAt", "email", "id", "isDeleted", "language", "name", "purpose", "purposeSkipped", "scheduledDeletionAt", "stripeCustomerId", "subscriptionStatus", "trialEndDate", "trialStartDate", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "idx_users_trial_end_date" ON "users"("trialEndDate");
CREATE INDEX "idx_users_subscription_status" ON "users"("subscriptionStatus");
CREATE INDEX "idx_users_is_deleted" ON "users"("isDeleted");
CREATE INDEX "idx_users_scheduled_deletion" ON "users"("scheduledDeletionAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "contacts_userId_createdAt_idx" ON "contacts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "contacts_category_status_idx" ON "contacts"("category", "status");

-- CreateIndex
CREATE INDEX "contacts_status_priority_idx" ON "contacts"("status", "priority");

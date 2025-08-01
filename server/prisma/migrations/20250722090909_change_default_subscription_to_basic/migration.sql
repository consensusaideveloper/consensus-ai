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
    "purposeSkipped" BOOLEAN DEFAULT false,
    "avatar" TEXT,
    "trialStartDate" DATETIME,
    "trialEndDate" DATETIME,
    "subscriptionStatus" TEXT DEFAULT 'basic',
    "planType" TEXT DEFAULT 'basic',
    "stripeCustomerId" TEXT
);
INSERT INTO "new_users" ("avatar", "createdAt", "email", "id", "language", "name", "planType", "purpose", "purposeSkipped", "stripeCustomerId", "subscriptionStatus", "trialEndDate", "trialStartDate", "updatedAt") SELECT "avatar", "createdAt", "email", "id", "language", "name", "planType", "purpose", "purposeSkipped", "stripeCustomerId", "subscriptionStatus", "trialEndDate", "trialStartDate", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "idx_users_plan_type" ON "users"("planType");
CREATE INDEX "idx_users_trial_end_date" ON "users"("trialEndDate");
CREATE INDEX "idx_users_subscription_status" ON "users"("subscriptionStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

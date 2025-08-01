-- CreateTable
CREATE TABLE "user_plan_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fromPlan" TEXT,
    "toPlan" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeReason" TEXT,
    "stripeEventId" TEXT,
    "metadata" TEXT,
    "effectiveDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    CONSTRAINT "user_plan_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_plan_history_userId_effectiveDate_idx" ON "user_plan_history"("userId", "effectiveDate");

-- CreateIndex
CREATE INDEX "user_plan_history_changeType_createdAt_idx" ON "user_plan_history"("changeType", "createdAt");

-- CreateIndex
CREATE INDEX "user_plan_history_userId_changeType_idx" ON "user_plan_history"("userId", "changeType");
-- CreateTable
CREATE TABLE "user_feedback_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userHashId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL DEFAULT 'account_deletion',
    "deletionReason" TEXT,
    "customReason" TEXT,
    "userContext" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_feedback_logs_feedbackType_createdAt_idx" ON "user_feedback_logs"("feedbackType", "createdAt");

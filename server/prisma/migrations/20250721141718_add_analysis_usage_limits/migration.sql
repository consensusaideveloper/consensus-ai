-- CreateTable
CREATE TABLE "analysis_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analysisType" TEXT NOT NULL,
    "opinionsProcessed" INTEGER NOT NULL,
    "executionTime" INTEGER,
    CONSTRAINT "analysis_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "analysis_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "analysis_usage_userId_executedAt_idx" ON "analysis_usage"("userId", "executedAt");

-- CreateIndex
CREATE INDEX "analysis_usage_projectId_executedAt_idx" ON "analysis_usage"("projectId", "executedAt");

-- CreateIndex
CREATE INDEX "analysis_usage_userId_projectId_executedAt_idx" ON "analysis_usage"("userId", "projectId", "executedAt");

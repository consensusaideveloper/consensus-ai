-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "purpose" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "language" TEXT DEFAULT 'ja',
    "purposeSkipped" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "collectionMethod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "opinionsCount" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "priorityLevel" TEXT,
    "priorityReason" TEXT,
    "priorityUpdatedAt" DATETIME,
    "slackChannel" TEXT,
    "webformUrl" TEXT,
    "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "lastAnalysisAt" DATETIME,
    "lastAnalyzedOpinionsCount" INTEGER,
    "analyzedOpinionsCount" INTEGER NOT NULL DEFAULT 0,
    "pendingOpinionsCount" INTEGER NOT NULL DEFAULT 0,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opinions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "sentiment" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "characterCount" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "topicId" TEXT,
    "firebaseId" TEXT,
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT DEFAULT 'pending',
    "metadata" TEXT,
    "analysisStatus" TEXT NOT NULL DEFAULT 'unanalyzed',
    "analyzedAt" DATETIME,
    "analysisVersion" INTEGER,
    CONSTRAINT "opinions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opinions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNHANDLED',
    "priorityLevel" TEXT,
    "priorityReason" TEXT,
    "priorityUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "hasActiveActions" BOOLEAN NOT NULL DEFAULT false,
    "lastActionDate" DATETIME,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "topics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNHANDLED',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "insights_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_management" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "actionStatus" TEXT NOT NULL DEFAULT 'unhandled',
    "priorityLevel" TEXT,
    "priorityReason" TEXT,
    "priorityUpdatedAt" DATETIME,
    "dueDate" DATETIME,
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "action_management_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_dependencies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dependsOnActionId" TEXT NOT NULL,
    "dependsOnResponseId" TEXT NOT NULL,
    "dependsOnDescription" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "actionId" TEXT NOT NULL,
    CONSTRAINT "action_dependencies_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "action_management" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "actionId" TEXT NOT NULL,
    CONSTRAINT "action_logs_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "action_management" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opinion_analysis_state" (
    "opinionId" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "lastAnalyzedAt" DATETIME,
    "analysisVersion" INTEGER NOT NULL DEFAULT 1,
    "topicId" TEXT,
    "classificationConfidence" DECIMAL,
    "manualReviewFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    CONSTRAINT "opinion_analysis_state_opinionId_fkey" FOREIGN KEY ("opinionId") REFERENCES "opinions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "opinionsProcessed" INTEGER NOT NULL,
    "newTopicsCreated" INTEGER NOT NULL DEFAULT 0,
    "updatedTopics" INTEGER NOT NULL DEFAULT 0,
    "executionTimeSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "executedBy" TEXT,
    "executionReason" TEXT,
    CONSTRAINT "analysis_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis_checkpoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "projectId" TEXT,
    "data" TEXT NOT NULL,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT NOT NULL,
    "stage" TEXT,
    "progress" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "analysis_checkpoints_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opinion_stance_analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opinionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "confidence" DECIMAL NOT NULL DEFAULT 0.0,
    "reasoning" TEXT,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firebaseId" TEXT,
    "syncStatus" TEXT DEFAULT 'pending',
    "lastSyncAt" DATETIME,
    "detailedStance" TEXT,
    "sentiment" TEXT,
    "constructiveness" TEXT,
    "emotionalTone" TEXT,
    CONSTRAINT "opinion_stance_analysis_opinionId_fkey" FOREIGN KEY ("opinionId") REFERENCES "opinions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "opinion_stance_analysis_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "opinions_projectId_analysisStatus_idx" ON "opinions"("projectId", "analysisStatus");

-- CreateIndex
CREATE INDEX "opinions_projectId_analyzedAt_idx" ON "opinions"("projectId", "analyzedAt");

-- CreateIndex
CREATE INDEX "opinion_analysis_state_projectId_lastAnalyzedAt_idx" ON "opinion_analysis_state"("projectId", "lastAnalyzedAt");

-- CreateIndex
CREATE INDEX "opinion_analysis_state_projectId_syncStatus_idx" ON "opinion_analysis_state"("projectId", "syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_checkpoints_key_key" ON "analysis_checkpoints"("key");

-- CreateIndex
CREATE INDEX "opinion_stance_analysis_topicId_stance_idx" ON "opinion_stance_analysis"("topicId", "stance");

-- CreateIndex
CREATE INDEX "opinion_stance_analysis_opinionId_analyzedAt_idx" ON "opinion_stance_analysis"("opinionId", "analyzedAt");

-- CreateIndex
CREATE INDEX "opinion_stance_analysis_topicId_detailedStance_idx" ON "opinion_stance_analysis"("topicId", "detailedStance");

-- CreateIndex
CREATE UNIQUE INDEX "opinion_stance_analysis_opinionId_topicId_key" ON "opinion_stance_analysis"("opinionId", "topicId");

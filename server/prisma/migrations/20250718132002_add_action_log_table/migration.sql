-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opinionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "action_logs_opinionId_fkey" FOREIGN KEY ("opinionId") REFERENCES "opinions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "action_logs_opinionId_createdAt_idx" ON "action_logs"("opinionId", "createdAt");

-- CreateIndex
CREATE INDEX "action_logs_opinionId_type_idx" ON "action_logs"("opinionId", "type");

/*
  Warnings:

  - You are about to drop the `action_dependencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `action_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `action_management` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "action_dependencies";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "action_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "action_management";
PRAGMA foreign_keys=on;
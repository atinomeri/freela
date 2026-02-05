PRAGMA foreign_keys=off;

CREATE TABLE "new_Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "budgetGEL" INTEGER,
  "tags" JSON,
  "isOpen" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Project_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Project" ("id", "employerId", "title", "description", "city", "budgetGEL", "tags", "isOpen", "createdAt", "updatedAt")
SELECT
  "id",
  "clientId",
  "title",
  COALESCE("details", "summary", ""),
  "city",
  NULL,
  "tags",
  "isOpen",
  "createdAt",
  "updatedAt"
FROM "Project";

DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";

CREATE INDEX "Project_employerId_idx" ON "Project"("employerId");
CREATE INDEX "Project_city_idx" ON "Project"("city");

PRAGMA foreign_keys=on;

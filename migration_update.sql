-- AlterTable
ALTER TABLE "LinkedAccount" ADD COLUMN "pendingVerificationToken" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "collegeId" TEXT,
    "departmentId" TEXT,
    "courseId" TEXT,
    "academicYear" INTEGER,
    "batch" TEXT,
    "graduationYear" INTEGER,
    "codingInterests" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "showInDirectory" BOOLEAN NOT NULL DEFAULT true,
    "showRatings" BOOLEAN NOT NULL DEFAULT true,
    "showPlatforms" BOOLEAN NOT NULL DEFAULT true,
    "showEmail" BOOLEAN NOT NULL DEFAULT false,
    "campusScore" REAL NOT NULL DEFAULT 0,
    "campusClass" TEXT NOT NULL DEFAULT 'C',
    "scoreBreakdown" TEXT,
    "scoreComputedAt" DATETIME,
    "activityLevel" TEXT NOT NULL DEFAULT 'NEW',
    "lastActiveAt" DATETIME,
    "activeStreak" INTEGER NOT NULL DEFAULT 0,
    "siteActivityPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("academicYear", "activeStreak", "activityLevel", "avatarUrl", "batch", "bio", "campusClass", "campusScore", "codingInterests", "collegeId", "courseId", "createdAt", "departmentId", "displayName", "email", "graduationYear", "id", "isPublic", "lastActiveAt", "passwordHash", "role", "scoreBreakdown", "scoreComputedAt", "showEmail", "showInDirectory", "showPlatforms", "showRatings", "timezone", "updatedAt") SELECT "academicYear", "activeStreak", "activityLevel", "avatarUrl", "batch", "bio", "campusClass", "campusScore", "codingInterests", "collegeId", "courseId", "createdAt", "departmentId", "displayName", "email", "graduationYear", "id", "isPublic", "lastActiveAt", "passwordHash", "role", "scoreBreakdown", "scoreComputedAt", "showEmail", "showInDirectory", "showPlatforms", "showRatings", "timezone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_collegeId_idx" ON "User"("collegeId");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "User_courseId_idx" ON "User"("courseId");
CREATE INDEX "User_batch_idx" ON "User"("batch");
CREATE INDEX "User_academicYear_idx" ON "User"("academicYear");
CREATE INDEX "User_campusScore_idx" ON "User"("campusScore");
CREATE INDEX "User_showInDirectory_idx" ON "User"("showInDirectory");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "RatingHistory_userId_platform_externalId_key" ON "RatingHistory"("userId", "platform", "externalId");


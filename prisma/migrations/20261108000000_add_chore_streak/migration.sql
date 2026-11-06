-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "choreStreakAsOf" TIMESTAMP(3),
ADD COLUMN     "choreStreakBest" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "choreStreakCurrent" INTEGER NOT NULL DEFAULT 0;

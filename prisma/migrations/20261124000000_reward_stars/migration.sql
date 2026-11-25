-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "stars" INTEGER;

-- AlterTable
ALTER TABLE "HabitLog" ADD COLUMN     "stars" INTEGER;

-- CreateTable
CREATE TABLE "RewardSettings" (
    "id" TEXT NOT NULL DEFAULT 'household',
    "lateStars" TEXT NOT NULL DEFAULT 'full',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "RewardSettings_pkey" PRIMARY KEY ("id")
);

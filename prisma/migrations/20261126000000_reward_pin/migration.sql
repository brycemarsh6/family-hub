-- AlterTable
ALTER TABLE "RewardSettings" ADD COLUMN     "pinFailCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinRequired" BOOLEAN NOT NULL DEFAULT true;

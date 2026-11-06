-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "paceDays" TEXT,
ADD COLUMN     "track" TEXT NOT NULL DEFAULT 'checks',
ADD COLUMN     "weeklyMinutes" INTEGER;

-- CreateTable
CREATE TABLE "HabitTimeEntry" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HabitTimeEntry_habitId_userId_day_idx" ON "HabitTimeEntry"("habitId", "userId", "day");

-- CreateIndex
CREATE INDEX "HabitTimeEntry_userId_day_idx" ON "HabitTimeEntry"("userId", "day");

-- AddForeignKey
ALTER TABLE "HabitTimeEntry" ADD CONSTRAINT "HabitTimeEntry_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitTimeEntry" ADD CONSTRAINT "HabitTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitTimeEntry" ADD CONSTRAINT "HabitTimeEntry_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

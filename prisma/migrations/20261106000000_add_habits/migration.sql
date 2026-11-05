-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "showStreaks" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PlanItem" ADD COLUMN     "habitId" TEXT;

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'habit',
    "mode" TEXT NOT NULL DEFAULT 'build',
    "icon" TEXT,
    "lifeArea" TEXT,
    "timeOfDay" TEXT,
    "schedule" TEXT NOT NULL,
    "weekdays" TEXT,
    "times" INTEGER,
    "anchorWeek" TIMESTAMP(3),
    "carryOver" BOOLEAN NOT NULL DEFAULT false,
    "sharing" TEXT NOT NULL DEFAULT 'each',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitParticipant" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "streakAsOf" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'done',
    "loggedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitPlannedDay" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitPlannedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreWeekOverride" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "fromWeekday" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "toWeekday" INTEGER,

    CONSTRAINT "ChoreWeekOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDay" TIMESTAMP(3) NOT NULL,
    "endDay" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nudge" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_archivedAt_idx" ON "Habit"("archivedAt");

-- CreateIndex
CREATE INDEX "HabitParticipant_userId_idx" ON "HabitParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitParticipant_habitId_userId_key" ON "HabitParticipant"("habitId", "userId");

-- CreateIndex
CREATE INDEX "HabitLog_userId_day_idx" ON "HabitLog"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_userId_day_key" ON "HabitLog"("habitId", "userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "HabitPlannedDay_habitId_userId_day_key" ON "HabitPlannedDay"("habitId", "userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreWeekOverride_habitId_weekStart_fromWeekday_key" ON "ChoreWeekOverride"("habitId", "weekStart", "fromWeekday");

-- CreateIndex
CREATE INDEX "VacationPeriod_userId_startDay_idx" ON "VacationPeriod"("userId", "startDay");

-- CreateIndex
CREATE INDEX "Nudge_toUserId_day_idx" ON "Nudge"("toUserId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "Nudge_habitId_fromUserId_toUserId_day_key" ON "Nudge"("habitId", "fromUserId", "toUserId", "day");

-- CreateIndex
CREATE INDEX "PlanItem_habitId_idx" ON "PlanItem"("habitId");

-- AddForeignKey
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitParticipant" ADD CONSTRAINT "HabitParticipant_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitParticipant" ADD CONSTRAINT "HabitParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitPlannedDay" ADD CONSTRAINT "HabitPlannedDay_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitPlannedDay" ADD CONSTRAINT "HabitPlannedDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreWeekOverride" ADD CONSTRAINT "ChoreWeekOverride_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationPeriod" ADD CONSTRAINT "VacationPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Backfill (mission 30, Habits & Chores PR A): every Plans & Goals habit item
-- becomes a Habit, so the move to the new tables loses nothing. Values only:
-- nothing is dropped, renamed or retyped, and PlanLog plus PlanItem's
-- timesPerPeriod/period stay, unread, so the previous deployment keeps
-- serving while this runs (STRUCTURE.md's value-only correction exception).
-- Every statement is safe to run twice: INSERTs end in ON CONFLICT DO NOTHING
-- and the UPDATE only touches rows whose "habitId" is still NULL.
-- Ids are deterministic text built in SQL, not cuid(): 'h_' || PlanItem id,
-- 'hp_' || habit || '_' || user, 'hl_' || habit || '_' || user || '_' || day.
-- That is what lets ON CONFLICT ("id") make a re-run a no-op (the same
-- pattern as 'ci_' || id in the GoalCheckIn migration).

-- 1. One Habit per habit plan item. day -> daily (times stays null),
-- week -> weekly (1..7), month -> monthly (1..31); GREATEST(..., 1) keeps a
-- zero or null count from sneaking in. "Together" goals (no owner) share one
-- check across everyone; "Mine" goals are each person's own.
INSERT INTO "Habit" ("id", "title", "kind", "mode", "lifeArea", "schedule", "times", "sharing", "isPrivate", "createdById", "createdAt", "updatedAt")
SELECT
  'h_' || p."id",
  p."title",
  'habit',
  'build',
  g."area",
  CASE p."period" WHEN 'week' THEN 'weekly' WHEN 'month' THEN 'monthly' ELSE 'daily' END,
  CASE p."period"
    WHEN 'week' THEN LEAST(GREATEST(COALESCE(p."timesPerPeriod", 1), 1), 7)
    WHEN 'month' THEN LEAST(GREATEST(COALESCE(p."timesPerPeriod", 1), 1), 31)
    ELSE NULL
  END,
  CASE WHEN g."ownerId" IS NULL THEN 'together' ELSE 'each' END,
  (g."visibility" = 'private'),
  g."createdById",
  p."createdAt",
  p."updatedAt"
FROM "PlanItem" p
JOIN "Goal" g ON g."id" = p."goalId"
WHERE p."kind" = 'habit'
ON CONFLICT ("id") DO NOTHING;

-- 2. Participants: a Mine goal's habit gets its owner; a Together goal's habit
-- gets every active person (not deactivated, not the tablet login).
INSERT INTO "HabitParticipant" ("id", "habitId", "userId")
SELECT 'hp_' || 'h_' || p."id" || '_' || u."id", 'h_' || p."id", u."id"
FROM "PlanItem" p
JOIN "Goal" g ON g."id" = p."goalId"
JOIN "Habit" h ON h."id" = 'h_' || p."id"
JOIN "User" u ON u."id" = g."ownerId"
  OR (g."ownerId" IS NULL AND u."deactivatedAt" IS NULL AND u."role" <> 'device')
WHERE p."kind" = 'habit'
ON CONFLICT ("id") DO NOTHING;

-- 3. Checks: several taps on one day collapse to one 'done' row (decision 69);
-- the earliest tap keeps its createdAt and loggedById. Each day then fans out
-- to every participant of that habit.
INSERT INTO "HabitLog" ("id", "habitId", "userId", "day", "status", "loggedById", "createdAt")
SELECT
  'hl_' || hp."habitId" || '_' || hp."userId" || '_' || to_char(t."day", 'YYYYMMDD'),
  hp."habitId", hp."userId", t."day", 'done', t."loggedById", t."createdAt"
FROM (
  SELECT DISTINCT ON (l."planItemId", l."day") l."planItemId", l."day", l."loggedById", l."createdAt"
  FROM "PlanLog" l
  ORDER BY l."planItemId", l."day", l."createdAt", l."id"
) t
JOIN "HabitParticipant" hp ON hp."habitId" = 'h_' || t."planItemId"
ON CONFLICT ("id") DO NOTHING;

-- 4. Point each habit plan item at its Habit (a value-only change to the new
-- column), only where the Habit row exists and the link is not set yet.
UPDATE "PlanItem" SET "habitId" = 'h_' || "id"
WHERE "kind" = 'habit'
  AND "habitId" IS NULL
  AND EXISTS (SELECT 1 FROM "Habit" h WHERE h."id" = 'h_' || "PlanItem"."id");

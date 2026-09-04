-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "rrule" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPerson" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "TaskPerson_userId_idx" ON "TaskPerson"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPerson_taskId_userId_key" ON "TaskPerson"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPerson" ADD CONSTRAINT "TaskPerson_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPerson" ADD CONSTRAINT "TaskPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data fix, not additive: re-store existing all-day CalendarEvent rows at
-- UTC midnight. All-day events were originally stored as *local*-midnight
-- instants (America/Denver, this household's timezone), which renders a
-- day early once the device reading them back is west of Mountain (e.g.
-- California). This UPDATE is scoped strictly to allDay = true and is
-- deliberately guarded to be idempotent: the naive expression
-- (converting stored-as-local-midnight back through America/Denver) is
-- NOT idempotent on its own — proven read-only against the dev branch,
-- running it twice shifted a fixed row back a second day. The WHERE
-- clause below is what makes a second run a no-op, and it additionally
-- protects any row already correctly stored at UTC midnight (including
-- one created east of Mountain, which the naive expression would shift
-- the wrong way) or already fixed on a database that received this
-- migration before. See mission-13's "The migration hazard Fury measured
-- before contracting" for the read-only proof.
UPDATE "CalendarEvent"
SET "startAt" = ((("startAt" AT TIME ZONE 'America/Denver')::date)::timestamp AT TIME ZONE 'UTC'),
    "endAt"   = ((("endAt"   AT TIME ZONE 'America/Denver')::date)::timestamp AT TIME ZONE 'UTC')
WHERE "allDay" = true
  AND (("startAt" AT TIME ZONE 'UTC')::time <> '00:00:00'
    OR ("endAt"   AT TIME ZONE 'UTC')::time <> '00:00:00');

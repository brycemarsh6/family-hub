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
--
-- Both the WHERE guard and the SET below must be SESSION-TIMEZONE
-- INDEPENDENT: this statement can run under a `psql`/Prisma session whose
-- TimeZone GUC is anything at all (Neon's own default is 'GMT', but a
-- developer's local `psql` or a differently configured client is not
-- guaranteed to match), and the guard/SET must produce the identical
-- result regardless. "startAt"/"endAt" are TIMESTAMP(3) — naive, no zone
-- attached — so `"startAt"::time` reads the stored clock digits literally
-- and is session-independent by construction. The *first-shipped* version
-- of this migration got this wrong in both places, and both were verified
-- broken by direct measurement (mission-13/C6, temp-table UPDATEs under
-- SET LOCAL TimeZone, never against real rows) before being corrected:
--   - The guard used `("startAt" AT TIME ZONE 'UTC')::time`. `naive AT
--     TIME ZONE 'UTC'` produces a *timestamptz*, and casting a timestamptz
--     to `::time` (with no explicit zone) reads the session's TimeZone —
--     so the guard fired/skipped exactly backwards under an
--     America/Denver session versus a UTC one.
--   - The SET used `(("col" AT TIME ZONE 'America/Denver')::date)::timestamp
--     AT TIME ZONE 'UTC'`. The middle `::date` cast reduces a timestamptz
--     to a session-local calendar date (session-dependent), and the final
--     `AT TIME ZONE 'UTC'` produces a timestamptz that is then implicitly
--     cast back down to the naive column type on write — also
--     session-dependent. Measured effect: applied under an
--     America/Denver session, this SET took an already-correct
--     `2026-09-03 00:00:00` row and rewrote it to `2026-09-02 18:00:00` —
--     a genuine day-and-six-hour corruption, not a no-op.
-- The corrected SET below instead converts through two *explicit*-zone
-- `AT TIME ZONE` steps only (naive → timestamptz via 'UTC', then that
-- timestamptz → naive via 'America/Denver'), each of which is
-- session-independent because the zone is always named rather than
-- implied — the `::date`/`::timestamp` casts on either side operate on
-- values that are already naive, so no ambient session zone is ever
-- consulted. Verified byte-identical under UTC, America/Denver, and
-- America/Los_Angeles sessions, both on first application and on a
-- second (idempotency) pass.
UPDATE "CalendarEvent"
SET "startAt" = (((("startAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Denver')::date)::timestamp),
    "endAt"   = (((("endAt"   AT TIME ZONE 'UTC') AT TIME ZONE 'America/Denver')::date)::timestamp)
WHERE "allDay" = true
  AND ("startAt"::time <> '00:00:00'
    OR "endAt"::time <> '00:00:00');

# Mission 37: Habits & Chores, the weekly hours tracker

**Project:** family-hub (Marshee)
**Status:** BUILDING (C1)
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/habits-hours` (from `origin/main` at `af1708c`)

## Brief

- **Goal:** a new way to track a habit. Today a habit is one check per
  person per day. An **hours** habit instead logs time toward a weekly
  goal (Bryce's example: calling 10 hours a week, focused follow-up 6
  hours a week). Missing a day never counts against you; only the week's
  total matters. Bryce asked for it on 2026-11-06 and approved the mock
  (https://claude.ai/artifact/WmHKRQfNcvJ4sBEkQ1dYtk) with "Yes, build it".
- **Done means:**
  1. New and Edit habit offer **Track: Checks | Hours**. Hours shows an
     "Hours a week" stepper and a "Count days left as" choice (Mon to Sat,
     or Every day).
  2. On Today, an hours habit shows "X of Y hours this week", a bar, and
     "N hours left · about M a day" (left divided by the counted days left
     in the Sunday to Saturday week, today included). A + button (not the
     round check) opens a sheet: −/+ in 30-minute steps, chips 30 min /
     1 hour / 2 hours, day chips Today / Yesterday / Other day, and an
     "Add" button. When the week's total reaches the target the row reads
     done.
  3. The habit's stats page shows this week's hours by day, the weeks-hit
     streak (weeks in a row the target was reached), recent weeks' totals,
     and lets you remove an entry (undo).
  4. The dashboard Habits tile shows the same bar and "N hours left".
  5. Hours habits are private by default (only the people on it see it).
  6. Every other habits screen (Report, Whole family, Pick a day, Calendar,
     Recompute streaks, goal plans, nudges, confetti) either handles an
     hours habit correctly or leaves it out on purpose, never shows it
     wrong.
  7. The Gauntlet passes, with tests for the new pure rules.
- **Out of scope:** minutes-per-day goals, monthly totals, hours chores,
  hours for Together (one shared total), timers, typing a number,
  texting reminders. Converting Bryce's two stand-in weekly habits is done
  by Bryce in Edit after this ships, not by a script.

## Bryce's answers (2026-11-06, from the mock's five questions)

1. 30-minute steps on −/+, plus 30 min / 1 hour / 2 hours chips.
2. "About N a day" skips Sundays by default (Mon to Sat); Every day is
   the other choice.
3. Hours only, weekly only, for now.
4. The dashboard Habits tile shows the bar and "N hours left".
5. Private by default.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev runs against the Neon `dev` branch (host `ep-hidden-pine-`).
  Before any Prisma command, confirm `DATABASE_URL`'s host is the dev
  endpoint; if not, stop. Never print `.env`. No agent edits `.env`.
- Forbidden: `npm run db:seed`, `npm run db:reset`, `prisma migrate reset`,
  `prisma db push`, `prisma migrate dev`. Migrations are additive only,
  hand-written SQL, reviewed before applying.
- Day columns are `DateTime` at UTC midnight, not `@db.Date`.
- Never write a script that touches `User` rows. The dev branch holds real
  family data; treat it as private.
- No agent writes production data. Merging `main` deploys and applies the
  migration.
- Stage by explicit path, never `git add -A` / `git add .`. Run
  `git show --stat HEAD` after each commit.
- Any new test directory ships its glob entry in `package.json` in the
  same commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
  (7 DST skips expected)
- the same with `TZ=America/Los_Angeles`
- `DATABASE_URL=postgresql://u:p@invalid.invalid:5432/none DIRECT_URL=postgresql://u:p@invalid.invalid:5432/none npm run build`
- `node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

## Assembled

- **Banner:** the habits code is large; he maps every reader of `HabitLog`
  and every place that decides done or due before contracts are written.
- **Stark + Vision:** always.
- **Strange:** new screens and a changed Today row.
- **Captain:** new table, new files, and several habit files are already
  near the 350-line soft cap.
- **Hill:** design calls the mock left open.

## Structural calls (Fury, from Banner's brief)

- **Hours entries get their own table, `HabitTimeEntry`** (habit, person,
  household day at UTC midnight, minutes, loggedBy, createdAt). `HabitLog`'s
  one-row-per-day key stays untouched, so no check code can miscount time.
- **A `track` column on Habit ("checks" | "hours")**, not a new schedule
  value. An hours habit is always stored as `schedule "weekly"`, `times 1`,
  `kind "habit"`, `mode "build"`, `sharing "each"`, `carryOver false`, plus
  `weeklyMinutes` (the target) and `paceDays` ("monsat" | "every"). So a
  site that forgets to branch sees a harmless weekly habit, never a crash
  or a 404. Every site Banner listed still branches on purpose.
- **Minutes as whole numbers** everywhere in storage and the engine; hours
  are only a way of writing them.
- **No new reader or writer files.** Entry reads go in `habitsRead.ts` and
  `habitsStatsRead.ts`, entry writes in `habitWrites.ts`, the streak cache
  in `streakWrites.ts`, so the STRUCTURE.md reader and writer rules hold.
  The pure hours rules are a new engine file, `src/lib/habits/hours.ts`.
  The words are a new no-imports file, `src/lib/habitHoursVocabulary.ts`,
  because `habitVocabulary.ts` is past the soft cap and its size watch says
  the next habit words go in a new file by concern.

## Contracts

### C1 - Storage and the pure hours engine

1. **Objective:** the `HabitTimeEntry` table and Habit's three new columns
   exist (migration applied to the dev branch), and pure, tested rules
   answer "this week's minutes, minutes left, pace per day, met, and the
   weeks-hit streak" for an hours habit; entries can be written and
   removed, and the streak cache is rebuilt for hours habits.
2. **Boundaries:**
   - May touch:
     - `prisma/schema.prisma`
     - new `prisma/migrations/20261109000000_add_habit_hours/migration.sql`
     - new `src/lib/habitHoursVocabulary.ts`
     - new `src/lib/habitHoursVocabulary.test.ts`
     - new `src/lib/habits/hours.ts`
     - new `src/lib/habits/hours.test.ts`
     - `src/lib/habits/habitRows.ts`
     - `src/lib/habits/habitRows.test.ts`
     - `src/lib/habits/types.ts`
     - `src/lib/habits/habitWrites.ts`
     - `src/lib/habits/streakWrites.ts`
     - `STRUCTURE.md` (only to record the two new files in the habit
       engine and vocabulary paragraphs, and add the new vocabulary file
       to the engine's allowed imports)
   - Must not touch: everything else, in particular any `src/app/`,
     `src/components/`, `src/lib/habits*.ts` builder or reader, `.env`,
     `package.json` (the existing globs already pick up both new test
     files).
3. **Spec:**
   - Migration (hand-written, additive, generated-style comments like
     `20261106000000_add_habits`): `ALTER TABLE "Habit" ADD COLUMN
     "track" TEXT NOT NULL DEFAULT 'checks'`, `"weeklyMinutes" INTEGER`,
     `"paceDays" TEXT`; `CREATE TABLE "HabitTimeEntry"` (`id` TEXT PK,
     `habitId` TEXT NOT NULL, `userId` TEXT NOT NULL, `day`
     TIMESTAMP(3) NOT NULL, `minutes` INTEGER NOT NULL, `loggedById` TEXT,
     `createdAt` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP); indexes
     on (`habitId`, `userId`, `day`) and (`userId`, `day`); foreign keys
     habit and user `ON DELETE CASCADE`, loggedBy `ON DELETE SET NULL`,
     all `ON UPDATE CASCADE`. The schema model matches it exactly, with a
     `///` doc comment in the house style, and User gets the two back
     relations (`"habitTimeEntries"`, `"habitTimeEntriesLogged"`). `day`
     is `DateTime`, never a Postgres date column.
   - Apply: confirm `DATABASE_URL`'s host starts `ep-hidden-pine-`
     (print only the host, never the URL or `.env`), then
     `npx prisma migrate deploy` and `npx prisma generate`. Nothing else
     touches the database. If the host is anything else, stop and report.
   - The new vocabulary file (no imports): `HABIT_TRACKS =
     ["checks","hours"]`, `toHabitTrack` (unknown → "checks"),
     `PACE_DAYS = ["monsat","every"]`, `toPaceDays` (unknown → "monsat"),
     `HOURS_LIMITS` = { entryStep 30, entryMin 30, entryMax 720,
     entryDefault 60, targetMinHours 1, targetMaxHours 80,
     targetDefaultHours 5 } (minutes for entries, whole hours for the
     target; C2 may adjust words to Hill's decisions, not these numbers
     without a contract change). Tests pin the lists and the repairers.
   - The new engine file (pure, callers pass `today`; imports only what
     STRUCTURE.md allows the engine plus the new vocabulary file):
     - `type TimeEntry = { day: CalendarDate; minutes: number; userId: string }`
       (in `types.ts` if that is where engine types live).
     - `countedDaysLeft(today, paceDays)`: days from today to Saturday
       inclusive; "monsat" leaves out Sundays (on a Sunday that is 6).
     - `hoursWeek({ entries, targetMinutes, paceDays, today, vacations })`
       → `{ weekStart, doneMinutes, targetMinutes, leftMinutes,
       perDayMinutes: number | null, met, byDay: number[7] }` for the
       Sun–Sat week holding `today`. `leftMinutes` never below 0.
       `perDayMinutes` = left / counted days left, **rounded up to the
       next 15 minutes**, null when met or when no counted day is left.
       Vacation days today-or-later are not counted as days left.
     - `hoursStreaks({ entries, targetMinutes, startWeek, today,
       vacations })` → `{ current, best, asOf }` in weeks: a finished week
       (before today's week) whose total reached the target extends the
       run; a finished week that missed breaks it, unless every counted
       day of it (Mon–Sat, or all 7 for "every") was on vacation, which
       neither counts nor breaks. This week counts once met and never
       breaks the run while it is still going. Weeks before `startWeek`
       are ignored. `asOf` = today.
     - `weekTotals(entries, today, n)` → the last n week totals in
       minutes, oldest first, this week last.
   - `habitRows.ts`: `HabitFields`/`HabitColumns`/`habitColumns` gain
     `track`, `weeklyMinutes`, `paceDays`. When `track` is "hours",
     `habitColumns` also writes the fixed storage shape (schedule
     "weekly", times 1, weekdays null, anchorWeek null, kind "habit",
     mode "build", sharing "each", carryOver false); when "checks",
     `weeklyMinutes` and `paceDays` become null. `scheduleChanged`
     treats a change of any of the three as a schedule change. Add
     `hoursFromRow(row)` → `{ targetMinutes, paceDays } | null` (null for
     checks or a missing target) and `timeEntryFromRow`.
   - `habitWrites.ts`: `addHabitTime({ habitId, userId, day, minutes,
     loggedById }, today, client)` and `removeHabitTime(entryId, today,
     client)` (returns the removed entry's habitId and userId, or null),
     each inside `atomically` and each rebuilding that person's hours
     streak. No auth here (the actions carry it, as for checks).
   - `streakWrites.ts`: `SCHEDULE_SELECT` gains `track`, `weeklyMinutes`,
     `paceDays`, `createdAt`; `storeStreaks` sends hours habits to
     `hoursStreaks` (loading their `HabitTimeEntry` rows) and check habits
     down the existing path unchanged. `recomputeAllStreaks` therefore
     covers both.
4. **Verification:** the full Gauntlet (above), plus running the three
   test files directly with node's test runner.
   Tests must cover: Sunday with monsat (6 days), Saturday (1 day), the
   rounding up (e.g. 4 h left over 3 days → 1 h 30 min), met → no pace,
   over-target, an entry on last week not counting this week, a streak
   across a missed week, a vacation-only week neither counting nor
   breaking, the current unmet week not breaking, `startWeek` cut-off,
   and `habitColumns` forcing the storage shape both ways.
5. **Evidence required:** the migration SQL in full; the printed host
   prefix and `migrate deploy` output; every Gauntlet command's tail;
   `wc -l` of every touched file; `git diff --stat`.
   Preflight: 0 hard failures except the two size caps on
   `prisma/schema.prisma` and `STRUCTURE.md`, which STRUCTURE.md exempts
   (schema) or which is a constitution, not code.
6. **Done criteria:** Vision re-runs the Gauntlet green, reads the SQL as
   additive, and finds no check-habit behaviour changed (existing tests
   unchanged and passing).

## Gate ledger

None yet.

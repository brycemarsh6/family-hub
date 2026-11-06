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

- **C1, Vision pass 1: PASS** (on `f7714cd`). Re-ran the Gauntlet (998;
  UTC 991 + 7 skips; LA 998; build 0), regenerated the SQL offline with
  `prisma migrate diff` and it matched both migrations exactly. Notes:
  `createHabit` lets the caller's `schedule` override the forced "weekly"
  (C3 told to send it; hardening goes in a later fix contract); a partial
  update with `weeklyMinutes` but no `track` isn't clamped (C3 sends the
  whole shape); the streak cache now holds weeks for hours habits, so
  every reader of it must branch on track (C2/C4); two cosmetic test-name
  slips in `hours.test.ts`.

#### C1 Amendment 1 (sent to Stark mid-build, 2026-11-06, for decision 198)

Same migration and schema gain `Habit."hoursSince" TIMESTAMP(3)`
(`hoursSince DateTime?`): the household day (UTC midnight) the habit became
an hours habit. `createHabit` with track "hours" sets it to `today`;
`updateHabit` sets it when track changes checks → hours and clears it when
it changes to checks. `streakWrites.ts` passes `startWeek =
startOfWeek(hoursSince ?? createdAt as a household day)` to `hoursStreaks`;
`SCHEDULE_SELECT` gains `hoursSince`; `hoursFromRow` also returns
`since: CalendarDate | null`. One more test: a switch mid-history ignores
earlier weeks.

## Decisions

Bryce's answers are decisions 182 to 186 and Hill's are 187 to 199, in
`.avengers/plans/habits-chores-v1.md` ("The weekly hours tracker"). Hill's
medium calls: 188 ("· today"), 191 (wording), 192 (swipe to Delete), 197
(Report leaves hours out), 198 (the switch line, and switching back).

### C2 - Read side: rows, tiles, goals, stats data, exclusions

1. **Objective:** every page loader and pure builder knows an hours habit:
   Today and the dashboard get an hours view per row, goal plans show hours,
   the stats page gets hours data, and every place in decisions 197 leaves
   hours habits out on purpose. No UI in this contract.
2. **Boundaries:**
   - May touch:
     - new `src/lib/habitsHours.ts` (the hours builder: row view, stats
       view, the words that join numbers and `formatHours`)
     - new `src/lib/habitsHours.test.ts`
     - `src/lib/habitsToday.ts` (only: the `hours` field on `HabitRowView`
       and the call into `habitsHours.ts`; hours rows never "required",
       never in `allRequiredDoneToday`; it must stay at or under 350 lines)
     - `src/lib/habitsToday.test.ts`
     - `src/lib/habitsRead.ts`, `src/lib/habitsStatsRead.ts` (load
       `HabitTimeEntry` rows and the new Habit columns where needed)
     - `src/lib/habitsDashboard.ts`, `src/lib/habitsDashboard.test.ts`
     - `src/lib/habitsPrompts.ts`, `src/lib/habitsPrompts.test.ts`
     - `src/lib/habitsCalendar.ts`, `src/lib/habitsCalendar.test.ts`
     - `src/lib/habitsReport.ts`, `src/lib/habitsReport.test.ts`
     - `src/lib/habitsFamily.ts`, `src/lib/habitsFamily.test.ts`
     - `src/lib/habitChanges.ts`, `src/lib/habitChanges.test.ts` (an
       optimistic "addTime" change, if the builder needs it)
     - `src/lib/goalsProgress.ts`, `src/lib/goalsProgress.test.ts`,
       `src/lib/goalsRecap.ts`, `src/lib/goalsRead.ts`
     - `src/lib/habits/access.ts`, `src/lib/habits/access.test.ts`
       (`canNudge` false for hours habits)
   - Must not touch: `prisma/`, `src/lib/habits/` files other than
     `access.ts` and its test, `src/lib/goals.ts`, `src/app/`,
     `src/components/`, `src/lib/habitVocabulary.ts`,
     `src/lib/habitHoursVocabulary.ts` (read it, don't change it; ask if
     a word or limit is missing).
3. **Spec** (decisions 187 to 199):
   - `formatHours(minutes)` in `habitsHours.ts`: whole hours plus ¼ ½ ¾,
     "1 hour" singular, under an hour as "½" (totals) or "30 min"
     (amounts, a separate `formatAmount`). The exact strings: "6½ of 10
     hours this week", "10 of 10 hours this week · done", "11½ of 10 hours
     this week · done", "3½ hours left · about 1¾ a day", "4 hours left ·
     today" (last counted day, 188), "1 hour left", "6 hours a week" /
     "1 hour a week" (Manage, 199), "Calling · 3½ hours left" (Goals tile).
   - `HabitRowView.hours: HoursRowView | null` = { done, target,
     doneText, leftText (null when met), met, fraction 0..1 for the bar,
     paceDays }. Rows for hours habits: shown every day of the week
     (never dropped as "none"), `doneToday` mirrors `met` so the existing
     finished sort works (189), `dueState` "open", never carried, no
     planned day, `progress` null, streak label in weeks (195). Vacation:
     an hours row on a vacation day still shows (time can be logged); the
     pace leaves vacation days out (C1 does).
   - Dashboard (197): picked hours habits show whenever Today shows
     them; with no picks, unmet hours habits are eligible like due ones
     and met ones drop off.
   - Never for hours habits: Pick a day prompts, Calendar planned days,
     perfect days, confetti, the Report (left out entirely, no note),
     nudges.
   - Whole family: each person's `hours` view in their column data.
   - Stats data: `buildStatsData` (or a sibling in `habitsHours.ts` it
     calls) returns, for an hours habit, `hours: { week: hoursWeek result,
     tiles: current, best, totalText, chartDays (Sun to Sat, minutes and
     label each), lastWeeksText "Last 4 weeks: 6 · 7 · 6½ · 2 so far",
     entries: { thisWeek, lastWeek } each newest first with { id, day,
     label "Thu · 1½ hours", canDelete }, switchedText "Switched to hours
     on Nov 6" when `hoursSince` is after the habit's first day,
     perPerson for Side by side }` and no month calendar. The stats page
     must not 404 for an hours habit.
   - Goals: `buildPlanItemView` / week summary / recap show hours progress
     for an item whose habit is hours ("Calling · 6½ of 10 hours this
     week", fraction for its bar); a goal's "done this week" counts the
     hours habit done when met.
4. **Verification:** the full Gauntlet. New tests in `habitsHours.test.ts`
   pin every string above; changed builders get a test showing an hours
   habit handled (row present, excluded where 197 says).
5. **Evidence required:** Gauntlet tails (both TZ runs and the build),
   `wc -l` of every touched file (habitsToday.ts ≤ 350), `git diff --stat`,
   and a list of each site Banner named in the brief (mission file
   doesn't hold it; it is in the dispatch) with what it now does.
6. **Done criteria:** Vision re-runs green and walks each site.

### C3 - Write side: the form, the plan sheet, the actions

1. **Objective:** people can create and edit hours habits (Habits & Chores
   form and the goal's Add-to-plan sheet) and log or remove time, through
   checked Server Actions.
2. **Boundaries:**
   - May touch:
     - new `src/app/actions/habitHours.ts` (`addHabitTime`,
       `removeHabitTime`)
     - `src/app/actions/habits.ts` (`HabitInput` and `checkInput` gain
       track, weekly hours, pace days; hours forces the storage shape and
       refuses Together, chores and carry over)
     - `src/app/actions/planItems.ts` (create and edit a plan item as
       hours; editing never changes Track unless asked)
     - `src/lib/goals.ts` (`habitInputFromPlan` carries Track and keeps an
       hours habit hours)
     - `src/lib/goalsHabitInput.test.ts`
     - `src/components/HabitForm.tsx`, `src/components/HabitFormFields.tsx`
     - new `src/components/HabitHoursFields.tsx` (the "Hours a week"
       stepper and "Count days left as", shared by both forms)
     - `src/components/PlanItemSheet.tsx`
   - Must not touch: `prisma/`, `src/lib/habits/`, every `src/lib/habits*.ts`
     builder (C2's), the Today row, sheets, Manage and stats components
     (C4's). C2 and C3 run in parallel, so C3 imports nothing C2 adds.
3. **Spec** (decisions 186, 191, 193, 194, 198):
   - Actions check the session (`src/lib/dal.ts`) and `access.ts`
     (`canLogFor` for time, like a check; delete only an entry of a habit
     the viewer may log for). `addHabitTime(habitId, forUserId, dayIso,
     minutes)`: the habit must be an hours habit; minutes a multiple of 30
     from 30 to 720; the day within the 7-day window and never after today
     (use the same rule a late check uses). `removeHabitTime(entryId)`.
     Both `revalidatePath` the same pages a check does plus the stats page
     and goal pages that a check revalidates.
   - Form: Track Segmented under Kind (hidden for chores), Hours hides How
     often, Carry over, Build or quit and Together in Who; shows the hours
     fields; Private turns on when Hours is picked with Just me and off
     with Side by side; idea chips never set Track. Edit of a check habit
     can switch to Hours and back.
   - Preflight notes: C2's REVIEW lines were read; the four `habitsHours`
     hits on C2 are mentions of its own new file.
   - Plan sheet: the Habit kind gets the same Track row; Hours swaps How
     often for the hours fields. Saving creates or updates the linked
     habit as hours.
   - Limits come only from `HOURS_LIMITS` (no literal 30, 720 or 80 for
     these rules anywhere else).
4. **Verification:** the full Gauntlet; tests for `checkInput`'s hours
   rules if it is testable where it lives, and for `habitInputFromPlan`.
5. **Evidence required:** Gauntlet tails, `wc -l`, `git diff --stat`.
6. **Done criteria:** Vision re-runs green; Strange sees the form in C4's
   gate.

### C4 - The screens: Today row, log sheet, tile, stats, goals

1. **Objective:** everything a person sees: the hours row with bar and +,
   the log sheet, the dashboard tile row, the stats page for hours, the
   Whole family column, and the goal page, This week and Goals tile
   lines.
2. **Boundaries:** written after C2 and C3 land, from their real exports.

#### C1 report and Fury's fix (2026-11-06)

Stark: DONE, Gauntlet green (998 tests; UTC 991 + 7 skips; LA 998), build
0. He had applied the first migration to dev before Amendment 1 arrived,
so dev lacked `hoursSince`. Fury moved that column into its own additive
migration, `20261109000001_add_habit_hours_since`, restored the first
file to exactly what dev recorded, checked the host (`ep-hidden-pine-`)
and ran `npx prisma migrate deploy`: "All migrations have been
successfully applied", `migrate status` "up to date". Stark's notes:
`hoursStreaks` and `countedDaysLeft` take `paceDays` / `vacations` as
extra inputs; `habitColumns` with track "hours" clamps the target to 60
to 4800 minutes and defaults 300, so editors must send the whole hours
shape; `addHabitTime` returns null for a non-hours habit or a
non-participant and clamps minutes 30 to 720.

#### C3 report (2026-11-06)

Stark: DONE. Gauntlet green with C2 in flight (1002; UTC 995 + 7; LA
1002; build 0). New `src/app/actions/habitHours.ts` (77),
`src/components/HabitHoursFields.tsx` (80). `HabitForm.tsx` is 356 (past
the soft cap: NOTE, split candidate for Captain). Carried into C4:
- `HabitManagerItem` (C2's `habitsToday.ts`) lacks `track`,
  `weeklyMinutes`, `paceDays`, so Edit on an hours habit would open as
  Checks and saving would convert it. C4 must feed them through
  `managerItem()` and the plan sheet's `initial`. **Ship blocker until
  then.**
- The Track and pace words are constants in `HabitHoursFields.tsx`; they
  move to `habitHoursVocabulary.ts` in C4.
- No `checkInput` test (it lives in a `"use server"` file with a db read);
  plan-side rules are tested.
- Fury's call: under a goal, an hours habit follows the goal's privacy
  (the existing plan rule), not decision 186's default, so a shared goal's
  partner still sees its progress. Bryce's commissions goal is private
  anyway.

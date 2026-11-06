# Mission 37: Habits & Chores, the weekly hours tracker

**Project:** family-hub (Marshee)
**Status:** BUILDING (C4), C1 PASS, C2 and C3 at the gate
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

### C4a - Today, the log sheet, dashboard, Whole family, Manage and Edit

1. **Objective:** an hours habit looks and works right on Today, the
   dashboard tile, Whole family, Manage and Edit: the bar, the + and the
   log sheet, and Edit opens it as Hours (closes C3's ship blocker).
2. **Boundaries:**
   - May touch: new `src/components/HoursLogSheet.tsx`, new
     `src/components/HoursHabitRow.tsx` (sibling of HabitRow),
     `src/components/HabitRow.tsx`, `src/components/HabitTodayList.tsx`,
     `src/components/HabitsTile.tsx`, `src/components/HabitFamilyColumn.tsx`,
     `src/components/HabitFamilyView.tsx`, `src/components/HabitManager.tsx`,
     `src/app/(app)/habits/[id]/edit/page.tsx`,
     `src/components/HabitForm.tsx` (back to 350 or under),
     `src/components/HabitHoursFields.tsx`,
     `src/lib/habitHoursVocabulary.ts` and its test (the words move
     there), `src/lib/habits/habitWrites.ts` (only `createHabit`'s
     schedule order, Vision's C1 note).
   - Must not touch: `prisma/`, every `src/lib/habits*.ts` builder and
     reader, `src/app/actions/`, the stats page and goal screens (C4b).
3. **Spec:** decisions 187 to 191, 194, 197, 199 and the approved mock
   with Hill's changes; existing `ProgressBar`, the `CheckInSheet` sheet
   shape, 48px targets, tokens, Lucide only; −/+ in
   `HOURS_LIMITS` entry steps, never typed; "Other day" is the native
   date input over the last 7 days; errors inline; optimistic bar rolls
   back on failure.
4. **Verification / evidence:** the full Gauntlet, `wc -l`, `git diff
   --stat`, and the screen states for Strange.
5. **Done criteria:** Vision re-runs green; Strange screenshots it.

### C4b - The stats page and the goal screens

1. **Objective:** the hours stats page (tiles, this week chart, last 4
   weeks, entries with swipe to Delete, the switched line) and the goal
   page, This week and Goals tile lines for hours plans, plus the plan
   sheet opening an hours item as Hours.
2. **Boundaries:**
   - May touch: `src/components/HabitStats.tsx`, new
     `src/components/HabitHoursStats.tsx` (the hours body: tiles, This
     week card with ProgressBar and the Sun to Sat chart, the Last 4 weeks
     line, the switched line, Side by side bars), new
     `src/components/HoursEntryList.tsx` (This week / Last week entries,
     swipe to Delete like `CheckInHistory`, calls `removeHabitTime`,
     waits for the server, no confirmation), `src/components/GoalDetail.tsx`,
     `src/components/ThisWeekList.tsx`, `src/components/GoalsTile.tsx`,
     `src/components/PlanItemRow.tsx` (an hours plan item shows its bar
     and "Calling · 6½ of 10 hours this week" and a + that opens
     `HoursLogSheet`, never the round check), `src/components/PlanItemSheet.tsx`
     (Edit opens an hours item as Hours: initial track, weeklyMinutes and
     paceDays from the item's `hours` view), and
     `src/lib/goalsProgress.ts` only if a field is missing for that.
   - Must not touch: `prisma/`, every other `src/lib/` file,
     `src/app/actions/`, C4a's components (import them as they are).
3. **Spec:** decisions 192, 195, 196, 198; `data.hours` from
   `buildStatsData` (`HoursStatsData` in `src/lib/habitsHours.ts`): when
   set, render the hours body and no month calendar, perfect-days line or
   check toggle. The chart is drawn to scale with the value above each
   bar (blank over an empty day), text in text tokens, bars in the accent.
4. **Verification / evidence:** the full Gauntlet, `wc -l`, `git diff
   --stat`, and the screen states for Strange.
5. **Done criteria:** Vision re-runs green; Strange screenshots it.

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

#### C2 report (2026-11-06)

Stark: DONE. Gauntlet green with C3 present (1048; UTC 1041 + 7; LA 1048;
build 0). New `src/lib/habitsHours.ts` (256) and its test (282, 22
tests). `habitsToday.ts` 350 (at the cap), `habitsFamily.ts` 360 (past the
soft cap: NOTE, split candidate), `habitsRead.ts` 347. The Report is
filtered in its loader (`track: "checks"`). Carried into C4:
- `managerItem` now carries `hours` (`weeklyMinutes`, `paceDays`, `text`,
  `since`): C4 wires it into Edit's `initial` and the plan sheet (C3's
  ship blocker).
- `HabitStatsData.calendar` is an empty calendar for hours; C4 renders
  `data.hours` and skips the calendar.
- `addHoursMinutes` repeats the engine's round-up formula (a test pins it
  equal); the shown hours streak is the cache aged by `streakAfter`.
- "½ hour" is singular like "1 hour" (Hill's 187 extended).

#### C4a report (2026-11-06)

Stark: DONE. Gauntlet green (1051; UTC 1044 + 7; LA 1051; build 0). New
`HoursLogSheet.tsx` (174), `HoursHabitRow.tsx` (86); HabitForm back to
350. Edit now opens an hours habit as Hours (`hoursInitialOf`), closing
C3's ship blocker. `createHabit` puts `schedule` before `habitColumns`, so
the forced shape wins. Notes:
- A last-week day in the sheet reads "This adds 1½ hours to last week."
  instead of decision 191's "After this: 7 of 6 hours last week": no row
  view carries last week's total. Goes in the fix batch if a gate asks.
- The sheet sits inside the dashboard tile with `fixed inset-0`; Strange
  should check nothing clips it.
- Fury's slip, recorded so it isn't repeated: a Python `str.replace` with
  an empty search string (a slice taken in the wrong order) wrote the
  C4 contracts between every character of this file (99 MB) in an
  unpushed commit. That commit was dropped with `git reset --soft` and
  the file rebuilt from the C2 commit; no code was in it.

#### Vision, C2 and C3 pass 1: BLOCKED (one blocker, in C2's area)

Gauntlet green (1048; UTC 1041 + 7; LA 1048), boundaries clean, C3 clean.
**BLOCKER:** the hours streak shown on Today (`habitsToday.ts` `streakOf`
→ `displayStreak`) and on the stats tile (`habitsStats.ts:96`) ages the
weeks cache with the checks rule `streakAfter`, but `hoursStreaks` stores
`asOf = today` even when this week is unmet, so a missed week never breaks
the shown streak (reproduced: met Oct 18 and Oct 25 weeks, logged 2 h on
Nov 2, then nothing; Nov 9 and 12 show "2 weeks", engine says 0). A
narrower case: a Mon to Sat vacation week reads 0 instead of 3 because
`streakAfter` treats the Sunday as open. NOTES: `habitChecks.ts` actions
don't refuse an hours habit (harmless, harden); the plan sheet opens an
hours item as Checks (C4b covers it); `removeHabitTime` has no day window
(matches `canDelete`, a policy choice); old bundles get "Pick checks or
hours." after deploy; totals count entries from before a re-switch;
`habitsFamily.ts` 360, `habitsToday.ts` 350, `habitsRead.ts` 347 are
split candidates.

### F1 - The shown hours streak, and checks refused on hours habits

1. **Objective:** the hours streak on Today and the stats page equals
   what `hoursStreaks` would compute today, in both of Vision's
   scenarios; check actions refuse an hours habit.
2. **Boundaries:**
   - May touch: `src/lib/habits/hours.ts`, `src/lib/habits/hours.test.ts`,
     `src/lib/habitsHours.ts`, `src/lib/habitsHours.test.ts`,
     `src/lib/habitsToday.ts` (one-line swap; stay at or under 350),
     `src/lib/habitsStats.ts` (one-line swap, or route hours habits
     around `personTotals`), `src/lib/habitsFamily.ts` (only if the
     stats streak is computed there), `src/app/actions/habitChecks.ts`
     (a track guard on check, skip and uncheck: "That habit tracks
     hours."), `src/lib/habitsRead.ts` only if `HabitForAction` lacks
     `track` where the guard needs it, and
     `src/app/(app)/plans/goals/[id]/page.tsx` (one line: pass
     `viewerId={user.userId}` to `GoalDetail`, C4b's follow-up).
   - Must not touch: `src/components/`,
     `src/lib/goalsProgress.ts`, `prisma/`.
3. **Spec:** in `hoursStreaks`, `asOf` = the Saturday before this week
   when this week is unmet, today when met (mirrors `computeStreaks`'
   cache note). Add `hoursStreakAfter(cache, vacations, paceDays, today)`
   in `hours.ts`: each whole week strictly after the week holding `asOf`
   and before today's week breaks the run unless that week is on vacation
   by the hours rule (`weekOnVacation`); this week adds nothing until met
   (the cache already counted it if met). Today and the stats tiles call
   it for hours habits instead of `displayStreak`. Existing caches stored
   with `asOf = today` on dev are rebuilt by the next entry or by
   Recompute streaks; the reader must still be right for them (a cache
   whose `asOf` is inside an unmet week must not count that week).
4. **Verification:** the full Gauntlet; tests for both of Vision's
   scenarios (`scratchpad/probe/probe.ts` and `probe2.ts` describe them),
   a met-this-week case, and the guard (if testable; else say why).
5. **Evidence / done:** Gauntlet tails, `wc -l`, `git diff --stat`;
   Vision re-runs green and his two scenarios pass.

#### C4b report (2026-11-06)

Stark: DONE. Gauntlet green (1051; UTC 1044 + 7; LA 1051; build 0). New
`HabitHoursStats.tsx` (100), `HoursEntryList.tsx` (89). `GoalDetail.tsx`
347. The plan sheet derives Track and the hours fields from
`initial.hours`, closing Vision's plan-sheet note. Time logged from a
goal page or This week waits for the server (no optimistic bar; the
plan-item reducer has no `addTime`). Follow-up, added to F1: the goal
page must pass `viewerId` or the + is missing there. Nothing rendered
yet; Strange screenshots.

#### F1 report (2026-11-06)

Stark: DONE. Gauntlet green (1055; UTC 1048 + 7; LA 1055; build 0).
`hoursStreaks` stores `asOf` as the Saturday before an unmet week;
`hoursStreakAfter` ages it by the hours rule; Today and the stats page
call it through `hoursStreakOf` in `habitsHours.ts`. Vision's two probes
now match the engine. Check, skip and uncheck refuse an hours habit. The
goal page passes `viewerId`. Fury's ruling on legacy caches: only dev
holds hours caches written under the old `asOf` (production has no hours
habits until this merges), so they correct themselves on the next entry
or Recompute streaks; no migration needed.

#### Captain, pass 1 on `origin/main..35a1fd6`: BLOCKED (5)

1. `actions/planItems.ts` `isHoursHabit` reads `Habit` directly: a third
   reader. Use `loadHabitForAction(...).track`.
2. Privacy checks outside `access.ts` on touched lines:
   `habitsStatsRead.ts:85,242`, `habitsFamily.ts:137` (mission 36 said
   these move at their next touch). Add `othersPrivateHidden` and
   `showsOnFamilyView` to `access.ts` with tests and use them.
3. Goal screens log time for the viewer instead of `habitCheckTarget`'s
   answer (`ThisWeekList`, `GoalDetail`'s `viewerId`, `habitsRead.ts:96`
   re-typing half the rule). On the wall tablet a Together goal's + would
   be refused. Compute `forUserId` with `habitCheckTarget` where plan
   views are built (`goalsRead.ts` and `actions/planItems.ts`), carry it on
   the view, filter entries to that person; drop `viewerId` (F1's page
   change becomes unnecessary).
4. `habitsToday.test.ts` passed its size watch (383 → 449): move the seven
   `hours:` tests to new `src/lib/habitsTodayHours.test.ts`.
5. `GoalDetail.tsx` grew past its "extract before the next feature" watch:
   extract the result card to `src/components/GoalResultCard.tsx`.
NOTES taken into the fix: the entry read in `habitHours.ts` moves to a
`loadTimeEntryForAction` in `habitsRead.ts`; one pace formula
(`paceMinutesPerDay` in `hours.ts`, `HOURS_LIMITS.paceStep`); hours
phrases, `unitFor`, the chips and one `checkHoursTarget` in the vocabulary
file. Fury writes Captain's STRUCTURE.md amendment (8 parts) after the
fixes land. `habitsFamily.ts` 360 split (stats-page data) is a NOTE.

#### Vision pass 2 (C2 via F1) and pass 1 (C4a, C4b): BLOCKED (1)

Gauntlet green (1055; UTC 1048 + 7; LA 1055; build 0); F1's streak fix
confirmed through the real `buildTodayRows`; boundaries clean; Fury's
legacy-cache ruling upheld (one stale week on dev only). **BLOCKER**, the
same root as Captain's 3: the goal screens' + logs for the viewer while
the bar shows `participants[0]`'s week; on the tablet or for someone not
on the habit every save fails. NOTES taken into F2: `planItems.ts`
`logHabit` / `undoHabitLog` lack the track guard; the sheet's "today"
should come from the server; a future typed date moves the bar until
refused; a stale shared error shows in a fresh sheet (and behind it on
GoalDetail); decision 191's last-week line is still the stand-in.

### F2 - Gate fixes: Captain 1 to 5, Vision's goal-screen blocker, notes

1. **Objective:** every open BLOCKER from Captain pass 1 and Vision pass
   2 is fixed, plus the listed notes, with no behaviour change elsewhere.
2. **Boundaries:**
   - May touch:
     - `src/app/actions/planItems.ts`, `src/app/actions/habitHours.ts`
     - `src/lib/habitsRead.ts`, `src/lib/habitsStatsRead.ts`,
       `src/lib/habitsFamily.ts`, `src/lib/goalsRead.ts`,
       `src/lib/goalsProgress.ts`, `src/lib/goalsProgress.test.ts`,
       `src/lib/goals.ts`, `src/lib/goalsHabitInput.test.ts`,
       `src/lib/habitsHours.ts`, `src/lib/habitsHours.test.ts`,
       `src/lib/habitsToday.test.ts`, new `src/lib/habitsTodayHours.test.ts`,
       `src/lib/habits/access.ts`, `src/lib/habits/access.test.ts`,
       `src/lib/habits/hours.ts`, `src/lib/habits/hours.test.ts`,
       `src/lib/habitHoursVocabulary.ts` and its test,
       `src/app/actions/habits.ts` (only to call `checkHoursTarget`)
     - `src/components/GoalDetail.tsx`, new
       `src/components/GoalResultCard.tsx`, `src/components/ThisWeekList.tsx`,
       `src/components/PlanItemRow.tsx`, `src/components/HoursLogSheet.tsx`,
       `src/components/HabitTodayList.tsx`, `src/components/HabitsTile.tsx`,
       `src/components/HabitFamilyView.tsx`,
       `src/components/HabitHoursFields.tsx`,
       `src/components/HabitHoursStats.tsx`, `src/components/HoursEntryList.tsx`
     - `src/app/(app)/plans/goals/[id]/page.tsx` (undo F1's `viewerId`)
   - Must not touch: `prisma/`, `habitsToday.ts` (it stays at 350),
     `STRUCTURE.md` (Fury writes the amendment), `.env`.
3. **Spec:**
   - Captain 1: `isHoursHabit` goes; `updatePlanItem` asks
     `loadHabitForAction(item.habitId)` for `track` before the
     transaction. Captain note 1: add `loadTimeEntryForAction(entryId)` to
     `habitsRead.ts`; `removeHabitTime` uses it.
   - Captain 2: `othersPrivateHidden(actor, subjectId)` and
     `showsOnFamilyView(habit)` in `access.ts`, tested, used at
     `habitsStatsRead.ts` (both copies) and `habitsFamily.ts`.
   - Captain 3 + Vision: `loadHabitsForPlan` drops `viewerId` and its
     subject guess and returns everyone's entries; where plan item views
     are built (`goalsRead.ts` and `actions/planItems.ts`, together)
     compute `forUserId = habitCheckTarget(goal, viewer, participantIds)`,
     filter entries to that person, and carry `forUserId` on the hours
     view. When the target is not a participant of the habit (a device,
     someone added later) there is no + on the goal screens
     (`PlanItemRow` gets no `onLogTime`) and the bar shows nobody's
     invented week: show the first participant's week only if
     `habitCheckTarget` names them, else no bar. Test: a device viewer
     on a Together hours item gets no logging target.
   - Captain 4: move the seven `hours:` tests to the new test file.
   - Captain 5: extract "The result" card to `GoalResultCard.tsx`.
   - Captain note 2: one pace formula, `paceMinutesPerDay(left,
     daysLeft)` in `hours.ts` with `HOURS_LIMITS.paceStep`, used by the
     engine and `habitsHours.ts`; delete the pin test.
   - Captain note 3: the hour/hours unit rule (`unitFor`), the chip
     amounts (`HOURS_LIMITS.chips`) and one `checkHoursTarget(raw)` live
     in the vocabulary file and are used by `actions/habits.ts`,
     `goals.ts` and the components; no second copy.
   - Vision notes: `logHabit` / `undoHabitLog` refuse an hours habit
     ("That habit tracks hours."); the sheet takes today's day from the
     server (a prop), caps typed dates to today, clears any earlier error
     when it opens, and GoalDetail hides its error line while the sheet
     is open; decision 191's last-week line: the row view carries last
     week's minutes so the sheet says "After this: 7 of 6 hours last
     week".
4. **Verification / evidence:** the full Gauntlet, `wc -l` (every touched
   file under 350 except those already past it, which must not grow),
   `git diff --stat`.
5. **Done criteria:** Vision and Captain re-run and pass.

#### Strange, pass 1 (at 35a1fd6): PASS, 13 notes

Phone 390x844 and iPad 820x1180, light and dark (forcing verified). Every
target 48px or more and unoccluded; the sheet escapes the dashboard tile;
the chart is to scale. Test data on dev, all named "zz m37" (four habits,
one goal "zz m37 Commissions", their entries; Emily is on "zz m37
Follow-up"): Bryce's cleanup list. Notes sent to F2 as **F2 Amendment 1**:
clamp the sheet's day to the last 7 days and drop the "After this" line
outside it; clear the sheet error when amount or day changes; the streak
tiles wrap at 390px (unit into the label). Notes left for later: the Who
hint says "checks" on an hours habit; the dashboard picker hint ("up to
three habits due today") doesn't mention unmet hours habits; Today's
"2 of 9 done" leaves hours rows out by design (decision 197); "Switched to
hours on …" not seen (needs an older habit); the form stepper's + shifts
10px from 9 to 10; This week's "1 of 4 done" mixes an hours item with
check counts.

#### F2 report (Stark): DONE

All five Captain blockers and Vision's goal-screen blocker fixed, plus the
notes and Strange's Amendment 1. Gauntlet: tsc 0, eslint 0, `npm test`
1066/1066, UTC 1059 + 7 skips, LA 1066, build printed its route table.
Deviations, for the gates to judge: (1) on the wall tablet
`habitCheckTarget` names the habit's first participant, so the tablet logs
time for that person, the same rule checks use; (2) `HoursRowView.today`
and `.lastWeek` are optional because `habitChanges.test.ts` was outside the
boundary (follow-up: make them required); (3) `GoalResultCard` also takes
`onDeleteCheckIn`; (4) "Hours habit" is the muted line when no one's week
can be shown; (5) no unit test for the `planItems.ts` track guard (a
`"use server"` file). `goalsProgress.test.ts` grew 358 to 367 and
`habitsHours.test.ts` 282 to 298 while past their watch: NOTE.
Full text: `git show 1325fa2 --stat`, and the session scratchpad.

Fury wrote Captain's STRUCTURE.md amendment (vocabulary file contents, the
forced hours shape and the one pace formula, `HabitTimeEntry` in the writer
and reader sentences, `loadTimeEntryForAction`, the goals-side imports,
`othersPrivateHidden` / `showsOnFamilyView` in `access.ts`, `hoursSubject`,
the two hours components on `useOptimisticRun`, and the size-watch
figures).

#### Captain, pass 2 on `origin/main..064560e`: PASS

All five blockers fixed, the pass-1 notes hold, the amendment's counts and
names checked one by one. One wording slip fixed by Fury (`HoursLogSheet`
takes its caller's `run`, it doesn't call `useOptimisticRun`), plus
"(whose row, not permission)" on the `goals.ts` glue. NOTES for later:
export the `run` type so `RunChange` aliases it; split `habitsFamily.ts`
(360) at its stats-page data; the next goal-progress test goes in a new
file; `habitsRead.ts` and `habitsToday.ts` sit at exactly 350, so the next
addition splits them; make `HoursRowView.today` / `.lastWeek` required.

#### Vision, pass 3 (C4a/C4b via F2): BLOCKED (1)

Gauntlet green (1066; UTC 1059 + 7; LA 1066; build 0; recordcheck 0 hard).
Pass-2 BLOCKER fixed; F2's regressions checked; Stark's deviations 1 to 5
accepted (2 and 4 as NOTES). **New BLOCKER from F2:** `HoursLogSheet.tsx`
takes "today" from the server's render, so a page left open past midnight
logs time on yesterday (on a Sunday morning, into last week). NOTES: the
`habitsFamily.ts:124` comment says "this week's hours"; "Hours habit" is a
string in `PlanItemRow.tsx` instead of the vocabulary; `keepsHours` read
outside the transaction (no realistic scenario); the last-week line is
stale on a stale page (display only).

**Budget:** this was Vision's third pass. A fourth needs Bryce's OK
(doctrine). Fury writes F3 now so it is ready; it is not re-gated until
Bryce allows the fourth pass.

### F3 - The sheet's day on a stale page

1. **Objective:** the log sheet's "today" is the later of the server's day
   and the browser's household day, so a page left open overnight logs on
   the real day.
2. **Boundaries:** may touch `src/components/HoursLogSheet.tsx`,
   `src/lib/habitsHours.ts`, `src/lib/habitsHours.test.ts`,
   `src/lib/habitHoursVocabulary.ts`, `src/components/PlanItemRow.tsx`,
   `src/lib/habitsFamily.ts` (the comment only). Everything else is
   must-not-touch, including `prisma/` and `.env`.
3. **Verification:** the full Gauntlet (tsc, eslint, `npm test`, UTC and
   LA runs, the build with invalid database URLs).
4. **Evidence required:** the new helper's test (server Saturday, browser
   Sunday gives Sunday; browser behind gives the server's day), the
   Gauntlet output with exit codes, `wc -l` of touched files.
5. **Done criteria:** Vision pass 4 (with Bryce's OK) passes.

#### F3 report (Stark): DONE

`sheetToday(serverDay, browserDay)` in `habitsHours.ts` returns the later
day; the sheet uses it with the browser's household day. Test: server
Saturday + browser Sunday gives Sunday, the reverse gives Sunday, no
server day gives the browser day. "Hours habit" moved to
`HOURS_PHRASES.hoursHabit`; the `habitsFamily.ts` comment fixed (still
360). Gauntlet: tsc 0, eslint 0, `npm test` 1067/1067, UTC 1060 + 7 skips,
LA 1067, build 0. Waiting on Bryce's OK for Vision pass 4.

# Mission: Habits & Chores PR D, chores (mission 33)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (Hill decided 115 to 124)
**Started:** 2026-11-05 · **Updated:** 2026-11-05
**Branch:** `claude/habits-d-chores` (from origin/main 82d94e8)

## Brief

- **Goal:** the "PR D, mission 33: chores" section of
  `.avengers/plans/habits-chores-build.md`, with decisions 11, 12, 22, 23,
  29, 33 to 35, 57 and 115 to 124 in `.avengers/plans/habits-chores-v1.md`.
- **Done means:** on production, a person opens Manage, then "Chore chart",
  picks a person chip, adds chores under days on the Default week (116),
  and on This week moves or skips one for this week only (117), with the
  tags drawn on the ChoreChart board; Today and the family view count a
  moved chore on its new day and a skipped one as excused; the chore streak
  (33) shows in the Chores header (120); on a Sunday the shout-out shows
  (122); Settings has a Vacation mode card (123) and vacation days show
  excused on Today and the family view (115). Gauntlet green; Vision,
  Strange and Captain PASS.
- **Out of scope:** dashboard tiles and plan-a-day prompts (PR E); report
  and idea library (PR F); kids' vacations (need kid profiles); a daily
  chore shout-out (121).
- **Never blocks on Bryce.** Hill decides; Bryce's phone check goes on his
  checklist in CLAUDE.md after merge.

## Danger register

- Local dev runs against the Neon `dev` branch. **Before any Prisma command
  that reaches a database, Fury confirms `DATABASE_URL`'s hostname starts
  `ep-hidden-pine-`** (hostname only, never print `.env`).
- Forbidden for every agent: `npm run db:seed`, `npm run db:reset`, `prisma
  migrate reset`, `prisma db push`, `prisma migrate dev`. Stark never touches
  the database. `npx prisma generate` / `validate` are fine, and Stark writes
  the migration SQL by hand.
- **One migration, additive only:** three columns on `UserPreferences`.
  Fury reads the SQL line by line, then applies it to dev with `npx prisma
  migrate deploy` after the host check. Production gets it from the Vercel
  build on merge.
- The dev branch holds real family data. Count rows, never quote them.
- **No script creates, changes or deletes `User` rows.**
- Stage by explicit path, never `git add -A` / `git add .`; `git show --stat
  HEAD` after every commit. Merging to `main` is delegated to Fury once every
  gate passes and the Gauntlet is green; Fury then checks the deploy.
- `npm test` pins Denver; the direct `TZ=UTC` and `TZ=America/Los_Angeles`
  runs prove the other zones. A new test directory needs its glob in
  `package.json` in the same commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (767 at origin/main 82d94e8; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (7 old DST skips)
- the same with `TZ=America/Los_Angeles`
- `DATABASE_URL=postgresql://u:p@invalid.invalid:5432/none DIRECT_URL=<same> npm run build >/dev/null 2>&1; echo EXIT=$?`
- `node ~/.claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

## Assembled

Stark; Vision (`model: "fable"`), Strange and Captain (`model: "opus"`);
Hill (Fable, xhigh, general-purpose told to follow `.claude/agents/hill.md`)
for every would-be Bryce decision. Banner ran once. 3 passes per gate.

## Facts (Banner, 2026-11-05, at origin/main 82d94e8)

- `ChoreWeekOverride` (schema 1059-1075): `habitId`, `weekStart`,
  `fromWeekday` 0-6, `action` "moved" | "skipped", `toWeekday?`, unique on
  habit + week + fromWeekday. No reader or writer exists.
- `VacationPeriod` (1079-1091): `userId`, `startDay`, `endDay` inclusive.
  Read in `habitsRead.ts:142`, `habitsStatsRead.ts:70,139`,
  `habitWrites.ts:309`; no writer.
- `UserPreferences` (723-739) has `dashboardLayout`, `navMode`,
  `showStreaks`; no chore streak columns.
- `schedule.ts`: `isScheduledDay` (86-97), `dueState(spec, day, planned,
  doneInPeriod)` (134-145): no vacation or override input.
- `streaks.ts`: `computeStreaks` (49-104), `streakAfter` (117-141),
  `inVacation` (35-37). Per habit per person cache on `HabitParticipant`,
  written by `storeStreaks` (`habitWrites.ts:299-329`) inside
  `atomically()`; triggers in `checkHabit` 169, `uncheckHabit` 204,
  `updateHabit` 95, `recomputeAllStreaks` 272.
- `habitsToday.ts:234` calls `dueStateOf` without vacations (gap for 115).
  `habitsToday.ts` is 355 lines; `displayStreak` 152, `streakUnitOf` 142.
- Chores already show in a Chores section on Today
  (`HabitTodayList.tsx:104-106`) and the family view
  (`HabitFamilyColumn.tsx:108-109`, comment 92-93 waits for PR D). Perfect
  days already exclude chores (`habits/perfectDays.ts:19`). HabitForm can
  already make a chore on certain weekdays.
- Sunday pattern: `goalsRecap.ts:35-38` `isRecapDay(today)`; loader
  `goalsRead.ts:162-184`.
- Settings: `HabitsChoresSettings.tsx` (102 lines, client) renders only for
  non-device users (`settings/page.tsx:38-40`). Device refusal:
  `DEVICE_REFUSAL` in `actions/habits.ts:75`.
- Manage redirects the tablet (`habits/manage/page.tsx:14`).
- Boards: `ChoreChart.dc.html`, `Settings.dc.html`, `Dashboard.dc.html` in
  `/private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-habits-a-engine-00bccf/823148c4-c30a-4fc7-b187-45ba819246cf/scratchpad/artifact-files/f1e641d8-aa97-4e65-9258-10fb934262f4/project/`
  and `Manager.dc.html` in `.../scratchpad/mock/project/` (copies of
  https://claude.ai/artifact/WsWHY1oDmGhofjCFoaBXdu).

## Contracts

### C1 - Engine rules, pure, with tests
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 807 tests)
- **Notes for C2+:** `weekOverrides.ts` (`choreDayState`, `choreTag`, `overrideFromRow`, `weekChange`, `isExcused`), `choreStreak.ts` (`computeChoreStreak(chores, vacations, today)`, `choreStreakAfter`, `finishedAllChoresLastWeek`, `ChoreInput = { spec, logs, overrides, since }`), `streakUnitOf`/`displayStreak` now in `habits/streaks.ts`; `habitsToday.ts` 349 lines (extract before adding). Rows gain `onVacation`, `skippedThisWeek`, `weekTag`; chore rows' `streakLabel` is null. Stark's calls: chores with no set days stay out of the chore streak; a week of only skips or vacation is not "finished every chore"; overrides apply only to weekdays chores. C2 stores `computeChoreStreak`'s result (its `asOf` is yesterday while today is undone) and ages it with `choreStreakAfter`. C3 needs a column-level `onVacation` on `FamilyColumn`.
- **Objective:** every PR D rule that needs no database.
- **Boundaries:** may touch: new `src/lib/habits/weekOverrides.ts` and test,
  new `src/lib/habits/choreStreak.ts` and test, `src/lib/habits/streaks.ts`
  and test, `src/lib/habits/types.ts`, `src/lib/habitsToday.ts` and test,
  `src/lib/habitsStats.ts` (imports only), `src/lib/habitsFamily.ts` and
  test (counts and rows only), `src/lib/habitVocabulary.ts` and test,
  `STRUCTURE.md` (the PR C homes sentence that says `habitsToday.ts` keeps
  the row streak) · must not touch: anything else.
- **Rules:**
  - Move `streakUnitOf` and `displayStreak` from `habitsToday.ts` into
    `habits/streaks.ts` (Captain's PR C leftover), update importers, and
    fix the STRUCTURE.md sentence to match.
  - `weekOverrides.ts`: given a weekdays chore, its overrides for a week
    (`{ weekStart, fromWeekday, action, toWeekday }`) and a day, say
    whether the chore is required that day: moved away is not required on
    the old day, required on the new day; skipped is excused (not
    required, treated as skipped for streaks). Also the tag for the chart
    (moved to X, this week only, skipped this week). Week starts Sunday.
  - `choreStreak.ts`: from one person's chores (specs), their logs,
    overrides and vacations, and today: days in a row on which every chore
    required of the person was done on time (33). No chore due does not
    break it; skipped (log or override) and vacation are excused; done late
    breaks it; today counts only once every chore due today is done (until
    then the streak stands from yesterday). Current and best. Also
    `finishedAllChoresLastWeek` for 122 (at least one due, no broken day,
    Sunday to Saturday before today).
  - Vacation on Today and the family view (115): rows due on a vacation
    day carry `onVacation`; excused like skipped in `doneCounts` and
    `allRequiredDoneToday`; sorted with finished rows. Vocabulary: "On
    vacation", "You're on vacation through {date}", "You're on vacation
    today", the Sunday and chart tag words (117, 122), "Chore chart",
    "Each person's default week".
  - Chore rows on Today and the family view no longer carry a per-row
    streak label (120).
- **Verification:** gauntlet minus build; named tests for a move across the
  week, a skip, vacation, a late chore breaking, no chores due, today not
  yet done, the week boundary, and all three zones.

### C2 - Migration, writes and actions
- **Status:** DONE (Stark; Fury read the SQL: three `ADD COLUMN`, defaults 0 or null; host checked `ep-hidden-pine-`; `migrate deploy` applied `20261108000000_add_chore_streak` to dev; 808 tests)
- **Notes for C3+:** `choreWrites.ts` (`recomputeChoreStreak(s)`, `recomputeAllChoreStreaks`, the three week changes), `vacationWrites.ts` (`saveVacation`, `deleteVacation`), `canEditChart` in `access.ts`; actions `choreChart.ts` and `vacations.ts`. Writers default `today` to `householdNow()` where callers could not pass it. No DB tests for writers.
- **Objective:** the chore streak cache, override and vacation writes, the
  chart and vacation actions.
- **Boundaries:** may touch: `prisma/schema.prisma` (three
  `UserPreferences` columns), a new migration folder (hand-written SQL,
  `ALTER TABLE ... ADD COLUMN` only), `src/lib/habits/habitWrites.ts`, new
  `src/lib/habits/choreWrites.ts`, new `src/lib/habits/vacationWrites.ts`,
  `src/lib/habits/access.ts` and test (`canEditChart`), new
  `src/app/actions/choreChart.ts`, new `src/app/actions/vacations.ts` ·
  must not touch: anything else.
- **Rules:**
  - Columns: `choreStreakCurrent Int @default(0)`, `choreStreakBest Int
    @default(0)`, `choreStreakAsOf DateTime?`.
  - One `recomputeChoreStreak(userId, today, client)` in `choreWrites.ts`,
    called inside the same transaction by every write that can change it:
    a check, uncheck or skip on a chore, a chore create, schedule change,
    archive, restore or delete, an override write, a vacation save or
    delete. `recomputeAllStreaks` also recomputes every person's chore
    streak. Upsert `UserPreferences` (a person may have none yet).
  - Overrides: `moveChoreThisWeek(habitId, fromWeekday, toWeekday, today)`,
    `skipChoreThisWeek(habitId, fromWeekday, today)`,
    `clearChoreChange(habitId, fromWeekday, today)`; only for the current
    week, only weekdays chores, only to today or later (117).
  - Vacations: `saveVacation(userId, from, through)` refuses Through before
    From and overlaps (123 wording); `deleteVacation(id, userId)` only the
    owner's. Both recompute that person's habit and chore streaks.
  - Actions: session, device refused, row, policy (`canEditChart`: self,
    parent or admin for anyone, kid only self; 118), then fields. Chart
    actions: `addChartChore(personId, weekday, name)` (116, through the
    existing create path so one writer makes habits), the three override
    actions. Vacation actions: own only. Revalidate `/habits` layout and
    `/settings`.
- **Verification:** gauntlet minus build; `npx prisma validate`; the SQL
  printed in the report.

### C3 - Readers
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 823 tests)
- **Notes for C4+:** `loadChoreChart(viewer, personId, today): ChoreChartData | null` and `loadVacations(userId, today)` in `habitsRead.ts`; pure builders in `src/lib/choreChart.ts` (chart, chore header, vacation order). `TodayPage` gains `choreStreak`, `shoutOut`, `vacationThrough`; `FamilyColumn` gains `choreStreak`, `shoutOut`, `onVacation`. Week chores carry `fromWeekday`, `state`, `tag`, `changed`, `canChange`, `moveTargets`; always send `fromWeekday`'s value, never the column's. `carrySince`/`habitStartDay` now in `habits/carryOver.ts`; past-day changes refused. **Gap for C5:** the family loader reads only non-private habits, so a private chore is left out of a person's family-card chore streak and Sunday line, which can then say something untrue.
- **First (from C2's notes):** (a) `choreWrites.ts` imports `carrySince` and `habitStartDay` from `../habitsToday`, which is upward (STRUCTURE.md: `habits/` never imports `habitsToday.ts`); move both into a new `src/lib/habits/carryOver.ts` (with their tests) and point every importer at it. (b) A this-week skip or clear on a day already past would erase a missed chore and save the streak, against 6 and 33 ("late breaks it"); the writer refuses changes to a day before today, the same rule as moves (117). Boundary adds `src/lib/habits/carryOver.ts` and test, `src/lib/habits/choreWrites.ts`, and every file that imports the two moved functions (imports only).
- **Objective:** what the pages need, through the two existing readers.
- **Boundaries:** may touch: `src/lib/habitsRead.ts`,
  `src/lib/habitsStatsRead.ts` (no third reader, STRUCTURE.md),
  `src/lib/habitsToday.ts` (page fields only), `src/lib/habitsFamily.ts`
  and test (page fields only), new pure `src/lib/choreChart.ts` and test
  (the chart page builder) · must not touch: anything else.
- **Rules:** `loadTodayPage` adds the viewer's chore streak (aged like
  `streakAfter`), vacation (current period end), Sunday shout-out flag,
  overrides applied to chores. `loadFamilyPage` adds the same per person.
  `loadChoreChart(viewer, personId, today)`: null unless `canEditChart`;
  the people chips (119), the person's weekdays chores by weekday for the
  Default week, and This week with overrides and tags (117); plain data.
  A loader for the Settings vacation list (123 order).

### C4 - The chart page
- **Status:** DONE (Stark; Fury re-ran tsc, eslint, 824 tests, build EXIT=0). `chart/page.tsx`, `ChoreChart.tsx` (277), `ChoreChartSheet.tsx`, the Manage row in `HabitManager.tsx`. **Debt:** its `useActionState` reducer repeats the `run()` shape with a reworded failure message, so it is a ninth copy in all but the grep; F1 replaces every copy with one hook.
- **Boundaries:** new `src/app/(app)/habits/chart/page.tsx`, new
  `src/components/ChoreChart.tsx` (and a sheet component if needed),
  `src/app/(app)/habits/manage/page.tsx` or `HabitManager.tsx` (the Manage
  row only).
- **Rules:** the ChoreChart board with 116 to 119 and 124; tablet sent to
  `/habits`; optimistic updates; 44px targets.

### C5 - Today, family view and Settings
- **Status:** DONE (Stark; same gauntlet). `VacationCard.tsx`, `HabitViewChips.tsx` (own file), chore flame, vacation and Sunday lines on Today and the family card; private chores count toward the family-card streak and Sunday flag without leaving the server. Notes: the flame sits after the title (120) where the Dashboard board right-aligns it; `habitsFamily.test.ts` is 396 lines; STRUCTURE.md still says a column header has no flame (C6).
- **First:** `loadFamilyPage` computes each person's chore streak and Sunday flag from all their chores, private included; only the number and the flag leave the server, never a private chore's row (78). Boundary adds `src/lib/habitsStatsRead.ts` and `src/lib/habitsFamily.ts` and test for this.
- **Boundaries:** `HabitTodayList.tsx`, `HabitRow.tsx`,
  `HabitFamilyColumn.tsx`, `HabitFamilyView.tsx`, `NudgeCard.tsx` (only if
  the cards share a stack), `src/app/(app)/habits/page.tsx`,
  `HabitsChoresSettings.tsx` or a new `VacationCard.tsx`,
  `src/app/(app)/settings/page.tsx`, `DESIGN.md` vocabulary.
- **Rules:** 115, 120, 122, 123, from the boards. PR C leftovers that touch
  these files: move `HabitViewChips` to its own file; the Together strip
  check does not name one person.

### C6 - Records
- Mission file, plan, CLAUDE.md status and Bryce's checklist, STRUCTURE.md
  homes for `weekOverrides.ts`, `choreStreak.ts`, `choreWrites.ts`,
  `vacationWrites.ts`, `choreChart.ts`, the new actions and components.

### F1 - One optimistic tap hook (PR C debt, before the gates)
- **Status:** DONE (Stark; Fury re-ran tsc, 824 tests). `src/lib/useOptimisticRun.ts` with `SAVE_FAILED`; nine callers moved; `habitsFamily.test.ts` split (256 + `habitsStatsPage.test.ts` 181). Left: `VacationCard.tsx` has two inline copies of the message, fixed in F2.
- **Objective:** STRUCTURE.md's "optimistic tap wrapper" debt entry: one
  client hook in `src/lib/` that takes the action as a closure, with the
  failure message as one exported constant, used by every copy, so no copy
  is left.
- **Boundaries:** new `src/lib/useOptimisticRun.ts` (or the name the debt
  entry implies), `HabitTodayList.tsx`, `HabitFamilyView.tsx`,
  `HabitStats.tsx`, `NudgeCard.tsx`, `ThisWeekList.tsx`, `VisionBoard.tsx`,
  `HabitManager.tsx`, `GoalDetail.tsx`, `ChoreChart.tsx`, `STRUCTURE.md`
  (turn the debt entry into the rule: the hook is the only home), plus a
  split of `src/lib/habitsFamily.test.ts` into two files by subject (the
  test glob already covers `src/lib/*.test.ts`).
- **Rules:** behaviour unchanged for every caller (same optimistic change,
  same error display, same message words: "Couldn't save that. Check your
  connection and try again."). Other app files with a `run(` of a different
  shape (MealPlanList, ExpiringList, PantryList, GroceryList) are out of
  scope; note them.
- **Verification:** full gauntlet; `git grep` shows the message in one
  place.

### F2 - VacationCard uses the hook
- **Status:** DONE (Stark; 824 tests, build EXIT=0). Save and delete now share one pending flag and error line.
- **Boundaries:** `src/components/VacationCard.tsx`, `STRUCTURE.md` (remove VacationCard from the leftover note).
- **Rules:** save and delete go through `useOptimisticRun` (save with a null change, since the server may refuse), message from `SAVE_FAILED`; behaviour unchanged.

## Gate ledger

### Pass 1 (at 9557f6d): all three BLOCKED
- **Vision (Fable): 1 blocker.** `weekChange` (`weekOverrides.ts`) treats an
  override as active on a spec that is no longer `weekdays`; a stale row on a
  weekly or monthly habit changes its state and tag. Notes: the override
  window used when aging streaks is too narrow (`habitsRead.ts`,
  `habitsStatsRead.ts`); kid and shared chore (now decision 125); the moved
  chore lock after its day passes (now 126); carry-over does not follow a
  moved chore; saving a vacation recomputes streaks once per habit (N+1).
  Verified clean: the hook refactor, privacy of private chores.
- **Captain (Opus): 5 blockers.** (1) `householdNow()` in `choreWrites.ts`
  repeats the zone helper; (2) the participant check in
  `actions/choreChart.ts` belongs in `access.ts` as `canChangeChore`;
  (3) three weekday-repair copies; (4) `allRequiredDoneToday` writes the
  excused rule inline; (5) `habitsStatsPage.test.ts` name does not follow
  its sibling. Amendment C: one "day in a vacation" helper in
  `habits/schedule.ts` replaces five copies (Fury: migrate now, not
  grandfather). Note: STRUCTURE.md is 957 lines; housekeeping overdue.
- **Strange (Opus): 7 blockers.** (1) moved or skipped This week rows are
  struck through; (2) faded names 4.36:1; (3) chart tags use warn amber;
  (4) a chore skipped this week looks due on Today and the family view;
  (5) vacation counts and visuals disagree (done rows leave the count,
  undone vacation rows not muted, turning vacation on lowered a live streak);
  (6) one person's vacation excuses a Together habit for everyone;
  (7) vacation Delete is optimistic. Notes: 44px rows (DESIGN asks 48),
  chip row scrolls sideways at 375, past-day rows look tappable, current
  move target unmarked, Edit BackLink context, Add field has no placeholder
  or cancel, vacation date wraps, Settings button wording during a
  vacation, stats page ignores moves, Restore jumps position, seven
  "Nothing this day." lines on an empty week. Not covered: the flame at 2+,
  the Sunday card, kid and tablet logins, real touch.

### F3 - Every pass 1 blocker, in one batch
- **Status:** OPEN.
- **Objective:** clear all 13 pass 1 blockers plus decisions 125, 126 and
  Hill's vacation rulings (127, 128), with tests, without changing anything
  else.
- **Engine (pure, tested):**
  - `weekChange`: active only when `spec?.schedule === "weekdays"`; test that
    an override on a weekly or monthly spec gives null state and null tag.
    `updateHabit` deletes the habit's override rows when its schedule
    leaves `weekdays`.
  - `isWeekday` exported from `habitVocabulary.ts` with a test; the three
    repair copies (`choreChart.ts`, `choreWrites.ts`, `weekOverrides.ts`)
    use it.
  - `isExcusedAllDay` in `weekOverrides.ts`; `allRequiredDoneToday` calls it.
  - One `dayInVacation(day, vacations)` in `habits/schedule.ts` with a test;
    the five copies (`streaks.ts`, `habitsStats.ts`, `choreStreak.ts`,
    `habitsFamily.ts`, `habitsToday.ts`) call it.
  - Decision 127 (vacation and streaks): a check actually done on a vacation
    day counts as done (grows the streak, counts in "x of y"); only undone
    vacation days are excused. Tests in `streaks`, `choreStreak`,
    `habitsToday`.
  - Counts: `doneCounts` leaves out only rows that are on vacation AND not
    done.
- **Access:** `canChangeChore(actor, habit, personId)` in `access.ts` with a
  test: a participant check plus decision 125 (a shared chore needs a parent
  or admin). `actions/choreChart.ts` calls it.
- **Writes:** `householdNow()` removed; callers pass `today` from
  `householdDate.ts`. Decision 126: the day being changed must be today or
  later (a moved turn can be moved again or skipped after its original day
  passed); tests. Saving or deleting a vacation recomputes streaks once per
  person, not once per habit.
- **Readers:** widen the override window used when aging streaks
  (`habitsRead.ts`, `habitsStatsRead.ts`) to cover every day the streak
  reads. The Together strip row never carries `onVacation`; only the
  vacationing person's own count leaves it out.
- **UI:**
  - `ChoreChart.tsx` WeekRow: no `line-through`; faded names
    `text-muted-strong`; tags use `QUIT_TAG_CLASS` from `HabitRow.tsx`
    (export it, one home). Sheet: a kid on a shared chore sees "Ask a
    parent to change a shared chore." and no actions (125); "Back to the
    default" hidden once the original day is past (126).
  - `HabitRow` and `FamilyHabitRow`: a `skippedThisWeek` row gets the dashed
    skip marker and a muted title, and no Skip swipe. Undone vacation rows
    use `text-muted-strong`.
  - `VacationCard.tsx`: Delete is `run(null, () => deleteVacation(id))`, no
    optimistic filter, disabled while pending; date gets `whitespace-nowrap`;
    the button wording per decision 128 ("Add a vacation" when a current
    or upcoming one exists, else "Turn on vacation mode"); the card line
    becomes "Anything you don't do counts as skipped. Streaks are safe and
    chores are excused." (127). The test at `streaks.test.ts` "a done row
    on it does not grow" flips (127).
- **Boundaries (may touch):** `src/lib/habits/{weekOverrides,schedule,
  streaks,choreStreak,choreWrites,vacationWrites,access}.ts` and their
  tests, `src/lib/habitVocabulary.ts` (+test), `src/lib/habitWrites.ts`,
  `src/lib/choreChart.ts` (+test), `src/lib/habitsStats.ts`,
  `src/lib/habitsFamily.ts`, `src/lib/habitsToday.ts`, `src/lib/habitsRead.ts`,
  `src/lib/habitsStatsRead.ts` and their tests,
  `src/app/actions/choreChart.ts`, `src/app/actions/vacations.ts`,
  `src/components/{ChoreChart,ChoreChartSheet,HabitRow,HabitFamilyColumn,
  HabitFamilyView,HabitTodayList,VacationCard}.tsx`, the rename
  `src/lib/habitsStatsPage.test.ts` -> `src/lib/habitsFamilyStatsPage.test.ts`
  (header naming its sibling).
- **Must not touch:** `prisma/`, `.env*`, `package.json`, STRUCTURE.md,
  DESIGN.md, plan and mission files, CLAUDE.md. No database commands.
- **Verification:** `npx tsc --noEmit`; `npx eslint` on touched files;
  `npm test`; `TZ=UTC` and `TZ=America/Los_Angeles` direct runs; build with
  the invalid DATABASE_URL, EXIT=0; `git grep -n "line-through" src/components/ChoreChart.tsx`
  empty; `git grep -n "householdNow"` empty.
- **Evidence:** each blocker mapped to file:line and the test that proves it;
  test counts for all three zones.

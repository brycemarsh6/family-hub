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
- **Status:** PENDING
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
- **Status:** PENDING
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
- **Status:** PENDING
- **Boundaries:** new `src/app/(app)/habits/chart/page.tsx`, new
  `src/components/ChoreChart.tsx` (and a sheet component if needed),
  `src/app/(app)/habits/manage/page.tsx` or `HabitManager.tsx` (the Manage
  row only).
- **Rules:** the ChoreChart board with 116 to 119 and 124; tablet sent to
  `/habits`; optimistic updates; 44px targets.

### C5 - Today, family view and Settings
- **Status:** PENDING
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

# Mission 30: Habits & Chores PR A, the engine and the move

**Project:** family-hub (Marshee)
**Status:** DELIVERED to a PR (Bryce: "1. Yes"); all gates PASS (Vision pass 3, Strange pass 2, Captain pass 3). Not merged.
**Started:** 2026-11-05 · **Updated:** 2026-11-05
**Branch:** `claude/habits-a-engine` from `origin/main` at `361e7e9` (PR #40 merged)
**Direction:** `.avengers/plans/habits-chores-v1.md` (decisions 68 to 83),
`.avengers/plans/habits-chores-audit.md` (Parts 3 and 4), and the approved
master build plan copied word for word to
`.avengers/plans/habits-chores-build.md`. **This mission builds only its
"PR A, mission 30" section**, plus the "data model" and "engine" sections
that PR A needs. PRs B to F are out of scope.

## Brief

- **Goal:** Move Plans & Goals habits onto new `Habit` tables with one check
  per person per day; ship the pure habit engine (`src/lib/habits/`) with
  tests in three time zones; rename the Routines menu item to Habits &
  Chores at `/habits` (Coming soon); add a Streaks switch to Settings and an
  admin-only "Recompute streaks" button.
- **Done means:**
  1. The full Gauntlet below is green.
  2. `grep -rn "db.planLog\|PlanLogRow" src/` prints nothing.
  3. Plans & Goals behaves as before (This week, the goal page, the
     dashboard tile, a Sunday-fixture recap), with one check per day and no
     "times a day".
  4. `/routines` and `/chores` redirect to `/habits`.
  5. The Streaks switch saves and survives a reload; the tablet (device)
     login is refused.
  6. The three migration counts match on dev and are recorded below.
- **Out of scope:** everything in PRs B to F (the Today list, manager,
  streak display, chores chart, vacations UI, nudges, dashboard tiles,
  report). Dropping `PlanLog` or the two old `PlanItem` columns (they stay,
  unread). Pushing, opening a PR, merging (Bryce's go only).

## Settled before contracts (do not re-open)

- Day columns are `DateTime` at UTC midnight, not `@db.Date`
  (`STRUCTURE.md` "No Prisma enums or provider-specific schema features";
  the build plan's "Settled on structure").
- Deleting a goal unlinks its habits (`PlanItem.habit` is SetNull);
  deleting a habit deletes the plan items pointing at it, in the same
  transaction.
- Weekday sets are 7-char masks, Sunday first. `ChoreWeekOverride` unique on
  `(habitId, weekStart, fromWeekday)`.
- **Fury's tooling call (2026-11-05):** the build plan says "generated with
  `npx prisma migrate dev --create-only`". This mission instead follows the
  mission-29 house pattern: Stark writes the SQL from `npx prisma migrate
  diff --from-schema <origin/main schema> --to-schema prisma/schema.prisma
  --script` and never touches the database; Fury reads the SQL line by line
  and applies it with `npx prisma migrate deploy` on dev. Reason: `migrate
  dev` can offer to reset a drifted database, and the dev branch holds real
  family data. The SQL produced is the same.

## Danger register

- Local dev runs against the Neon `dev` branch (`ep-hidden-pine`).
  Production's connection string lives only in Vercel. **Before any Prisma
  command that reaches a database, Fury confirms `DATABASE_URL`'s hostname
  is `ep-hidden-pine-…-pooler.us-west-2.aws.neon.tech`** (hostname only,
  never print `.env`). Confirmed 2026-11-05 at mission start. The worktree's
  `.env` is a gitignored symlink to the main checkout's.
- Forbidden for every agent: `npm run db:seed`, `npm run db:reset`, `prisma
  migrate reset`, `prisma db push`, `prisma migrate dev`. **Stark never
  touches the database** (no `migrate deploy`, no `db execute`, no scripts
  that connect). `npx prisma generate` and `npx prisma validate` are fine.
- Migration additive only: CREATE TABLE, CREATE INDEX, ADD CONSTRAINT, ALTER
  TABLE ADD COLUMN, plus the hand-written backfill (INSERT ... SELECT with
  ON CONFLICT DO NOTHING, and one value-only UPDATE of the new
  `PlanItem.habitId`). Nothing drops, renames, retypes or narrows.
- The dev branch holds real family data. Count rows, never quote them.
- Never write a clean or reset script for `User`.
- No push, no PR, no merge without Bryce's go-ahead. Stage by explicit
  path, never `git add -A` / `git add .`; `git show --stat HEAD` after
  every commit.
- `npm test` pins Denver; only the direct `TZ=UTC` and
  `TZ=America/Los_Angeles` runs prove the other zones. A new test directory
  ships its glob in `package.json` **and** `.github/workflows/ci.yml` in the
  same commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (559 before this mission; must rise)
- `TZ=UTC node --import tsx --test <the package.json glob>`
- `TZ=America/Los_Angeles node --import tsx --test <the package.json glob>`
- `npm run build`
- `node ~/.claude/skills/avengers/recordcheck.mjs` over the mission range
- Migration: `npx prisma validate`; after Fury applies, `npx prisma migrate
  status` clean on dev.

## Assembled

Stark (builder) and Vision (correctness, **`model: "opus"`** on every
dispatch, since `vision.md` still says fable). Captain (new tables, a new
`src/lib/habits/` module, a large diff). Strange (the Settings row and the
renamed menu item are visible). Banner not needed: the build plan already
carries file:line facts and Fury read the rest inline. Every gate on Opus
5.5. Budget 3 passes per gate.

## Facts the contracts hang on

- Baseline at `361e7e9`: `npm test` 559 pass; `tsc` clean.
- Test glob today (`package.json:11`, `ci.yml:64,66`):
  `src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`.
  C1 adds `src/lib/habits/*.test.ts` to all three.
- Date helpers in `src/lib/householdDate.ts`: `CalendarDate`,
  `calendarDateInZone`, `addCalendarDays`, `calendarDaysBetween`,
  `dayOfWeek`, `utcMidnightInstant`, `startOfWeek` (Sunday),
  `startOfMonth`. `householdToday` in `src/lib/assistant/today.ts:21`.
- `MANAGER_ROLES` at `src/lib/constants.ts:243` (`["admin", "parent"]`).
  `constants.ts` is 346 lines: add nothing to it.
- `src/lib/prismaErrors.ts` has only `isMissingRowError` (P2025).
- Old model: `PlanItem.timesPerPeriod` + `period` ("day" | "week" |
  "month"); `PlanLog` is one row per tap, `@@index([planItemId, day])`, no
  unique. `User.role` default "kid"; `User.deactivatedAt`.
- Route references to change: `src/lib/nav.ts:30`,
  `src/lib/routeRedirects.ts:8` (`/chores → /routines` today),
  `src/app/(app)/routines/page.tsx`, a comment in
  `src/app/(app)/(home)/loading.tsx:7`.
- Size: soft cap 350 lines, hard cap 650 (`STRUCTURE.md`).
  `actions/planItems.ts` is 247, `goals.ts` 249, `goalsProgress.ts` 220.

## Fury's pre-dispatch checklist

(From the template; applied per dispatch.)
- [ ] Grep exports before forbidding. [ ] No two parallel contracts name the
  same file. [ ] Fix lives where the behaviour is decided. [ ] Preflight run
  and read. [ ] Contract written here. [ ] Numbers re-measured. [ ] HEAD
  quoted last. [ ] `git show --stat HEAD` after commits. [ ] No commits
  while a gate runs. [ ] recordcheck before handing over records.

## Contracts

Order: **C1 and C2 in parallel**, then **C3**, then **C4 and C5 in
parallel**, then **C6**. Each is one Stark dispatch. The build plan
(`.avengers/plans/habits-chores-build.md`) sections "The data model",
"The engine" and "PR A, mission 30" are part of every contract; where a
contract below is silent, the plan's words bind.

### C1 - Vocabulary and the pure engine
- **Status:** DONE (Stark; Fury re-ran: 628 tests in Denver, UTC (621 pass + 7 skipped, the same 7 skipped on origin/main's glob) and LA; tsc and eslint clean)
- **Report notes for C3/C4:** `dueState(spec, day, planned, doneInPeriod = 0)`; `carriedFrom(spec, carryOver, logs, today, since?)` with a 14-day lookback; `computeStreaks` returns `asOf` = today except an open kind's unmet current period (then the day before it starts), and C3 caches it unchanged; `streakAfter` is display only. `canEdit`/`canLogFor` also require `canSee`, so a non-participant manager cannot act on a private habit (decision 78). `late` counts toward progress, not streaks. `scheduleFromRow` returns null for an empty weekdays mask or a biweekly with no anchor.
- **Objective:** Write `src/lib/habitVocabulary.ts` and the pure modules of
  `src/lib/habits/` (`types.ts`, `schedule.ts`, `progress.ts`,
  `carryOver.ts`, `streaks.ts`, `perfectDays.ts`, `planPrompts.ts`,
  `access.ts`), each with a test, implementing every rule in the plan's
  engine section and decisions 69 to 72, 77 to 80 and audit D3.
- **Boundaries:** may touch: new `src/lib/habitVocabulary.ts`,
  new `src/lib/habitVocabulary.test.ts`, new `src/lib/habits/*.ts` (all but the writes module, which is C3), `package.json` (test script glob only),
  `.github/workflows/ci.yml` (the two test globs only) · must not touch:
  `prisma/`, `src/app/`, `src/components/`, the generated Prisma client, any existing
  file in `src/lib/`.
- **Rules to pin with tests:** no db, no React, no `server-only`, no
  "today" made inside lib (callers pass a `CalendarDate`). Vocabulary:
  `HABIT_KINDS`, `HABIT_MODES`, `HABIT_SCHEDULES`, `HABIT_SHARING`,
  `HABIT_LOG_STATUSES`, `TIMES_OF_DAY`, `HABIT_ICONS` (a starter allow-list
  of Lucide names) with `toX()` narrowers that repair odd values, and a
  weekday-mask parser/printer (`"0100100"`, Sunday first, invalid → null).
  Schedule: `dueState` returns required on scheduled days for daily /
  weekdays / biweekly-with-days, open for weekly / monthly /
  biweekly-without-days until the target is met (then none), and required
  on a planned day; biweekly parity from `anchorWeek`. Progress:
  `windowProgress` keeps daily's "7 this week" target; `distinctDays`
  collapses participants. Carry-over: only scheduled kinds; latest
  scheduled day before today with no row; null when today is scheduled
  (absorbed). Streaks (`computeStreaks`, `streakAfter`): due days only for
  daily / weekdays; periods for weekly / monthly (current period counts once
  N is reached); skipped and vacation excused (survive, don't grow);
  "late" breaks; today never breaks until it is over. Access: `canSee`
  (private only to participants; device never sees private), `canEdit`
  (never a device; participant or manager), `canLogFor` (self; device for
  any participant; manager for any participant; forUserId must be a
  participant).
- **Verification:** `npx tsc --noEmit` → 0 errors; `npx eslint
  src/lib/habits src/lib/habitVocabulary.ts src/lib/habitVocabulary.test.ts`
  → clean; `npm test`, `TZ=UTC node --import tsx --test <glob>`,
  `TZ=America/Los_Angeles node --import tsx --test <glob>` → all pass, count
  above 559 and identical across the three zones.
- **Evidence required:** the three test summaries (tests / pass / fail);
  `wc -l` of every new file; the diff of `package.json` and `ci.yml`; a
  list mapping each rule above to its test name; `grep -rn "new Date()"
  src/lib/habits` output (expected: none outside tests).
- **Done criteria:** Fury re-runs the three test runs and sees the same
  higher count; every new file under 350 lines; the glob lives in all three
  places.

### C2 - Schema and migration
- **Status:** DONE (Stark; Fury read every SQL line, applied on dev, counts and rolled-back positive control below)
- **Objective:** Add the plan's models (`Habit`, `HabitParticipant`,
  `HabitLog`, `HabitPlannedDay`, `ChoreWeekOverride`, `VacationPeriod`,
  `Nudge`), `PlanItem.habitId` (SetNull, indexed), `UserPreferences.
  showStreaks Boolean @default(true)` and the `User` back-relations to
  `prisma/schema.prisma`, with `///` doc comments in the file's style, and
  write `prisma/migrations/20261106000000_add_habits/migration.sql`.
- **Boundaries:** may touch: `prisma/schema.prisma`,
  new `prisma/migrations/20261106000000_add_habits/migration.sql`,
  and the gitignored generated client (rewritten by `npx prisma generate`
  only) ·  must not touch:
  everything else in `src/`, other migrations, `prisma/seed.ts`, the
  database.
- **Size note:** `prisma/schema.prisma` is 881 lines, over the 650 hard cap
  before this mission. Justification: Prisma reads one schema file and the
  house has never split it (mission 29 added `GoalCheckIn` the same way).
  Splitting it is a Captain question for a later mission.
- **How:** `git show origin/main:prisma/schema.prisma > <scratchpad>/old.prisma`;
  `npx prisma migrate diff --from-schema <old> --to-schema
  prisma/schema.prisma --script` for the DDL; then the backfill appended by
  hand under a reasoning comment (precedent:
  `prisma/migrations/20261105000000_add_goal_check_ins/migration.sql`),
  steps 1 to 4 exactly as the plan's "Migration" paragraph defines them
  (ids `'h_' || p.id`; day→daily, week→weekly `LEAST(times,7)`,
  month→monthly `LEAST(times,31)`; Together = `g."ownerId" IS NULL` →
  every active non-device user; `DISTINCT ON ("planItemId", day)` earliest
  tap keeps `loggedById`; `ON CONFLICT DO NOTHING`; the one UPDATE guarded
  by `"habitId" IS NULL`). Every statement idempotent on a re-run (the DDL
  is applied once by Prisma; the backfill must be safe to run twice). Also
  write `<scratchpad>/counts.sql`: read-only SELECTs giving (a) habit plan
  items, (b) expected participant rows, (c) expected log rows (distinct
  item+day × participants), and (d) actual `Habit`, `HabitParticipant`,
  `HabitLog` counts, for Fury to run.
- **Verification:** `npx prisma validate` → valid; `npx prisma generate` →
  ok; `npx tsc --noEmit` → 0 errors; `grep -inE "drop|rename|alter column|
  truncate|delete" migration.sql` → nothing (the word "DELETE" may appear
  only inside `ON DELETE` clauses; list each hit).
- **Evidence required:** the full migration SQL pasted; the grep output; a
  line saying which statements are DDL and which are backfill.
- **Done criteria:** Fury reads every line, confirms the host, records
  before-counts, applies with `npx prisma migrate deploy`, records
  after-counts, runs `npx prisma migrate status`. (Fury-only steps.)

### C3 - Server modules
- **Status:** DONE (Stark; Fury re-ran: 637 tests in three zones, tsc and eslint clean, both server files open with server-only). Signatures: every write takes `today` before `client`; `checkHabit` returns `{ created, userIds }`; a private `atomically` opens `db.$transaction` when no client is passed. `updateHabit` does not change participants. Write paths have no db test (no harness); Fury runs a rolled-back smoke test on dev.
- **Objective:** Write `src/lib/habits/habitWrites.ts` (every write the
  plan's engine section lists) and `src/lib/habitsRead.ts`
  (`loadHabitsForPlan(habitIds, from)`), and add `isUniqueViolationError`
  (P2002) to `src/lib/prismaErrors.ts`.
- **Boundaries:** may touch: new `src/lib/habits/habitWrites.ts`,
  new `src/lib/habitsRead.ts`, `src/lib/prismaErrors.ts`, new
  `src/lib/prismaErrors.test.ts` (optional), new
  `src/lib/habits/habitRows.ts` and new `src/lib/habits/habitRows.test.ts`
  (pure row-to-engine helpers; added at dispatch) · must not touch:
  `prisma/`, `src/app/`, `src/components/`, every other existing lib file,
  C1's files (read them; report a needed change as BLOCKED-ON-CONTRACT).
- **Rules:** both files open with `import "server-only"`; no
  `revalidatePath`, no `getVerified*`, no auth; every function takes
  `client: Prisma.TransactionClient = db` (copy `src/lib/pantryWrites.ts`
  118 to 135). `checkHabit` writes one row, or one per participant for
  Together, with `createMany({ skipDuplicates: true })` and returns
  `{ created }`, then recomputes streaks for the affected participants via
  `computeStreaks`; `uncheckNewest` deletes the newest log in a window;
  `deleteHabit` deletes the plan items pointing at the habit in the same
  transaction; `updateHabit` recomputes when the schedule changes;
  `recomputeAllStreaks(today)` walks every active participant. Stored days
  go through `utcMidnightInstant`; reads convert once with
  `calendarDateInZone(d, "UTC")`.
- **Verification:** `npx tsc --noEmit`; `npx eslint` on the files; `npm
  test` unchanged or higher; `grep -n "server-only\|revalidatePath\|getVerified"`
  on both files; `grep -c "client: Prisma.TransactionClient"
  habitWrites.ts` ≥ the number of exported writes.
- **Evidence required:** the greps; `wc -l`; the list of exported functions
  with signatures.
- **Done criteria:** both start with `server-only`; no auth or revalidation
  inside; every write takes `client`; under 350 lines each.

### F1 - Engine fixes from Vision pass 1
- **Status:** DONE (Stark; Fury re-ran Vision's probe: Sat streak 0 = truth, carriedFrom null, biweekly Wed anchor 2 due days; 641 tests). Commit 6dc0c74.
- **Objective:** Fix Vision pass 1's two BLOCKERs and the anchor NOTE in the
  pure engine, with tests that would have caught each.
- **Boundaries:** may touch: `src/lib/habits/streaks.ts`,
  `src/lib/habits/streaks.test.ts`, `src/lib/habits/carryOver.ts`,
  `src/lib/habits/carryOver.test.ts`, `src/lib/habits/schedule.ts`,
  `src/lib/habits/schedule.test.ts` · must not touch: every other file
  (C4 and C5 run in parallel on their own files).
- **Fixes:** (1) `computeStreaks`, scheduled kinds: `asOf` is the day before
  today when today is scheduled, not on vacation, and has no done or
  skipped row; else today. (2) `carriedFrom`: walking back from yesterday,
  stop at the first scheduled day (still inside `since` and the lookback);
  return it if it has no row, else null. Flip the test that pins the old
  behaviour; add the Mon/Wed case. (3) `scheduleFromRow` reads
  `startOfWeek(anchorWeek)` so a non-Sunday anchor still works.
- **Verification:** three-zone test runs, tsc, eslint; new tests: a cache
  written on an undone due day, aged one day, breaks; the "streakAfter
  agrees with computeStreaks" test seeds the cache on several days
  including an undone due day; Mon missed, Wed done, Thu → null; biweekly
  with a Wednesday anchor has due days.
- **Done criteria:** Fury re-runs; Vision pass 2.

### C4 - Rewire Plans & Goals
- **Status:** BUILT (Stark; Fury re-ran: 653 tests in three zones, tsc and `eslint .` clean, the planLog grep empty). Browser checks pending.
- **Report notes:** a device (or a later-joining person) logging a Together habit is routed by `habitCheckTarget` in `goals.ts` (Mine → owner; Together → the tapper if a participant, else the first participant; the fan-out writes everyone anyway). Legacy `timesPerPeriod`/`period` are still written on save so an older deployment and the unlinked-item fallback can read them. Editing from the Plans sheet sets only schedule, times and title: it does not clear `weekdays`/`anchorWeek` (harmless in PR A; PR B must handle it). `goals.test.ts` is 379 lines (soft cap 350, was 335).
- **From Vision pass 1:** handle a habit plan item with `habitId` null (an item created by the old deployment during the build window) without crashing: show it as 0 progress and refuse logging with a clear message, or similar.
- **Objective:** Make Plans & Goals read and write habits through the new
  tables exactly as the plan's "Rewiring Plans & Goals" paragraph says,
  with one check per day and no "times a day", keeping every page and
  signature the same.
- **Boundaries:** may touch: `src/lib/goalsProgress.ts`,
  `src/lib/goalsProgress.test.ts`, `src/lib/goals.ts`,
  `src/lib/goals.test.ts`, `src/lib/goalsRead.ts`, `src/lib/goalsRecap.ts`,
  `src/lib/goalsRecap.test.ts`, `src/lib/planItemChanges.ts`,
  `src/lib/planItemChanges.test.ts`, `src/lib/habits/progress.test.ts`
  (moving the old window tests in), `src/app/actions/planItems.ts`,
  new `src/app/actions/planHabits.ts` (only if `planItems.ts` would pass 350), `src/app/actions/goals.ts` (`deleteGoal` only),
  `src/components/PlanItemRow.tsx`, `src/components/PlanItemSheet.tsx` ·
  must not touch: `prisma/`, `habitWrites.ts`, `habitsRead.ts` and the
  other C1/C3 modules (BLOCKED-ON-CONTRACT if one needs a change), C5's
  files, `ThisWeekList`, `GoalDetail`, `GoalCard`, `GoalsTile`, the pages.
- **Verification:** the full Gauntlet minus build; `grep -rn
  "db.planLog\|PlanLogRow" src/` → empty; a test proving three taps on one
  day yield one check (`created === 0` path returns `{}`); a Sunday recap
  fixture test still passing.
- **Evidence required:** test summaries in three zones; the grep; `wc -l`
  of every touched file; a list of each old behaviour and the test that
  proves it unchanged.
- **Done criteria:** Fury re-runs; Vision exercises This week, the goal
  page and the tile on dev.

### C5 - Route, menu and Settings
- **Status:** BUILT, committed a36c5b3; browser checks pending (after C4). Device refusal at `src/app/actions/preferences.ts:89` (session, not input); Settings hides the section from devices. No automated test of the refusal (no action harness).
- **Objective:** Add `/habits` (Coming soon, `requireVerifiedUser`), remove
  `/routines`, redirect `/routines` and `/chores` to `/habits`, rename the
  menu item, and add the Streaks switch and admin-only "Recompute streaks"
  button to Settings.
- **Boundaries:** may touch: new `src/app/(app)/habits/page.tsx`,
  `src/app/(app)/routines/page.tsx` (deleted), `src/lib/routeRedirects.ts`,
  `src/lib/routeRedirects.test.ts`, `src/lib/nav.ts`, `src/lib/nav.test.ts`,
  `src/app/(app)/(home)/loading.tsx` (comment only),
  new `src/components/HabitsChoresSettings.tsx`,
  `src/app/(app)/settings/page.tsx`, `src/app/actions/preferences.ts`,
  new `src/app/actions/habits.ts`, `src/lib/dal.ts` · must not touch:
  `prisma/`, C1/C3/C4 files.
- **Rules:** `nav.ts` entry `{ href: "/habits", label: "Habits & Chores",
  icon: ListChecks }`. The switch row copies the `NavModeSetting` save
  pattern and uses `ToggleSwitch`; `saveShowStreaks` refuses a device login
  like `saveDashboardLayout`; `dal.ts` adds `showStreaks` to
  `VerifiedUser` beside `navMode` (default true when no row). The
  Recompute button shows only to admins and calls
  `recomputeStreaks` in `actions/habits.ts`, which checks admin itself and
  calls `recomputeAllStreaks(householdToday(new Date())!)`. Wording: section
  "Habits & Chores", row "Show streaks", button "Recompute streaks" (the
  build plan's words; Bryce may change them at review).
- **Verification:** Gauntlet minus build; `routeRedirects.test.ts` pins both
  new redirects; in `preview_start` on dev: `/routines` and `/chores` land
  on `/habits`; toggling the switch, reloading, the value holds; a device
  call to `saveShowStreaks` is refused (test or direct evidence).
- **Evidence required:** test output; screenshots of Settings and the
  drawer; the refusal evidence.
- **Done criteria:** Fury and Strange see it in the browser.

### F2 - Fixes from Captain pass 1 and Strange pass 1
- **Status:** DONE (Stark; Fury re-ran 653 tests in three zones and tsc; Stark ran eslint . and build). Inside-own-file exports (`householdParticipantIds`, `uncheckHabit`, `recomputeStreaks`, `countDays`, the vocabulary arrays) carry no dormant note: they have callers. Under `TZ=Pacific/Auckland` 8 untouched calendar tests fail (not a gauntlet zone; not checked against main).
- **Objective:** Clear Captain's three BLOCKERs and Strange's one, plus the
  cheap NOTEs listed below, without changing behaviour.
- **Boundaries:** may touch: `src/lib/habits/*.ts` (not tests unless a
  rename needs it; tests may be updated for renames and moved helpers),
  `src/lib/habitVocabulary.ts`, `src/lib/habitsRead.ts`,
  `src/lib/householdDate.ts`, `src/lib/householdDate.test.ts`,
  `src/lib/prismaErrors.ts`, `src/lib/goals.ts`, `src/lib/goals.test.ts`,
  new `src/lib/goalsHabitInput.test.ts`, `src/lib/goalsProgress.ts`,
  `src/lib/goalVocabulary.ts`, `src/app/actions/planItems.ts`,
  `src/app/actions/habits.ts`, `src/app/actions/mealPlans.ts`,
  `src/app/actions/visions.ts`, `src/components/HabitsChoresSettings.tsx`,
  `src/components/PlanItemSheet.tsx`, `src/components/LogButton.tsx`,
  `src/app/(app)/settings/page.tsx` · must not touch: `prisma/`, records,
  everything else.
- **Captain BLOCKERs:** (1) every dormant export carries a one-line
  dormant comment naming its consuming PR and mission (PR B / mission 31
  for most; `perfectDays.ts` PR C / mission 32; `isPromptDay` PR E /
  mission 34). (2) `storedDay` moves to `householdDate.ts` as
  `calendarDateFromUtcMidnight` under `utcMidnightInstant`, with a test;
  every inline `calendarDateInZone(x, "UTC")` for a stored day in the new
  code uses it. (3) The Together-participant query moves out of
  `planItems.ts` into `habitWrites.ts` (`householdParticipantIds(client)`).
- **Strange BLOCKER:** Settings order: Manage family back right after Menu
  style (`mt-6`), the Habits & Chores section last; update the file's top
  comment.
- **NOTEs taken now:** `isUniqueViolationError` made live by replacing the
  inline P2002 checks in `actions/mealPlans.ts` and `actions/visions.ts`;
  `HABIT_TIMES_LIMITS` (weekly 7, monthly 31) in `habitVocabulary.ts`, used
  by `schedule.ts` and `goals.ts`; `PERIOD_LABELS` moves to
  `goalVocabulary.ts`; rename `access.ts` to `canSeeHabit`/`canEditHabit`
  and the action to `recomputeAllStreaks`; type `HabitFields` with the
  vocabulary types; `undoHabitLog`'s invented fallback schedule goes (use
  the item's own window); `whitespace-nowrap` on the period buttons;
  `LogButton.tsx` top comment says "until today has its check"; the
  recompute result says "1 streak" for one (still "N streaks" otherwise);
  split `goals.test.ts` so it is under 350 (new `goalsHabitInput.test.ts`).
- **Verification:** three-zone tests (count unchanged or higher), tsc,
  `eslint .`, `npm run build`; `grep -rn 'calendarDateInZone([^,]*, "UTC")'
  src/lib/habits src/lib/habitsRead.ts` → empty; `grep -n "deactivatedAt"
  src/app/actions/planItems.ts` → empty.
- **Done criteria:** Captain pass 2, Strange pass 2, Vision pass 3 on the
  F2 diff.

### F3 - Fix from Captain pass 2
- **Status:** DONE (Stark; Fury re-ran LA, 654 tests). Commit eaa80b5.
- **Objective:** Move the Mine-or-Together participant choice out of the
  action into the goal policy file.
- **Boundaries:** may touch: `src/lib/goals.ts`,
  `src/lib/goalsHabitInput.test.ts`, `src/app/actions/planItems.ts` ·
  must not touch: everything else (C6 runs in parallel on records).
- **Fix:** add `habitParticipantsFor(goal: { ownerId: string | null }):
  string[] | "household"` beside `habitCheckTarget` in `goals.ts` (no
  import of `habitWrites`); call it at `planItems.ts:143`; one test.
- **Verification:** three-zone tests, tsc, `eslint .`; `grep -n "ownerId"
  src/app/actions/planItems.ts` shows no Mine/Together comparison.
- **Done criteria:** Captain pass 3.

### C6 - Records
- **Status:** BUILT (Stark, 2026-11-05; A1 to A6 pasted into STRUCTURE.md with the A6 callers corrected; gates pending)
- **Objective:** Bring the records up to date: CLAUDE.md "What's built" and
  "Current status"; STRUCTURE.md one-source list (`habitVocabulary.ts`,
  `src/lib/habits/`, `habitsRead.ts` as the only reader of habit rows for
  pages); `habits-chores-v1.md` noting PR A built; this mission file.
- **Boundaries:** may touch: `CLAUDE.md`, `STRUCTURE.md`, `AGENTS.md`
  (the direct-timezone test command only: add `src/lib/habits/*.test.ts`),
  `.avengers/plans/habits-chores-v1.md`, this file · must not touch: code.
- **STRUCTURE.md text:** Captain pass 2's A1 to A6 (in the gate ledger
  section below, "Captain amendments"). A7 and A8 need Bryce's approval and
  are **not** pasted; they are listed under Delivery as decisions.
- **Verification:** `node ~/.claude/skills/avengers/recordcheck.mjs` →
  0 hard failures, every REVIEW line read; CLAUDE.md under ~250 lines.
- **Done criteria:** every claim names its file and is checked by command.

## Migration counts (dev, Fury)

Host confirmed `ep-hidden-pine-…-pooler` before `npx prisma migrate deploy`
(2026-11-05); `migrate status` afterwards: "Database schema is up to date!"
(21 migrations). Counts by `counts.sql` inside a READ ONLY transaction.

| Count | Before (old tables) | Expected | Actual after migrate |
|---|---|---|---|
| Habit plan items = `Habit` rows | 0 | 0 | 0 |
| Participant rows | 0 | 0 | 0 |
| Log rows (distinct item+day × participants) | 0 PlanLog rows | 0 | 0 |

The dev snapshot holds no habits yet, so these zeros prove only that the
migration applied. **Positive control (rolled back, nothing persisted):**
inside one `BEGIN … ROLLBACK` on dev, Fury inserted fixture rows (a
Together goal with a 3-a-day habit tapped three times on Tue 2026-11-03 and
once on Wed; a private Mine goal with a 9-a-week habit tapped twice on one
day, a 40-a-month habit, and a step), ran the backfill, counted, ran the
backfill again, counted again:

- After the first run and after the re-run, identical: 3 habit items = 3
  habits; 7 expected participants = 7; 11 expected logs = 11.
- Together daily habit: 5 participants (every active non-device user), 10
  logs (2 days × 5: **three taps on one Tuesday became one check each**).
  Weekly 9 became 7; monthly 40 became 31; both `each` and private; the step
  was not migrated; every habit item linked (`PlanItem.habitId` set).
- After rollback: 0 fixture goals and 0 `Habit` rows on dev.

Production's real counts get checked after merge (Bryce's Neon console or
Fury's read-only script against production is **not** available: its
connection string lives only in Vercel).
## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision (C1 to C3) | BLOCKED | 2: `computeStreaks` asOf on an undone due day; `carriedFrom` walks past an absorbing day | anchor not snapped to Sunday; manual backfill re-run needs bare ON CONFLICT; C4 must handle null `habitId`; concurrent recompute staleness; uncheckNewest removes skips; monthly N above days in month; future skips; zone tests are pure UTC math |
| 2 | Vision (whole mission) | PASS | none | later-joining non-manager can't log a Together habit (participants frozen at creation); goal visibility/area edits don't sync to Habit; stale-page undo removes yesterday's check (as main); outer tx 5s timeout; no action-level tests; build-window PlanLogs not migrated |
| 1 | Captain | BLOCKED | 3: dormant exports unmarked; `storedDay` outside `householdDate.ts`; Together-participant rule in an action | two household-people filters; limits defined twice; plan↔habit mapping split; labels in a component; name collisions; `HabitFields` loosely typed; invented fallback in `undoHabitLog`; `goals.test.ts` over soft cap; AGENTS.md glob stale; amendments A1 to A8 drafted |
| 1 | Strange | BLOCKED | 1: Manage family reads as part of Habits & Chores | "Updated 5 streaks" counts records, no singular; "6 left" can exceed days left (Bryce); filled check = checked today; "Every day" wraps; mixed-case strip; dark segment contrast (as main); sheet jumps when stepper hides; device Settings not walked |
| 3 | Vision (F2) | PASS | none | `visions.ts` P2002 check now also requires the Prisma error class (no real input differs); test-only cast in `habitRows.test.ts`; `icon`/`lifeArea`/`timeOfDay` still plain strings |
| 2 | Strange | PASS | none | Settings top group has no heading; dark period strip selection faint (as main); one missed first tap on "Every day" in the test browser, not reproduced (check on a phone) |
| 2 | Captain | BLOCKED | 1: `planItems.ts:143` compares `goal.ownerId` to pick participants (goal policy rule) | two household-people filters remain (A8); action/lib share the name `recomputeAllStreaks` via an alias (A6); `goals.test.ts` 344/350; four older inline UTC reads grandfathered (A3); AGENTS.md glob stale |

| 3 | Captain | PASS | none | `goals.test.ts` 344/350 (next goal test in a new file); A7 and A8 wait for Bryce; four grandfathered inline UTC reads |

### Captain amendments (pass 2 text; C6 pastes A1 to A6 into STRUCTURE.md "One source of truth")

- **A1.** `src/lib/habitVocabulary.ts` holds Habits & Chores' vocabulary: `HABIT_KINDS`, `HABIT_MODES`, `HABIT_SCHEDULES` with `HABIT_SCHEDULE_LABELS` (the habit editor's words), `HABIT_SHARING`, `HABIT_LOG_STATUSES`, `TIMES_OF_DAY`, `HABIT_ICONS`, the weekday mask (`parseWeekdayMask` / `printWeekdayMask`) and the `to*` repairers. `HABIT_TIMES_LIMITS` (weekly 7, monthly 31) is the one answer to "how many times can a period ask for". `schedule.ts` clamps with it and `goals.ts`'s `HABIT_TIMES_MAX` derives from it, so a literal 7 or 31 for a habit limit anywhere else is a BLOCKER. The file has **no imports**, so any lib file may take words from it without risking a cycle. Plan-item period wording ("Every day", "a week", "a month") is `PERIOD_LABELS` in `goalVocabulary.ts`, beside `HABIT_PERIODS`. These are two different vocabularies (`HabitPeriod` on a goal's plan, `HabitSchedule` on a habit) and stay apart on purpose. (Added mission-30.)
- **A2.** `src/lib/habits/` is the habit engine, a domain subdirectory under the `src/lib/voice/` precedent. `schedule.ts`, `carryOver.ts`, `streaks.ts`, `progress.ts`, `perfectDays.ts`, `planPrompts.ts`, `access.ts`, `habitRows.ts` and `types.ts` are pure: no Prisma client, no `db`, and callers pass `today`. `habitWrites.ts` (`server-only`) is the only writer of the `Habit`, `HabitParticipant` and `HabitLog` tables, and of the cached streak columns. `src/lib/habitsRead.ts` is the only page reader of habit rows. **Dependency direction:** `src/lib/habits/` may import `habitVocabulary.ts`, `householdDate.ts`, `constants.ts`, `db.ts` and the generated client (types). It never imports `goals*.ts`, `goalVocabulary.ts` or `visions*.ts`. The goals side may import the engine (`goalsProgress.ts` takes `habits/progress`, and `goals.ts` takes the `HabitFields` type only). `src/lib/habits/*.test.ts` is in `package.json`'s test script and both CI timezone steps. (Added mission-30.)
- **A3.** `calendarDateFromUtcMidnight` in `householdDate.ts`, defined right under `utcMidnightInstant`, is the only way to read a stored UTC-midnight day column (`HabitLog.day`, vacation days, `anchorWeek`, `streakAsOf`, all-day dates) back as a `CalendarDate`. `utcMidnightInstant` is the only way to write one. New code that inlines `calendarDateInZone(x, "UTC")` for a stored day is a BLOCKER. Four older `goal.targetDate` sites are grandfathered and move to the helper in the next mission that touches each one: `plans/goals/[id]/page.tsx`, `plans/goals/[id]/edit/page.tsx`, `actions/goals.ts` and `goalsProgress.ts`. (Added mission-30.)
- **A4.** `householdParticipantIds(client)` in `habits/habitWrites.ts` is the one rule for who holds a Together habit: every active person who is not a shared device login. Callers ask for it with `createHabit`'s `participantIds: "household"`. They never query `User` for participants themselves, and an action that filters on `deactivatedAt` or `role` to pick habit participants is a BLOCKER. (Added mission-30.)
- **A5.** `habits/access.ts` is the only habit policy: `canSeeHabit`, `canEditHabit` and `canLogFor`. They carry the `Habit` suffix so they never collide with `goals.ts`'s `canSee` / `canEdit` in a search or an import. An action, page or component that checks a habit's `isPrivate` or participant list itself is a BLOCKER. The plan-to-habit glue lives in `goals.ts` beside the goal policy: `habitInputFromPlan` (a plan item's fields become a Habit's), `habitParticipantsFor` (a Mine goal's owner, or the household) and `habitCheckTarget` (whose row a tap writes). It is pinned by `goalsHabitInput.test.ts`, and nothing outside `goals.ts` maps a goal to a habit. (Added mission-30.)
- **A6.** The "Recompute streaks" door is the admin-only action `recomputeAllStreaks` in `src/app/actions/habits.ts`. It wraps the lib function of the same name in `habitWrites.ts`, imported as `rebuildAllStreaks`; that alias is deliberate, and new action files that wrap a same-named lib function do the same. Only `recomputeStreaks` / `recomputeAllStreaks` in `habitWrites.ts` write `currentStreak`, `bestStreak` and `streakAsOf`. `isUniqueViolationError` in `src/lib/prismaErrors.ts` is the only Prisma P2002 check (callers: `actions/mealPlans.ts` and `actions/visions.ts`; corrected by C6, the habit writes have no P2002 check); an inline `code === "P2002"` is a BLOCKER. (Added mission-30.)
- **A7 (needs Bryce's approval, not pasted).** Built-ahead engines: an export dormant by a written multi-PR plan may wait for the PR its "Dormant until PR X (mission N)" comment names; if mission N ships without calling it, the normal rule resumes. (Without it, `isPerfectDay` and `isPromptDay` would have to be deleted at mission 32.)
- **A8 (needs Bryce's approval, not pasted).** One "household people" rule (active, not a device) in `src/lib/householdPeople.ts`, used by `householdParticipantIds` and `visionsRead.ts`; the two copies today are named debt.

## Handoff log

- 2026-11-05: Mission file written; branch `claude/habits-a-engine` from
  `origin/main` 361e7e9; plan files copied in; dev host confirmed;
  `npm ci` and `prisma generate` in the worktree; baseline 559 tests. Next:
  dispatch C1 and C2 in parallel.
- 2026-11-05: C1 and C2 dispatched in parallel at 94e2161. Fury's read-only
  baseline on dev (READ ONLY transaction, host checked by the script): 0
  habit plan items, 0 PlanLog rows, 0 distinct item-days, 5 active
  non-device users, 20 migrations applied. **The dev snapshot predates any
  real habit, so the dev counts will be 0 = 0 = 0.** Plan: after applying,
  prove the backfill with fixture rows inside a transaction that is rolled
  back (nothing persists), and recheck the real counts on production after
  merge.
- 2026-11-05: C2 done, applied on dev (counts above), committed. C1 done,
  verified, committed. Next: C3.
- 2026-11-05: C3 done, committed 39633b6. Vision pass 1 dispatched on
  94e2161..39633b6 (model opus). While it ran, Fury ran a **rolled-back
  smoke test of habitWrites on dev** (one `db.$transaction` that throws at
  the end; host checked; script `writes-smoke.mts` in the scratchpad):
  a Together daily habit for 2 people, checked on Nov 3, 4, 5 → created 2
  each; a second check on Nov 5 → created 0; 6 logs; both streaks 3, best 3,
  asOf 2026-11-05 UTC midnight; `uncheckNewest` removed 2 (Nov 5) and
  streaks fell to 2; skip on Nov 5 created 2; `deleteHabit` removed the
  linked plan item (0 left on the goal). After rollback: 0 fixture habits,
  0 fixture goals.

- 2026-11-05: Vision pass 1 BLOCKED (two engine bugs, both reproduced by
  Vision's probe). F1 written; F1, C4 and C5 dispatched in parallel
  (disjoint files; C4 and C5 do not depend on the fixed functions).

- 2026-11-05: **Incident, caught and fixed before anything left the
  machine.** C5 ran `git rm` on the routines page (staging it), and Fury's
  by-path F1 commit swept that staged deletion in (7 files, not 6): the
  AGENTS.md staging hazard in a new form, since `git commit` takes the
  whole index, not just the paths Fury named. Fury soft-reset the local
  commit, unstaged the deletion and recommitted F1 as 6dc0c74 (6 files);
  C5 then committed as a36c5b3. Rule from here: `git diff --cached
  --name-only` before every commit, and builders never stage.

- 2026-11-05: C4 committed. `npm run build` passes (route list shows
  `/habits`). **Fury's browser walk** (dev server :3000 on the worktree,
  signed in as Bryce, 800px dark): `/routines` and `/chores` both land on
  `/habits` ("Habits & Chores"); Settings shows "Habits & Chores" with Show
  streaks and (admin) Recompute streaks; switch off → reload → off; on →
  reload → on (left on); Recompute → "Updated 0 streaks" (dev has no
  habits). Test goal "zz mission30 test" (Health, Together, Dec 31) with a
  daily habit "zz walk": sheet shows Every day / a week / a month, stepper
  hidden for Every day; row "0 of 7"; tap → "1 of 7"; tap again → "0 of 7"
  (undo, the same toggle `main` had when a habit was done); tap → reload →
  "1 of 7", filled check. DB (read-only): daily, together, 5 participants,
  5 logs, 1 distinct day stored `2026-11-05 00:00` UTC, streak 1, 1 linked
  plan item. This week "Nov 1-7 · 1 of 7 done"; dashboard tile "1 of 7
  done · Still to do: zz walk · 6 left". Console: only the known `pg` SSL
  warning. **The test goal is left on dev for the gates; Fury deletes its
  plan item, then the goal, after them.** Device refusal: not walked (no
  device login available to Fury); code at `preferences.ts:89`.

- 2026-11-05: F3 committed eaa80b5. C6 built; Fury added the P3 correction
  to CLAUDE.md (decision 83: commit 42bb676 is an ancestor of origin/main,
  checked with `git merge-base --is-ancestor`; the same wording as branch
  `claude/routines-plan`), fixed the stale `goals.test.ts` size line in
  STRUCTURE.md, and corrected A6's caller list. Test goal deleted on dev via
  the UI (row swipe Delete, then Delete goal); read-only count: 0 zz goals,
  0 Habit, 0 HabitParticipant, 0 HabitLog, 0 zz plan items. Dev server
  stopped. Next: Captain pass 3.

## Delivery

- **Shipped (local branch `claude/habits-a-engine`):** C1 2b014e9, C2
  f43043e, C3 39633b6, F1 6dc0c74, C5 a36c5b3, C4 4d626f7, F2 47705df, F3
  eaa80b5, C6 4cbb7d9, plus record commits.
- **Final Gauntlet (Fury, HEAD 4cbb7d9):** `tsc` ok; `eslint .` ok; `npm
  test` 654/654; `TZ=UTC` 654 (647 pass, 7 skipped, same 7 as main);
  `TZ=America/Los_Angeles` 654/654; `npm run build` ok; `grep -rn
  "db.planLog\|PlanLogRow" src/` empty; recordcheck 0 hard failures, REVIEW
  lines read (C6 report plus Fury's check of the P3 claim: 42bb676 dated
  2026-08-31, an ancestor of origin/main).
- **Done means, item by item:** (1) Gauntlet green, above. (2) grep empty.
  (3) Plans & Goals as before with one check a day: tests plus Fury's walk
  plus Vision pass 2. (4) `/routines` and `/chores` redirect: browser walk
  and Vision's curl (307 to `/habits`). (5) Streaks switch saves and
  survives reload: Fury's walk and Strange. **The tablet refusal is proven
  by code and gates only** (`preferences.ts:89` reads the session; Settings
  hides the section from devices); no device login was available to walk
  it. (6) Migration counts: 0 = 0 = 0 on dev, plus the rolled-back positive
  control.
- **Shipped check:** `git log origin/main..HEAD` lists every mission 30 commit (15, from 94e2161 to this delivery commit): all local, none pushed. Untracked `.agents/` and `.codex/` (Grok bot copies) are not committed.
- **Deliberate leftovers (for PR B and later):** a Together habit's
  participants are fixed at creation, so a person added later cannot check
  it unless they are a manager or the tablet; goal privacy or life-area
  edits do not sync to the Habit; a stale page's undo can remove
  yesterday's check (as on main); editing from the Plans sheet does not
  clear `weekdays`/`anchorWeek`; `uncheckNewest` also removes skips; PlanLog
  taps written by the old deployment during the Vercel build window are not
  migrated (re-run the backfill by hand with a bare `ON CONFLICT DO
  NOTHING` if any appear); no action-level tests; "6 left" can exceed the
  days left in a week; dark-mode period strip selection is faint (as main);
  a missed first tap on "Every day" in the test browser, not reproduced.
- **Decisions:** Bryce approved A7 and A8 on 2026-11-05 ("4. Yes"); Fury added both to STRUCTURE.md. Bryce set Vercel Preview's `DATABASE_URL` to the Neon dev branch ("Neon preview is done"). Still open: Recompute wording;
  whether a monthly target above the days in a month is allowed.

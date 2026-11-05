# Habits & Chores: master build plan (PRs A to F)

## Context

Marshee's drawer has a "Routines" item that is still a "Coming soon" page.
Bryce wants it to become **Habits & Chores**: one daily place where he,
Emily and the kids check off habits and household chores, good enough to
replace the iPhone "Habit tracker" app he and Emily use today. Over
2026-11-05 he made 83 decisions (`.avengers/plans/habits-chores-v1.md`),
then asked for a meticulous, commercial-grade audit
(`.avengers/plans/habits-chores-audit.md`) and accepted all sixteen of its
recommendations (decisions 68 to 83). This plan turns that record into six
pull requests, each an Avengers mission, each shippable on its own.

The intended outcome: a habit engine that is correct about days, streaks and
sharing (tested in three time zones), shared with Plans & Goals so a habit
is one thing wherever it shows, and screens that are touch-first and honest.

Settled during planning today (Bryce, 2026-11-05):
- **Deleting a goal unlinks its habits**; the habits and their history stay
  in Habits & Chores (goal delete is one tap, and decision 58 exists to
  protect long streaks from a slip).
- **PR A merges on its own.** The family sees two removed options in Plans
  & Goals and a renamed menu item; the new tables are proven on production
  before any screen depends on them.
- **Vercel Preview points at the Neon dev branch.** Bryce sets Preview's
  `DATABASE_URL` in Vercel before PR A's preview is used. Previews then
  run migrations safely and his iPad can test every PR from a link.

Settled on structure (Claude's call):
- **Day columns are `DateTime` at UTC midnight**, the house convention
  (`Task.dueDate`, `Goal.targetDate`, `PlanLog.day`), not `@db.Date`. The
  audit sketched `@db.Date`, but STRUCTURE.md:83-85 forbids provider
  specific schema features and `schema.prisma:414-416` says so again; every
  write goes through `utcMidnightInstant` in one Writes module, so the
  column cannot drift anyway. One convention beats one exception.
- `ChoreWeekOverride` is keyed by `(habitId, weekStart, fromWeekday)` so two
  due days in one week can be moved independently (the audit's two-column
  key could not).
- Weekday sets are a 7-character text mask, Sunday first (`"0100100"`),
  since Postgres arrays are provider specific.
- "Link an existing habit" to a goal waits for PR B (it needs the picker);
  the data model allows it from PR A.
- Streak caches start at 0 after the migration; PR A ships an admin
  "Recompute streaks" button and the handoff tells Bryce to press it once.

Standing rules that bind every PR: AGENTS.md's danger register (dev runs
against the Neon dev branch; migrations additive only; never `git add -A`;
branch, PR, Gauntlet green, merge; never push without Bryce), DESIGN.md,
STRUCTURE.md, and the Avengers doctrine with **every gate on Opus 5.5**
(pass `model: "opus"` on Vision dispatches; `vision.md` still says fable).
Missions are 30 to 35, files `.avengers/missions/mission-3N-habits-<x>.md`,
branches `claude/habits-<letter>-<slug>`, each from `origin/main`.

## What each PR gives the family

- **A, the engine and the move** (mission 30): nothing new to tap. Plans &
  Goals works as before, with one check per day and no "times a day". The
  menu says Habits & Chores and opens a Coming soon page at `/habits`.
  Settings has a Streaks switch.
- **B, the tab** (mission 31): the Today list, filter chips, Skip, the
  manager with drag-and-drop, the new-item form, archive and delete.
- **C, streaks and the family** (mission 32): streaks on rows, the habit
  stats page with month calendar and back-fill, side by side, nudges, the
  wall tablet's family view, confetti.
- **D, chores** (mission 33): the chore chart, this-week changes, the chore
  streak, the Sunday shout-out, vacation mode.
- **E, the dashboard** (mission 34): Habits and Chores tiles, the item
  picker, plan-the-day prompts, planned days on the Calendar, drag-and-drop
  in Customize.
- **F, the report and the idea library** (mission 35).
- **Later, own projects:** Winnie texts, the in-app assistant button, a
  Playwright smoke suite on an iPad viewport.

## The data model (final for PR A; later PRs add only what is named)

No Prisma enums. String vocabularies with `toX()` narrowers in a new
`src/lib/habitVocabulary.ts` (beside `goalVocabulary.ts`; `constants.ts` is
at its cap). Every `day` is `DateTime`, UTC midnight.

```prisma
model Habit {
  id          String   @id @default(cuid())
  title       String
  kind        String   @default("habit")   /// "habit" | "chore"
  mode        String   @default("build")   /// "build" | "quit"
  icon        String?                      /// Lucide name from HABIT_ICONS; null = the kind's default
  lifeArea    String?                      /// LIFE_AREAS key, or null
  timeOfDay   String?                      /// "morning" | "afternoon" | "evening" | null = anytime (grouping only)
  schedule    String                       /// "daily" | "weekdays" | "weekly" | "biweekly" | "monthly"
  weekdays    String?                      /// 7 chars of 0/1, Sunday first; weekdays and biweekly
  times       Int?                         /// weekly 1..7, monthly 1..31
  anchorWeek  DateTime?                    /// biweekly: the Sunday of the first due week, UTC midnight
  carryOver   Boolean  @default(false)
  sharing     String   @default("each")    /// "together" | "each"
  isPrivate   Boolean  @default(false)
  archivedAt  DateTime?
  createdById String?  (User, SetNull)
  participants HabitParticipant[]  logs HabitLog[]  plannedDays HabitPlannedDay[]
  weekOverrides ChoreWeekOverride[]  nudges Nudge[]  planItems PlanItem[]
  createdAt, updatedAt
  @@index([archivedAt])
}
model HabitParticipant {   // (habitId, userId) unique; @@index([userId]); both Cascade
  sortOrder Int @default(0)                /// per person
  currentStreak Int @default(0)  bestStreak Int @default(0)
  streakAsOf DateTime?                     /// household day the cache was last computed for
  joinedAt DateTime @default(now())
}
model HabitLog {           // (habitId, userId, day) unique; @@index([userId, day])
  userId String  (whose check; Cascade)   day DateTime
  status String @default("done")           /// "done" | "late" | "skipped"
  loggedById String? (who tapped; SetNull)  createdAt
}
model HabitPlannedDay   { habitId, userId, day }   // (habitId, userId, day) unique
model ChoreWeekOverride { habitId, weekStart, fromWeekday Int, action "moved"|"skipped", toWeekday Int? }
                        // (habitId, weekStart, fromWeekday) unique
model VacationPeriod    { userId, startDay, endDay }   // inclusive; @@index([userId, startDay])
model Nudge             { habitId, fromUserId, toUserId, day, seenAt? }  // 4-way unique; @@index([toUserId, day])

PlanItem        + habitId String? (Habit, onDelete: SetNull) @@index([habitId])
                  /// timesPerPeriod and period are unread since the move; title mirrors Habit.title
UserPreferences + showStreaks Boolean @default(true)
User            + back-relations: habitsCreated, habitParticipants, habitLogs, habitLogsLogged,
                  habitPlannedDays, vacationPeriods, nudgesSent, nudgesReceived
```

`PlanItem.habit` is **SetNull**, not Cascade: deleting a habit leaves a
goal's plan item orphaned, so `deleteHabit` also deletes the plan items that
point at it (in the same transaction); deleting a goal only unlinks.

## The engine: `src/lib/habits/` (pure, no db, no React, one test each)

"Today" never originates in lib: pages and actions compute
`householdToday(new Date())!` (`src/lib/assistant/today.ts:21`) and pass a
`CalendarDate` down. Readers convert stored days once with
`calendarDateInZone(d, "UTC")`; writers use `utcMidnightInstant`
(`src/lib/householdDate.ts:109`). Reuse `addCalendarDays`,
`calendarDaysBetween`, `dayOfWeek`, `startOfWeek`, `startOfMonth`.

- `types.ts`: `Weekday`, `ScheduleSpec` (a union by kind), `HabitLogDay`,
  `Vacation`, `HabitActor { userId, role }`.
- `schedule.ts`: `scheduleFromRow`, `isScheduledDay`, `isOpenKind`,
  `periodWindow`, `periodTarget`, `dueState(spec, day, planned)` →
  `"required" | "open" | "none"` (decision 71), `scheduledDaysInRange`,
  `periodsInRange`. Biweekly parity: `calendarDaysBetween(anchorWeek,
  startOfWeek(day)) / 7` is even.
- `progress.ts`: `countDays`, `windowProgress(spec, logs, today)` →
  `{ start, end, count, target, label, doneToday }` (daily keeps the old
  "7 this week" target so Plans & Goals reads the same), `distinctDays`
  (one entry per day across participants, how Plans reads a Together
  habit after fan-out).
- `carryOver.ts`: `carriedFrom(spec, carryOver, logs, today)` (scheduled
  kinds only; the latest scheduled day before today with no row; null when
  today is itself scheduled, decision 72), `statusForTap`.
- `streaks.ts`: `computeStreaks(spec, logs, vacations, today)` → `{
  current, best, asOf }`, the one formula (decision 80; rules in audit D3),
  and `streakAfter(spec, cached, vacations, today)`, the cheap read-side
  walk with no logs.
- `perfectDays.ts`: `isPerfectDay` (habits only, required items done or
  skipped; null when nothing was required), `perfectDaysInRange`.
- `planPrompts.ts`: `isPromptDay(spec, today, plannedDays, done)` per
  decisions 38 and 47.
- `access.ts`: `canSee` (private only to participants; the tablet never
  sees private), `canEdit` (never a device; a participant or a manager
  role), `canLogFor(actor, forUserId, habit)` (participant; self, device or
  manager, decision 79). `MANAGER_ROLES` from `constants.ts:243`.
- `habitWrites.ts` (`server-only`, no auth, no `revalidatePath`, every
  function takes `client: Prisma.TransactionClient = db`, copying
  `src/lib/pantryWrites.ts:118-135`): `createHabit`, `updateHabit`
  (recomputes streaks when the schedule changes), `deleteHabit`,
  `archiveHabit`, `restoreHabit`, `checkHabit` (one row, or one per
  participant for Together, `createMany({ skipDuplicates: true })`, then
  recompute), `uncheckHabit`, `uncheckNewest`, `skipHabit`,
  `recomputeStreaks(habitId, userIds, today)`, `recomputeAllStreaks`.
- `src/lib/habitsRead.ts` (`server-only`): the only reader of habit rows
  for pages. PR A: `loadHabitsForPlan(habitIds, from)`. PR B adds
  `loadTodayPage(viewer, today)` (a fixed number of queries whatever the
  habit count). Later PRs add their loaders here or in a sibling file when
  it passes 350 lines.

## PR A, mission 30: the engine and the move

Branch `claude/habits-a-engine`. Assembled: Stark, Vision, Captain (new
tables and module), Strange (Settings row and the renamed menu item).

**Migration** `prisma/migrations/20261106000000_add_habits/migration.sql`:
generated with `npx prisma migrate dev --create-only --name add_habits`
against the Neon dev branch (Fury confirms the host first), then the
backfill appended by hand under a reasoning comment, the precedent being
`20261105000000_add_goal_check_ins/migration.sql:22-26`. Only CREATE,
ALTER ADD, INSERT and one UPDATE; every statement idempotent:
1. `INSERT INTO "Habit" ... SELECT 'h_' || p.id ... FROM "PlanItem" p JOIN
   "Goal" g` where `kind = 'habit'`: schedule `day → daily`, `week →
   weekly LEAST(times, 7)`, `month → monthly LEAST(times, 31)`; sharing
   `together` when `g.ownerId IS NULL` else `each`; `isPrivate =
   (g.visibility = 'private')`; `lifeArea = g.area`.
2. `HabitParticipant`: Mine goals get the owner; Together goals get every
   `User` with `deactivatedAt IS NULL AND role <> 'device'`.
3. `HabitLog`: `DISTINCT ON (planItemId, day)` over `PlanLog` (earliest
   tap keeps `loggedById`), joined to the participants (fan-out), status
   `done`, `ON CONFLICT DO NOTHING`.
4. `UPDATE "PlanItem" SET "habitId" = 'h_' || id WHERE kind = 'habit' AND
   "habitId" IS NULL` (the value-only correction STRUCTURE.md:727-741
   allows).
Counts recorded in the mission file before and after, on dev: habit plan
items = habits; habits × participants = participant rows; distinct
(item, day) × participants = log rows. Three taps on one Tuesday become
one done row (decision 69). Old `PlanLog` and the two old columns stay,
unread, so the previous deployment keeps serving during the build
(`prisma/migrate-on-production.mjs:31-55`).

**Rewiring Plans & Goals** (keep `PlanItemView`'s shape, add `doneToday`;
`PlanItemRow` gains `habitId`; `timesPerPeriod` and `period` are derived
from the habit's schedule so the edit sheet pre-fills unchanged):
- `src/lib/goalsProgress.ts`: delete `logWindow`, `countInWindow`,
  `PlanLogRow`; `buildPlanItemView(item, habit | null, today)` uses
  `windowProgress(spec, distinctDays(logs), today)`. `weekSummary`,
  `weekTodo`, pace and formatting untouched.
- `src/lib/goals.ts`: `validatePlanItemInput` limits become day = 1, week
  1..7, month 1..31; new `habitInputFromPlan(input, goal)`;
  `buildGoalView` takes the habit map instead of logs.
- `src/lib/goalsRead.ts`: drop the logs include, select `habitId`, one
  `loadHabitsForPlan` call with the existing `logsFrom(today)` reach-back
  (`goalsRead.ts:49-52`). `loadPlansPage`, `loadGoal`, `loadGoalsTile`,
  `loadWeekRecap` keep their signatures.
- `src/lib/goalsRecap.ts`: habit map instead of logs at line 77.
- `src/lib/planItemChanges.ts`: log and undo also flip `doneToday`.
- `src/app/actions/planItems.ts`: create habit = `$transaction(createHabit,
  planItem.create({ habitId }))`; update mirrors title and schedule through
  `updateHabit`; habit→step nulls `habitId` then deletes the habit; delete
  = `deleteHabit`; `logHabit` gates `canSee(goal)` then `canLogFor` with
  `forUserId = goal.ownerId ?? user.userId`, calls `checkHabit`; `created
  === 0` returns `{}`; `undoHabitLog` = `uncheckNewest` over the window.
  `habitWindowLogs` and the count refusal (163-185) go. `actions/goals.ts`
  `deleteGoal`: unlink only (SetNull does it).
- `src/lib/prismaErrors.ts`: add `isUniqueViolationError` (P2002).
- `PlanItemRow.tsx`: `LogButton done={item.doneToday}`; `PlanItemSheet.tsx`:
  period labels "Every day", "a week", "a month", stepper hidden for day,
  max 7 or 31. `ThisWeekList`, `GoalDetail`, `GoalCard`, `GoalsTile`, both
  pages: no change.
- Tests: `logWindow`/`countInWindow` tests move to `progress.test.ts`; the
  three `buildPlanItemView` tests and `goals.test.ts` 127, 271, 291, 305
  change fixtures or limits; everything else survives.

**Route and Settings:** `src/app/(app)/habits/page.tsx` (Coming soon, with
`requireVerifiedUser`), delete `routines/page.tsx`; `routeRedirects.ts`
gains `/routines → /habits` and `/chores → /habits` (its test pins both);
`nav.ts:30` becomes `{ href: "/habits", label: "Habits & Chores", icon:
ListChecks }`. New `src/components/HabitsChoresSettings.tsx` (a
`ToggleSwitch` row in the `NavModeSetting` save pattern), `settings/page.tsx`
adds the section, `actions/preferences.ts` gains `saveShowStreaks` (device
refused like `saveDashboardLayout`), `dal.ts` adds `showStreaks` to
`VerifiedUser` beside `navMode`. New `actions/habits.ts` with
`recomputeStreaks` (admin only).

**Contracts** (C1 and C2 parallel; C3; C4 and C5 parallel; C6):
- C1 vocabulary and engine: `habitVocabulary.ts` + test, `src/lib/habits/*`
  except `habitWrites.ts`, the test glob in `package.json:11` and
  `.github/workflows/ci.yml:64,66`. Must not touch `prisma/`, `src/app/`,
  `src/components/`, any existing lib file. Done when every rule above has
  a test under Denver, UTC and LA, and the printed test count rises.
- C2 schema and migration: `schema.prisma`, the migration folder. Must not
  touch `src/`. Done when `prisma validate`, `migrate dev` on the dev
  branch, `generate` and `tsc` pass and the three counts match.
- C3 server modules: `habitWrites.ts`, `habitsRead.ts`, `prismaErrors.ts`.
  Done when both open with `import "server-only"`, no `revalidatePath` or
  `getVerified` inside, every write takes `client`.
- C4 the rewire: the goals lib files and tests, `actions/planItems.ts`,
  `actions/goals.ts` (deleteGoal), `PlanItemRow.tsx`, `PlanItemSheet.tsx`.
  Done when `grep -rn "db.planLog\|PlanLogRow" src/` is empty and This
  week, the goal page, the tile and a Sunday-fixture recap behave as
  before with one check per day.
- C5 route and Settings (files above). Done when `/routines` and `/chores`
  redirect, the switch saves and survives reload, the tablet is refused.
- C6 records: CLAUDE.md status and "What's built", STRUCTURE.md one-source
  list (`habitVocabulary.ts`, `src/lib/habits/`, `habitsRead.ts` as the
  only reader), `habits-chores-v1.md`, the mission file.

**Traps:** `planItems.ts` nears 350 lines (split habit branches into
`actions/planHabits.ts` if it passes); `PlanItem.title` stays NOT NULL and
mirrors `Habit.title` in the same write; a `PlanLog` written during the
build window never reaches `HabitLog` (merge at a quiet hour, recheck the
counts in the Neon console); `createMany` plus `deleteMany` make check and
undo idempotent, the in-code "already checked" is a courtesy only.

## PR B, mission 31: the tab

Branch `claude/habits-b-tab`. Assembled: Stark, Vision, Strange, Captain.
Before contracts: the canvas mock is updated for decisions 68 to 83 (audit
Part 6) and Bryce approves it; Bryce approves the icon allow-list (about 40
Lucide names in `HABIT_ICONS`).

**C0, the drag-and-drop spike** (its own throwaway branch, never merged):
`@dnd-kit/core` and `@dnd-kit/sortable` pinned exactly, one page of ten
rows at `/habits/spike`, handle-only activation (`listeners` on the grip),
`touch-action: none`, `-webkit-touch-callout: none`, `user-select: none` on
the handle, the `KeyboardSensor`, edge auto-scroll on a long list. Bryce
tests from the preview link on his iPad: drag by the handle, scroll by
finger elsewhere, no text-selection popup, order survives reload. Any
failure flips F4's fallback (a hand-written pointer sortable) before C3.

**Routes:** `/habits` (Today), `/habits/manage`, `/habits/new`,
`/habits/[id]/edit` (full-page forms like `/calendar/new`, with `BackLink`).
**Reader:** `habitsRead.loadTodayPage(viewer, today)`: visible habits with
participants, logs since today minus 14 days, this week's overrides,
vacations, planned days, nudges; builds `HabitRowView` (title, icon, kind,
dueState, doneToday, carriedFrom, skippedToday, progress, streak via
`streakAfter`, participants' done state for Each habits).
**Actions** `src/app/actions/habits.ts`: `createHabit`, `updateHabit`,
`archiveHabit`, `restoreHabit`, `deleteHabit`, `reorderHabits(ids)`,
`checkHabit(id, forUserId?, day?)`, `uncheckHabit`, `skipHabit`,
`unskipHabit`; each guards session, then `canEdit` or `canLogFor`, then the
row; `revalidatePath("/habits", "layout")` and `/plans`.
**Components:** `HabitTodayList` (client; `useOptimistic` with a new pure
`habitChanges.ts` reducer like `planItemChanges.ts`), `HabitRow` (44px
check, carried and Quit tags, streak slot; `SwipeActions` with Skip today
and Unskip only), `HabitFilterChips` (All, times of day, life areas; the
chip markup from `ThisWeekList.tsx:129-147`), `HabitManager` (tap to edit;
`SortableList`, the one dnd wrapper the dashboard reuses in PR E; Archived
list; links to the chart (PR D) and Settings), `HabitForm` (kind, name,
icon picker, Build/Quit, who: Just me / Together / Side by side with a
`ParticipantPicker` whose "Everyone" shortcut selects every active
non-device person, the five schedules with `QuantityStepper` for times,
plan-a-day-now for open kinds, time of day, life area, carry-over only for
scheduled kinds, Private only for one person; the editor ends with Archive
then Delete, one tap). Done items sort to the bottom on load only.
**Vocabulary** added to DESIGN.md: `SortableList`, `HabitRow`, `HabitForm`.

Contracts: C0 spike; C1 reader and actions; C2 Today list and row; C3
manager and sortable; C4 form and pickers; C5 records. Verification adds
Strange on a 390px phone and an 820px iPad, light and dark, and Bryce's
sixty seconds on a phone (tap a check, swipe for Skip, drag in the
manager).

## PR C, mission 32: streaks and the family

Branch `claude/habits-c-streaks`. Before testing: Bryce creates the kids'
profiles (no password) from Settings, Manage family; no script may create
`User` rows.

- Streak on rows (`showStreaks` from `VerifiedUser`; the family view shows
  everyone's).
- `/habits/[id]`: the stats page. Current, best, total done; a month
  calendar (tap a day within the last 7 to mark done or skipped, never a
  future day; the server decides "today"); perfect days this month
  (`perfectDaysInRange`); for Each habits a side-by-side table (total,
  rate, streak per participant, deactivated people hidden) and a weekly
  chart as inline SVG (read the `dataviz` skill before drawing it; no chart
  library); Nudge button when another participant is not done today.
- Nudges: `nudge(habitId, toUserId)` and `markNudgeSeen`; the note card at
  the top of Today (the dashboard copy lands in PR E).
- Family view: the tablet (device login) lands on it by default at
  `/habits`; people reach it with a "Whole family" chip. A Together strip,
  then one column per active non-device person in that person's own order;
  the tablet checks for anyone (`canLogFor`); private habits never appear.
- Confetti: `canvas-confetti` pinned, fired once per day per device
  (browser-local marker, allowed as a per-viewer convenience), skipped under
  `prefers-reduced-motion`, no sound; the trigger is "every required item
  today done or skipped" computed on the server and passed as a flag.
- Admin Recompute button already exists (PR A); the stats page calls
  `streakAfter` only.

Contracts: C1 stats reader and back-fill actions; C2 stats page and
calendar; C3 side by side, chart and nudges; C4 family view; C5 confetti
and records.

## PR D, mission 33: chores

Branch `claude/habits-d-chores`. Bryce approves the shout-out wording first.

- `/habits/chart`: one person at a time (chips), a Sunday to Saturday
  column list; "Default week" edits the person's `weekdays` chores; "This
  week" writes `ChoreWeekOverride` rows (move to another day, or skip this
  week) and shows "Moved to Thu" and "Skipped this week" tags; next week
  starts from the default.
- Engine: `schedule.ts` consults overrides for chores (a moved chore is
  required on the new day that week); `choreStreak.ts`: days in a row on
  which every chore required of the person was done on time; no chores due
  does not break it; skipped is excused; late breaks it. Cached on
  `UserPreferences` (`choreStreakCurrent`, `choreStreakBest`,
  `choreStreakAsOf`; additive migration) and recomputed by the same writes.
- Sunday shout-out: computed on read on Sundays (the recap pattern,
  `goalsRecap.ts:36-38`), shown at the top of Today and on the family view;
  the dashboard copy lands in PR E.
- Vacation mode: `VacationPeriod` rows (table from PR A); a Settings card
  with From and Through dates and the list of upcoming and past periods;
  saving recomputes that person's streaks; chores and habits excused; the
  tablet refused.

Contracts: C1 overrides and chore streak in the engine; C2 chart page and
actions; C3 shout-out; C4 vacation mode; C5 records.

## PR E, mission 34: the dashboard

Branch `claude/habits-e-dashboard`.

- `dashboardWidgets.ts` gains `habits` ("Habits") and `chores` ("Chores
  today"); `(home)/page.tsx` builds both tiles with a `loadDashboardHabits`
  reader; the Goals tile keeps its loader.
- The item picker: `dashboardLayout.ts` widgets gain an optional `items:
  string[]` (version stays 1; unknown ids dropped by the parser as today);
  `DashboardCustomizeSheet` opens a per-tile picker (that person's habits,
  or goals) and reorders tiles with `SortableList` instead of the arrows
  (`moveWidget` stays for keyboard users). An empty list shows up to three
  habits due and not done (decision 48).
- Plan-the-day prompt card (`isPromptDay`) with one-tap day chips, on the
  dashboard and at the top of Today; `planDay(habitId, day)` writes
  `HabitPlannedDay` (fan-out for Together). "Planned today" rows.
- Planned days on the Calendar, read side only: `calendar/page.tsx` adds a
  `plannedHabits` query mapped to a `CalendarTaskView`-shaped item with an
  `href` to `/habits/[id]`, rendered through the existing `DaySection` and
  `taskAsMonthEvent` paths; `fetchTasks` paging gains the same source. No
  `Task` rows are created.
- The nudge note and the Sunday shout-out on the dashboard; the chore chart
  tile for the person.

Contracts: C1 layout JSON and picker logic (pure, tested); C2 tiles and
reader; C3 Customize sheet with `SortableList`; C4 prompts and planned
days; C5 calendar source; C6 records.

## PR F, mission 35: the report and the idea library

Branch `claude/habits-f-report`. Bryce approves every line of idea wording
first (as with `plans-goals-prompts.md`).

- `/habits/report`: a weekly grid (every item by day, the week range
  pager from `mealPlanDates.ts`), a small month calendar per item, a year
  grid per item (one item at a time), a filter for which items to show;
  loaders by the range shown.
- The idea library: `habitIdeas.ts` (wording file) feeding `IdeaChips` on
  the new-item form, grouped by life area.

## Bryce's steps outside the code

1. Before PR A's preview: set Preview's `DATABASE_URL` in Vercel to the
   Neon dev branch.
2. After PR A deploys: open Settings and press "Recompute streaks" once.
3. Before PR B contracts: review the updated mock and the icon list.
4. Before PR C testing: create the kids' profiles in Settings.
5. Before PR D and PR F: approve the shout-out wording and the idea wording.
6. After each PR: the sixty-second phone check the mission names.

## Verification (every PR)

- The Gauntlet: `npx tsc --noEmit`, `npx eslint .`, `npm test`, the direct
  `TZ=UTC` and `TZ=America/Los_Angeles` runs, `npm run build`, the record
  check. CI runs the same.
- Migration PRs: `npx prisma migrate status` clean on the dev branch after
  `migrate dev`; SQL read line by line for additive-only; counts recorded.
- Browser (`preview_start`, 390px and 820px, light and dark): the mission
  lists the exact taps per screen; Strange gates anything visible; the
  tablet path is checked with a device login on dev.
- `git log origin/main..HEAD` before any "done"; push and PR only on
  Bryce's go; merge after the Gauntlet is green, then confirm the Vercel
  deploy by sha and, for PR A, the row counts on production in the Neon
  console.

## Order and size

A (largest review, no new screens) → B (the biggest build) → C → D → E →
F. Each PR is one mission with its own file, contracts sized so one
dispatch survives a rate limit, gates on Opus, three passes per gate, then
stop and surface.

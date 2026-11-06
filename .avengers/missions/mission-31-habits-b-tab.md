# Mission: Habits & Chores PR B, the tab (mission 31)

**Project:** family-hub (Marshee)
**Status:** CONTRACTS (mock approved; contracts being written)
**Started:** 2026-11-05 · **Updated:** 2026-11-05

## Brief

- **Goal:** the "PR B, mission 31: the tab" section of
  `.avengers/plans/habits-chores-build.md`: the Today list, filter chips,
  Skip, the manager with drag-and-drop, the new-item form, archive and
  delete. Decisions 84 to 86 in `.avengers/plans/habits-chores-v1.md` are
  part of it.
- **Done means:** on the preview link, a signed-in person opens Habits &
  Chores and sees their Today list (rows in their own order with the time of day on each row, as on the mock's Main board, filter chips, a 44px
  check, swipe left for Skip today); Manage lists their habits, tap to edit,
  drag the grip to reorder (order survives reload), with an Archived list;
  New and Edit are full pages matching the approved mock (five schedules,
  steppers, people picker with Everyone, carry-over and Private only where
  allowed, Archive then Delete). Decisions 84, 85 and 87 behave as written.
  The gauntlet passes; Vision, Strange and Captain pass; Bryce's sixty
  seconds on a phone (tap a check, swipe for Skip, drag in Manage) work.
- **Out of scope:** everything the build plan puts in PRs C to F.

## Prerequisites from the build plan

- **C0, the drag-and-drop spike: PASSED.** Branch `claude/habits-b-spike`
  (commit 23bc5d9, never merged) added `@dnd-kit/core` 6.3.1,
  `@dnd-kit/sortable` 10.0.0 and `@dnd-kit/utilities` 3.2.2, pinned exact,
  with a test page at `/habits/spike`. On 2026-11-05 Bryce tested it on his
  iPad from the Vercel preview: dragging by the grip worked, finger scrolling
  elsewhere on a row worked, and the order survived a reload ("everything
  worked, and it saved even when I reloaded the page"). So the hand-written
  pointer sortable fallback is not needed; PR B uses dnd-kit with
  PointerSensor and KeyboardSensor, as in the spike.
- **Icon allow-list: APPROVED** (Bryce, 2026-11-05: "the 14 icons are
  fine"). `HABIT_ICONS` in `src/lib/habitVocabulary.ts` keeps its 26 names
  and adds these 14, for 40: Salad, Coffee, GlassWater, Utensils,
  CigaretteOff, AlarmClock, Timer, Church, HandHeart, Sparkles, PiggyBank,
  Briefcase, GraduationCap, ShoppingCart. All 14 exist in the installed
  `lucide-react`.
- **The mock: APPROVED** (Bryce, 2026-11-05: "I like those
  recommendations"). Artifact https://claude.ai/artifact/WsWHY1oDmGhofjCFoaBXdu,
  version 10, top row of four boards: Today, Manage, New, Edit. Decisions 87
  (pick people, "Everyone" flag) and 88 (wording as drawn) in
  `.avengers/plans/habits-chores-v1.md`.

## Notes

- Signing in on a preview link lands on the dashboard, not the page you
  opened. Give Bryce the full address to type in again after he signs in.
- Bryce made two test goals on the dev branch while finding the spike page.
  They are harmless test data.

## Danger register

- Local dev runs against the Neon `dev` branch. **Before any Prisma command
  that reaches a database, Fury confirms `DATABASE_URL`'s hostname starts
  `ep-hidden-pine-`** (hostname only, never print `.env`). Confirmed
  2026-11-05 at contract time.
- Forbidden for every agent: `npm run db:seed`, `npm run db:reset`, `prisma
  migrate reset`, `prisma db push`, `prisma migrate dev`. **Stark never
  touches the database** (no `migrate deploy`, no `db execute`, no scripts
  that connect). `npx prisma generate` and `npx prisma validate` are fine.
  Fury applies the migration with `prisma migrate deploy` after the host check.
- Migration additive only: one `ALTER TABLE "Habit" ADD COLUMN "everyone"
  BOOLEAN NOT NULL DEFAULT false`. Nothing drops, renames, retypes or narrows.
- The dev branch holds real family data. Count rows, never quote them.
- Never write a clean or reset script for `User`. No script creates `User` rows.
- No push, no PR, no merge without Bryce's go-ahead. Stage by explicit path,
  never `git add -A` / `git add .`; `git show --stat HEAD` after every commit.
- `npm test` pins Denver; the direct `TZ=UTC` and `TZ=America/Los_Angeles`
  runs prove the other zones.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (654 at 7319c72; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- the same with `TZ=America/Los_Angeles`
- `npm run build`
- `npx prisma validate`; after Fury applies, `npx prisma migrate status` clean on dev
- `node ~/.claude/skills/avengers/recordcheck.mjs` over the mission range

## Assembled

Stark; Vision (**`model: "opus"`** on every dispatch); Strange (all four
screens are new, 390px phone and 820px iPad, light and dark); Captain (new
components, a large diff). Banner ran once (brief summarized in "Facts").
Budget 3 passes per gate.

## Facts the contracts hang on (Banner, 2026-11-05)

- `src/app/actions/habits.ts` (29 lines) has only `recomputeAllStreaks`.
  The lib writers exist in `src/lib/habits/habitWrites.ts` (325 lines):
  `createHabit` (participantIds or `"household"`), `updateHabit`,
  `deleteHabit`, `archiveHabit`, `restoreHabit`, `checkHabit`, `skipHabit`,
  `uncheckHabit` (removes a skip too, so there is no separate unskip
  writer), `recomputeStreaks`, `recomputeAllStreaks` (returns `updated` =
  habit-person pairs). No `reorderHabits`.
- `src/lib/habitsRead.ts` (91 lines) has only `loadHabitsForPlan`; it is the
  one page reader of habit rows (STRUCTURE.md).
- Access: `canSeeHabit`, `canEditHabit`, `canLogFor` in `src/lib/habits/access.ts`.
- Decision 84 text: `src/components/HabitsChoresSettings.tsx:51`.
- Decision 85: `windowProgress(spec, logs, today)` in
  `src/lib/habits/progress.ts:54`; daily target is a constant 7
  (`schedule.ts:116`); consumer `src/lib/goalsProgress.ts:98`. Nothing
  passes `Habit.createdAt` today.
- Decision 87: `createPerson` (`src/app/actions/users.ts:68`) and
  `reactivatePerson` (`users.ts:187`) write no habit rows.
  `householdParticipantIds` (`habitWrites.ts:50`) = every active
  non-device person.
- UI to reuse: `SwipeActions` (`src/components/SwipeActions.tsx`, destructive
  last), `QuantityStepper`, `BackLink`, the chip markup at
  `src/components/ThisWeekList.tsx:129-147`, the `useOptimistic` reducer
  pattern in `src/lib/planItemChanges.ts` (used by `GoalDetail.tsx:54`), the
  full-page form at `src/app/(app)/calendar/new/page.tsx`. No icon-name to
  Lucide component map exists yet.
- `VerifiedUser` (`src/lib/dal.ts:28`): userId, role, displayName,
  avatarColor, isDevice, navMode, showStreaks.
- Caps: soft 350, hard 650 lines. `src/lib/*.test.ts` is in the glob, so
  `src/lib/habitChanges.test.ts` runs; no new test directory is needed.
- The approved mock files (read them for layout and wording):
  `/private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-habits-a-engine-00bccf/823148c4-c30a-4fc7-b187-45ba819246cf/scratchpad/mock/project/{Main,Manager,NewItem,EditItem}.dc.html`.
  The nudge banner, plan-a-day card and streak numbers on Today are NOT in PR B.
- The spike's dnd-kit code is on branch `claude/habits-b-spike`
  (`src/app/(app)/habits/spike/SpikeList.tsx`); read it with `git show
  claude/habits-b-spike:<path>`, never merge that branch.

## Contracts

Order: **C1**, then **C2**, then **C3**, **C4** and **C5** one after another
(they share the habits route folder). The build plan section "PR B, mission
31: the tab" and decisions 84 to 88 bind where a contract is silent.

### C1 - Data, engine and the three decisions
- **Status:** DONE (Stark; Fury re-ran tsc and 665 tests; migration applied to dev, status clean)
- **Report notes for C2+:** `updateHabit(id, fields, today, client, people)` takes `{ participantIds?, everyone? }` fifth; `createHabit({ fields, participantIds, everyone? })`; `reorderHabits(userId, ids)`; `joinEveryoneHabits(userId)`; `HabitForPlan.startDay`; `windowProgress(spec, logs, today, startDay?)`; `applyHabitChange(rows, { type, habitId, userId? })` where uncheck clears only a check and unskip only a skip. `habitWrites.ts` is 400 lines (over the 350 soft cap: a note for Captain). `everyone` is not in `HabitFields`; it travels beside the fields.
- **Objective:** Add the `everyone` flag, the reorder and join writers, the
  `habitChanges` reducer, the 14 icons, and decisions 84, 85 and 87 in the
  engine, with tests.
- **Boundaries:** may touch: `prisma/schema.prisma` (Habit gains
  `everyone Boolean @default(false)` with a doc comment), new
  `prisma/migrations/20261107000000_add_habit_everyone/migration.sql`,
  `src/lib/habits/habitWrites.ts`, `src/lib/habits/progress.ts` and its
  test, `src/lib/habitVocabulary.ts` and its test, new
  `src/lib/habitChanges.ts` and `src/lib/habitChanges.test.ts`,
  `src/lib/habitsRead.ts` (add `createdAt` / start day to `HabitForPlan`
  only), `src/lib/goalsProgress.ts` (pass the start day only),
  `src/app/actions/habits.ts` (recompute result only),
  `src/app/actions/users.ts` (call the join writer only),
  `src/components/HabitsChoresSettings.tsx` (the result line only) ·
  must not touch: any other file; never run a command that connects to a
  database.
- **Rules:** `createHabit` sets `everyone: true` when given `"household"`
  or a new `everyone: true` input, and then uses `householdParticipantIds`.
  New `joinEveryoneHabits(userId, client?)`: adds the person as a
  participant (skip duplicates) to every non-archived `everyone` habit;
  `createPerson` (non-device people only) and `reactivatePerson` call it.
  `updateHabit` may replace the participant set and the flag (keep logs of
  removed people). New `reorderHabits(userId, ids, client?)` writes
  `HabitParticipant.sortOrder` for that person only, ignoring ids they are
  not a participant of. Decision 84: `recomputeAllStreaks` returns the
  number of distinct habits; the Settings line reads "Rechecked 1 habit" /
  "Rechecked N habits". Decision 85: `windowProgress` takes an optional
  start day; for `daily` only, when the start day falls inside the current
  week, the target is the days from the start day to Saturday inclusive
  ("1 of 3" for a Thursday habit); tests for Thursday, Sunday and an older
  habit. Icons: add the 14 approved names to `HABIT_ICONS` (40 total).
  `habitChanges.ts` is pure, like `planItemChanges.ts`: changes check,
  uncheck, skip, unskip on a row view by habit id (and user id for Each
  habits), with tests.
- **Verification:** the gauntlet minus build; `npx prisma validate`;
  `npx prisma generate`.
- **Evidence:** the migration SQL in full; test counts in all three zones
  before and after; tsc and eslint output; line counts of touched files.
- **Done:** all of the above green and the SQL is a single ADD COLUMN.

### C2 - The Today reader and the server actions
- **Status:** DONE (Stark; Fury re-ran tsc and eslint)
- **Report notes for C3 to C5:** types `TodayPage { rows, manage, archived }`, `HabitRowView` (assignable to `HabitRowState`), `HabitManagerItem`, from `src/lib/habitsRead.ts`. Editor actions in `src/app/actions/habits.ts` take `HabitInput` (anchorWeek as "YYYY-MM-DD", weekdays as a 7-character mask, `participantIds`, `everyone`). Taps in new `src/app/actions/habitChecks.ts`: `(habitId, forUserId?, day?)`; a carried row passes `formatCalendarDate(row.carriedFrom)`. `rows` leaves out habits with dueState "none" unless carried or done or skipped today. Manager lists only habits the viewer takes part in. Logs are read from the earlier of today minus 14 and the 1st of the month (monthly counts).
- **Open for the fix batch:** (a) a carried row from 8 to 14 days ago is shown but its tap is refused (lookback 14, tap window 7): accept a day equal to the server's carried day. (b) Move row building into a pure `src/lib/habitsToday.ts` with tests (habitsRead.ts is 360 lines and the Today rules are untested).
- **Objective:** `loadTodayPage(viewer, today)` in `src/lib/habitsRead.ts`
  and every PR B server action in `src/app/actions/habits.ts`.
- **Boundaries:** may touch: `src/lib/habitsRead.ts` (and a new
  `src/lib/habitsRead.test.ts` only for any pure helper it adds),
  `src/app/actions/habits.ts`; if `habits.ts` passes 350 lines, split the
  check actions into new `src/app/actions/habitChecks.ts` · must not touch:
  anything else.
- **Rules:** the reader returns rows the viewer can see (`canSeeHabit`) and
  participates in, in that person's `sortOrder`, with title, icon, kind,
  mode, timeOfDay, lifeArea, sharing, dueState, doneToday, skippedToday,
  carriedFrom, progress (with decision 85's start day), and for Each habits
  each participant's done state; it also returns the manager list
  (active and archived). Two to four queries, logs from today minus 14 days.
  Actions: `createHabit`, `updateHabit`, `archiveHabit`, `restoreHabit`,
  `deleteHabit`, `reorderHabits(ids)`, `checkHabit(id, forUserId?, day?)`,
  `uncheckHabit`, `skipHabit`, `unskipHabit` (calls `uncheckHabit` on a
  skip row). Each uses `getVerifiedUser()` (null form, `{ error }`), then
  `canEditHabit` or `canLogFor`, then the row; a device may check but never
  edit; validate every field with the `toX()` narrowers and
  `HABIT_TIMES_LIMITS`; `revalidatePath("/habits", "layout")` and
  `revalidatePath("/plans", "layout")`. "Today" comes from the server
  (`householdToday`); a client `day` is accepted only within the last 7
  days and never in the future.
- **Verification:** gauntlet minus build.
- **Evidence:** the list of exports with their guards; tsc, eslint, tests.
- **Done:** every action guards session, policy and row, in that order.

### C3 - The Today screen
- **Status:** DONE (Stark; Fury re-ran tsc; build passed in Stark's run)
- **Notes:** rows follow the Main board (own order, time of day on each row), not grouped; skipped rows count on neither side of "x of y done"; a skipped row's check is a disabled dashed marker; Manage and New are hidden for a device.
- **Open for the fix batch:** (c) rows have no `everyone` flag, so the mock's "Everyone" label reads "Together": add `everyone` to `HabitRowView` and draw it.
- **Objective:** Replace the `/habits` placeholder with the Today list from
  the Main board of the mock.
- **Boundaries:** may touch: `src/app/(app)/habits/page.tsx`, new
  `src/components/HabitTodayList.tsx`, `HabitRow.tsx`,
  `HabitFilterChips.tsx`, `HabitIcon.tsx` (the name to Lucide map for all
  40 icons) · must not touch: anything else.
- **Rules:** `useOptimistic` with `habitChanges.ts`; 44px check; carried
  and Quit tags; filter chips All, times of day, life areas (only those
  present) using the `ThisWeekList` chip markup; swipe left for "Skip
  today" (and "Undo skip" on a skipped row) through `SwipeActions`; done
  rows sort to the bottom on load only; empty state links to New; footer
  hint "Swipe a row left to skip it for today."; a "Manage" link and a New
  button. No streak numbers, nudge banner or plan-a-day card.
- **Verification:** gauntlet including build.
- **Evidence:** tsc, eslint, build output; line counts.
- **Done:** builds, and the page matches the Main board's PR B parts.

### C4 - The manager and SortableList
- **Status:** DONE (Stark; Fury re-ran tsc; dnd-kit pinned exact)
- **Notes:** `SortableList<T extends {id}>({ items, label, onReorder(ids), renderItem(item, { grip, dragging }) })`. Habits and Chores are two lists sharing one saved order. `scheduleText` and `detailLine` live in `HabitManager.tsx` (Captain may want them in lib for C5 to share).
- **Open for the fix batch:** (d) the board's "My Habits & Chores settings" row (link to `/settings`) is missing; the "Chore chart" row waits for PR D.
- **Objective:** `/habits/manage` from the Manager board, with dnd-kit.
- **Boundaries:** may touch: `package.json` and `package-lock.json` (add
  `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities`
  3.2.2, pinned exact, via `npm install --save-exact`), new
  `src/app/(app)/habits/manage/page.tsx`, new
  `src/components/SortableList.tsx` (the one generic dnd wrapper: handle
  only, PointerSensor plus KeyboardSensor, `touch-action: none`,
  `-webkit-touch-callout: none`, `user-select: none` on the handle,
  auto-scroll), new `src/components/HabitManager.tsx` · must not touch:
  anything else.
- **Rules:** subtitle "Tap a row to edit. Drag the grip to reorder."; rows
  link to `/habits/[id]/edit`; reorder is optimistic and calls
  `reorderHabits`; an Archived section with Restore; `BackLink` to Habits &
  Chores; no swipe on manager rows.
- **Verification:** gauntlet including build.
- **Done:** builds; dnd-kit versions exact in `package.json`.

### C5 - New and Edit forms
- **Status:** DONE (Stark; Fury re-ran tsc; build passed in Stark's run)
- **Notes:** `HabitForm.tsx` is 360 lines (soft cap note). Pages query the roster inline like `calendar/new`. An archived habit's editor shows Restore in place of Archive. Wording not on the mock, for Bryce: Who hints "Together: one check counts for both" / "Side by side: everyone checks their own"; Every other week shows "Pick days (optional)" and start chips "This week" / "Next week" (plus "Keep its weeks" on edit).
- **Objective:** `/habits/new` and `/habits/[id]/edit` from the NewItem and
  EditItem boards.
- **Boundaries:** may touch: new `src/app/(app)/habits/new/page.tsx`,
  `src/app/(app)/habits/[id]/edit/page.tsx`, new
  `src/components/HabitForm.tsx`, `ParticipantPicker.tsx`,
  `HabitIconPicker.tsx`, `HabitScheduleField.tsx`; `DESIGN.md` (add
  `SortableList`, `HabitRow`, `HabitForm` to the Component vocabulary) ·
  must not touch: anything else.
- **Rules:** kind (Habit / Chore), name, icon picker (40 icons), Build /
  Quit, who: Just me / Together / Side by side, with `ParticipantPicker`
  (Everyone button selects every active non-device person and sets the
  flag; picking people individually clears it); the five schedules with
  `QuantityStepper` for times (limits from `HABIT_TIMES_LIMITS`) and a
  weekday picker for Certain days and Every other week; time of day; life
  area; carry-over only for Every day, Certain days and Every other week
  with days; Private only for one person, with the approved hint; the edit
  page ends with Save, then Archive (with its hint), then Delete in red, one
  tap, no confirmation. A device is redirected away from both pages.
  `BackLink` on both. No plan-a-day block.
- **Verification:** gauntlet including build.
- **Done:** builds; both forms round-trip through C2's actions.

### C6 - The fix batch
- **Status:** DONE (Stark; Fury re-ran tsc and 679 tests; commit 254fa19)
- **Objective:** close open items (a) to (d) from C2 to C4 before the gates.
- **Boundaries:** may touch: `src/app/actions/habitChecks.ts`,
  `src/lib/habitsRead.ts`, new `src/lib/habitsToday.ts` and
  `src/lib/habitsToday.test.ts`, `src/components/HabitRow.tsx`,
  `src/components/HabitManager.tsx` · must not touch: anything else.
- **Rules:** (a) a tap whose day equals the server's carried day for that
  person is accepted even when older than 7 days (still never future, never
  older than the 14-day lookback). (b) Move the pure row building out of
  `loadTodayPage` into `habitsToday.ts` (no db, no `server-only`), with
  tests for: dueState "none" rows left out unless carried, done or skipped;
  decision 85's start day in progress; private rows hidden from a
  non-participant; the viewer's sort order. (c) `HabitRowView` gains
  `everyone`; the row meta reads "Everyone" for those. (d) a "My Habits &
  Chores settings" row linking to `/settings` at the bottom of Manage, as
  on the Manager board.
- **Verification:** full gauntlet; test count rises.
- **Done:** all four closed; `habitsRead.ts` back under 350 lines.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes (short) |
|---|---|---|---|---|
| 1 | Captain | BLOCKED | 4: (1) roster filter copied inline in new/edit pages (third and fourth copies; move habitWrites and visionsRead debt to `src/lib/householdPeople.ts`); (2) `SCHEDULE_CHOICES` second set of schedule words; (3) weekday names redefined in HabitScheduleField and HabitManager (export from `mealPlanDates.ts`); (4) time-of-day and who-words in four components (add to `habitVocabulary.ts`) | title max 80 vs plan titles 120 (likely defect); carry-over and Private rules written twice; carrySince twice; isCheckStatus twice; chipClass home; pure logic in HabitManager.tsx; stale "Dormant until PR B" markers; habitWrites 400 lines; edit page loads the whole Today page; A4 and STRUCTURE.md amendments for new homes |

| 1 | Vision | BLOCKED | 2: (1) the same roster filter blocker as Captain's (1); (2) a habit with a deactivated participant cannot be saved from Edit ("Pick who it is for."): accept ids already on the habit in `updateHabit`, with a test | Skip on a carried row skips today, not the missed day (Bryce's call); archived Everyone habit misses people added meanwhile (join on restore); joinEveryoneHabits outside the create transaction; tablet's Today is empty until PR C; checkInput with null input 500s; restored row's optimistic position; gauntlet re-run green (679) |
| 1 | Strange | BLOCKED | 7: (1) weekday buttons 40x44 (shrink-0, no pl-9 at 390); (2) Manage row link 46px inside a 60px row; (3) save-failure banner red, must be warn; (4) Restore button edge is line-strong only; (5) unselected segment labels text-muted on surface-2 (4.33:1), use muted-strong; (6) Quit tag uses warn amber (false caution), make it neutral; (7) HabitRow hand-builds a second round log button: extend `LogButton` with `idle="empty"` | stepper "1time" gap; Together hint count; Every other week days hidden in Manage; skipped row has no visible words; avatar order flips; no habits loading.tsx; dnd-kit hydration id mismatch (stable id on DndContext); no-icon item shows no icon picked; mock gaps listed for Bryce |

**Test data on dev (Strange, pass 1):** zz m31 daily, zz m31 days, zz m31 weekly (Everyone), zz m31 monthly (Private), zz m31 together. zz m31 biweekly already deleted. Fury removes the rest through the app after the gates.

### F1 - Structure fixes (Captain 1 to 4, Vision 1)
- **Status:** DONE (Stark; Fury re-ran tsc; 690 tests in Stark's run). Left for F2: stale Dormant markers in schedule/carryOver/streaks/access/planPrompts/perfectDays, `progress.ts`'s private `isCheck`. Fury amends STRUCTURE.md.
- **Objective:** one home for the household roster, the habit words and the weekday names, plus the shared title limit and editor rules.
- **Boundaries:** may touch: new `src/lib/householdPeople.ts`, `src/lib/habits/habitWrites.ts`, new `src/lib/habits/participantWrites.ts`, `src/lib/visionsRead.ts`, `src/app/(app)/habits/new/page.tsx`, `src/app/(app)/habits/[id]/edit/page.tsx`, `src/lib/habitsRead.ts`, `src/lib/habitsToday.ts` and its test, `src/lib/habitVocabulary.ts` and its test, `src/lib/mealPlanDates.ts` (export `FULL_DAY_NAMES` only), `src/components/HabitScheduleField.tsx`, `HabitManager.tsx`, `HabitRow.tsx`, `HabitTodayList.tsx`, `HabitForm.tsx`, `src/app/actions/habits.ts`, `src/app/actions/habitChecks.ts`, `src/app/actions/users.ts` (call site only), any file that imports a moved export · must not touch: anything else.
- **Rules:** `householdPeople.ts` (`server-only`) exports the one "active, non-device person" filter and `loadHouseholdPeople(client?)` (`{ id, displayName }`, oldest first); `householdParticipantIds` and `visionsRead.ts` use it; the habit pages get their roster through `habitsRead.ts` (`loadHabitRoster`), no inline `User` query. Move `householdParticipantIds`, `joinEveryoneHabits`, `reorderHabits` and the participant replace into `habits/participantWrites.ts`. `habitVocabulary.ts` gains: `HABIT_SCHEDULE_LABELS` = the editor's approved words (and `HABIT_SCHEDULE_SHORT_LABELS` for Manage if needed), `TIME_OF_DAY_LABELS`, one who-label function (Mine / Together / Side by side / Everyone), `HABIT_TITLE_MAX` = 120 (matching `GOAL_TITLE_MAX`), `canCarryOver(schedule, days)`, `canBePrivate(count)`, `isCheckStatus(status)`, each tested; every component and the action import them, no local copies. Weekday names come from `mealPlanDates.ts` (`FULL_DAY_NAMES`; letters are `name[0]`). One `carrySince` and one start-day helper in `habitsToday.ts`, used by `habitsRead.ts`. Remove stale "Dormant until PR B" markers on exports now called; re-mark `streakAfter` and `scheduledDaysInRange` with their real consumer (PR C stats page, PR C calendar).
- **Verification:** full gauntlet; tests rise.
- **Done:** `grep -rn "role: { not: \"device\" }" src` shows only `householdPeople.ts`; no habit word list outside `habitVocabulary.ts`.

### F2 - Design and behaviour fixes (Strange 1 to 7, Vision 2, cheap notes)
- **Status:** DONE (Stark; Fury re-ran tsc; 694 tests, build exit 0 in Stark's run). `participantsAllowed` is in `habitsToday.ts` (pure, tested); `joinHouseholdToHabit` in `participantWrites.ts`; LogButton gains `idle` and `skipped`.
- **Objective:** clear Strange's seven blockers and Vision's deactivated-participant bug.
- **Boundaries:** may touch: `src/components/HabitScheduleField.tsx`, `HabitManager.tsx`, `HabitRow.tsx`, `HabitForm.tsx`, `LogButton.tsx`, `SortableList.tsx`, `src/app/actions/habits.ts`, `src/lib/habitsToday.ts` and its test, `src/lib/habits/participantWrites.ts`, `src/lib/habits/habitWrites.ts` (restore only) ; comment-only edits to the Dormant markers in `src/lib/habits/{schedule,carryOver,streaks,access,planPrompts,perfectDays}.ts`; `src/lib/habits/progress.ts` (use `isCheckStatus` only) · must not touch: anything else.
- **Rules:** each Strange blocker fixed as its pass-1 finding says. `LogButton` gains `idle?: "plus" | "empty"` (default "plus", so Plans & Goals look the same as today); `HabitRow` uses it with `idle="empty"`. Quit tag neutral (`bg-surface-2 text-muted-strong`); Carried over keeps warn. `updateHabit` accepts participant ids already on the habit even if no longer in the household (test it through a pure helper). Also: stable `id` on `DndContext` (`useId`); participants sorted by a stable key in `buildTodayRows`; `restoreHabit` on an Everyone habit joins the current household; `checkInput` returns `{ error }` for a non-object input.
- **Verification:** full gauntlet; tests rise.
- **Done:** all of the above.

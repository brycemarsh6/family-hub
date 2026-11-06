# Mission: Habits & Chores PR E2, plan the day (mission 35)

**Project:** family-hub (Marshee)
**Status:** BUILDING (C0 to C2 committed; C3+C4 and C5 dispatched in parallel)
**Started:** 2026-11-05 · **Updated:** 2026-11-06
**Branch:** `claude/habits-e2-plan-day` (from origin/main 192a4db, after PR E1)

## Brief

- **Goal:** the second half of "PR E, mission 34: the dashboard" in
  `.avengers/plans/habits-chores-build.md` (split by Fury in mission 34):
  plan-the-day prompts, Planned today, planned days on the Calendar.
  Decisions 36 to 41, 47, 50 and 141 to 146 in
  `.avengers/plans/habits-chores-v1.md`.
- **Done means:** on production, on a prompt day (weekly: Friday; monthly:
  Sundays on days 1 to 14, Sundays and Thursdays from day 15) a person sees
  a "Pick a day" card for each open habit not done and not planned in its
  period, on the dashboard and at the top of Habits & Chores, taps a chip
  and the card leaves; on the planned day the habit shows in a "Planned
  today" card on the dashboard and as a required row on Today with the meta
  "Planned for today"; the Calendar shows the planned day to the habit's
  people only, opening `/habits/[id]`. Gauntlet green; Vision, Strange and
  Captain PASS.
- **Out of scope:** Winnie texts (own project); the Report and idea
  library (PR F, mission 36); un-planning a day (not in any decision; note
  it if a gate asks).
- **Never blocks on Bryce.** Hill decides; his checks go on his checklist.
- **Bryce is asleep (2026-11-05 night) and said "continue until the plan
  has finished."** Fury runs E2 and F end to end.

## Danger register

- As mission 34. **No migration expected:** `HabitPlannedDay` exists
  (`schema.prisma`, migration `20261106000000_add_habits`). If one is
  needed, additive only, Fury reads it and applies with `migrate deploy`
  after the `ep-hidden-pine-` host check.
- Forbidden: `db:seed`, `db:reset`, `migrate reset`, `db push`, `migrate
  dev`. No script touches `User` rows. Stage by path.

## Gauntlet

Same as mission 34 (tsc, `eslint .`, `npm test` rising from 881,
UTC and LA direct runs, build with the invalid URL, recordcheck).

## Assembled

Stark; Vision (Fable), Strange and Captain (Opus); Hill (Fable, xhigh).
No Banner: mission 34's brief covers E2 (its "E2 facts" and conflicts C1
to C4, C14 to C17). 3 passes per gate.

## Structure calls (Fury)

- **C0 first:** split `habits/habitWrites.ts` (364 lines) as Captain asked
  in mission 33: the streak cache block becomes `habits/streakWrites.ts`;
  STRUCTURE.md's "`habitWrites.ts` alone writes the cached streak columns"
  sentence moves with it.
- `habits/planWrites.ts` (`server-only`) is the only writer of
  `HabitPlannedDay`; the action is `src/app/actions/habitPlans.ts`.
- Planned days are read in `habitsRead.ts` (Today, dashboard) and
  `habitsStatsRead.ts` (Calendar range), the two habit readers.
- The Calendar gets its own item type for a planned habit (no reuse of
  `CalendarTaskView`, whose tap opens the task editor and whose
  `completedAt` means task completion).

## Contracts

### C0 - Split habitWrites.ts
- **Objective:** `habits/streakWrites.ts` holds the streak cache writes
  (`recomputeStreaks` through `storeStreaks`, `recomputePersonStreaks`);
  `habitWrites.ts` imports it; behaviour unchanged.
- **Boundaries:** `src/lib/habits/habitWrites.ts`, new
  `src/lib/habits/streakWrites.ts`, their importers (imports only).
- **Verification:** full gauntlet; both files under 350.
- **Status:** DONE (commit after 9a0028a; habitWrites 253, streakWrites 119; Fury re-ran: 889 tests, UTC 882+7 skips, LA 889, build 0).

### C1 - Prompt rules, pure, with tests
- **Objective:** `isPromptDay` counts only planned days inside the
  habit's current period, today or later (143); a pure `promptChips(spec,
  today)` gives up to three days left in the period from today ("Today",
  then short weekday names) and whether "Other day" shows (142), plus the
  last day an "Other day" date may take; a pure "planned for today" input
  to `dueState`; the "Planned for today" meta (145) and the prompt card
  words in `habitVocabulary.ts`. Remove the "Dormant until PR E" comment.
- **Boundaries:** `src/lib/habits/planPrompts.ts` (+test),
  `src/lib/habits/schedule.ts` only if needed, `src/lib/habitVocabulary.ts`.
- **Verification:** tests for: a weekly item planned next week no longer
  silences this week's Friday prompt; Friday chips are Today and Sat with
  no Other day; monthly day 15 Thursday chips; monthly last day.
- **Status:** DONE (same commit; `isPlannableDay`, `isPlannedToday` added).

### C2 - Writer and action
- **Objective:** `planHabitDay(habitId, day)` saves a planned day; Together
  fans out one row per participant, Side by side only for the person
  (144); the day must be today or later and inside the habit's current
  period; only open kinds; `canLogFor` gates it; revalidates `/`,
  `/habits`, `/calendar`.
- **Boundaries:** new `src/lib/habits/planWrites.ts`, new
  `src/app/actions/habitPlans.ts`, `src/lib/habits/access.ts` only if a
  rule is missing (with test).
- **Verification:** pure validation in a tested helper; tsc; build.
- **Status:** DONE (same commit; no access.ts change; un-planning stays out of scope).

### C3 - Readers and Today
- **Objective:** `loadTodayPage` loads the viewer's planned days in the
  current week and month; `buildTodayRows` passes `planned` to
  `dueState` (a planned row is required: counts and confetti, 145) and
  sets the "Planned for today" meta; `TodayPage` gains `prompts` (habits
  that prompt today, with their chips) and the dashboard data gains
  `plannedToday` rows. Today's top shows the Pick a day cards (39);
  no Planned today card on Today (145).
- **Boundaries:** `src/lib/habitsRead.ts`, `src/lib/habitsToday.ts`
  (+test; split a sibling if it passes 350), `src/components/HabitTodayList.tsx`,
  new `src/components/PlanDayCard.tsx`.

### C4 - Dashboard cards
- **Objective:** on the dashboard, after the nudge and Sunday cards: the
  "Planned today" card (live HabitRows, 145) and the Pick a day cards
  (141, 142); the Habits tile leaves out rows already in Planned today.
  None on the tablet.
- **Boundaries:** `src/app/(app)/(home)/page.tsx`, `HabitsTile.tsx`,
  `src/lib/habitsDashboard.ts` (+test), `PlanDayCard.tsx`, a new
  `PlannedTodayCard.tsx`.

### C5 - Calendar
- **Objective:** planned days on the Calendar (146): only to the habit's
  participants (private: only its person; device: none), all-day, the
  habit's icon, opens `/habits/[id]`, done struck through with a check,
  undone plain, in Month, Schedule, Day and timeline all-day strips.
- **Boundaries:** `src/lib/habitsStatsRead.ts` (the range reader), the
  calendar page and `fetchTasks` paging source (or a sibling fetch action),
  `src/lib/types.ts` (a new item type), and the calendar components that
  draw all-day items; Stark lists them before editing and keeps files over
  the soft cap from growing more than needed.

### C6 - Records
- Mission ledger, plan, CLAUDE.md status and checklist, STRUCTURE.md homes
  (`streakWrites.ts`, `planWrites.ts`, `habitPlans.ts`, the calendar item
  type, the new cards), DESIGN.md (the cards, the calendar item).

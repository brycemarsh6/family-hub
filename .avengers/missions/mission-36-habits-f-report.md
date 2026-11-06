# Mission: Habits & Chores PR F, the Report and idea library (mission 36)

**Project:** family-hub (Marshee)
**Status:** GATED, waiting on Bryce (Strange's 3-pass budget used; one fix F4 built after pass 3)
**Branch:** `claude/habits-f-report` (from origin/main c17ae67, after PR E2 went live)

## Where it stands

- Built C0 to C3; fixes F1 to F4 committed (F4 = 32f104e). Gauntlet at 32f104e: 974 tests; UTC 967 + 7 DST skips; LA 974; build 0.
- Pass 3 (b4f3e4f): Vision PASS, Captain PASS, Strange BLOCKED (stats page month header for open kinds read "0 of 0 so far" / "1 of 1 so far" while the Report said "0 of 1" and today was ringed "not done yet").
- F4 fixed it (the open-kind count rule moved to `habitsStats.ts`, shared by the Report and the stats header). Not yet re-checked by Strange: that would be a fourth pass, so Fury asked Bryce (2026-11-06) before running it. Nothing pushed.
- Next if Bryce says yes: Strange re-checks three stats pages (zz m31 monthly, zz m31 weekly, zz m35 bike ride), then C4 records and ship.
- Gate notes and Captain's p3 amendment text: Fury's scratchpad `captain-f-p3.md` (fold into C4).

## Facts that shape the contracts (from Banner)

- **Live bug (fix first):** the stats calendar and `completionRate`
  (`habitsStats.ts`) ignore `ChoreWeekOverride`, so a chore that was skipped or
  moved for the week shows as "missed". Decision 170 also makes vacation days
  and week-skipped days draw as Skipped.
- **Readers:** a Report reader must live in `habitsStatsRead.ts`, because
  STRUCTURE.md forbids a third habit reader. `loadHabitStats` reads logs with
  no date limit, so the Report needs loaders by range.
- **Files near the size caps:**
  - `HabitForm.tsx` is 351 lines, so split it before adding idea chips.
  - `habitsStats.ts`, `habitsFamily.ts` and `habitsStatsRead.ts` are also close.
- **Wording file pattern:** `goalPrompts.ts` mirrors an md file, and
  `goalPrompts.test.ts` checks the two match. `habitIdeas.ts` belongs at the
  top level of `src/lib/`.
- **Existing code to reuse:**
  - Week pager: the Calendar's (`calendarViewConfig.ts`, `CalendarHeader.tsx`).
    Meal Plan has none, and `formatWeekRange` writes an en dash.
  - Tabs: `PlansTabs.tsx` (33 lines) is the one tab control. Generalize it.

## Done means

On production: `/habits/report` (reached from a card at the bottom of
Habits & Chores, never on the tablet) shows the shown person's items in
Week, Month and Year views with pagers, a filter and, for parents, person
chips (decisions 163 to 171). The stats calendar draws vacation days and
a chore's week-skipped days as Skipped and its moved days correctly (170).
The New form shows idea chips that fill a whole idea (172 to 174). A
Together or Side by side item cannot be saved with fewer than two people
(175). Gauntlet green; Vision, Captain and Strange PASS.

**Out of scope:** swipe to page; editing from the Report (cells are
read-only); ideas on Edit; un-planning; Winnie.

## Danger register

As mission 35. No migration expected. Forbidden: `db:seed`, `db:reset`,
`migrate reset`, `db push`, `migrate dev`; no script touches `User` rows;
no `.env` edits; stage by path.

## Gauntlet

tsc, `eslint .`, `npm test` (922 at start), the UTC and LA direct runs,
build with the invalid URL, recordcheck.

## Assembled

Stark; Vision (Fable), Captain and Strange (Opus); Hill decided 163 to 175.
Banner's brief is the facts above. 3 passes per gate.

## Structure calls (Fury)

- The Report's pure rules live in a new `src/lib/habitsReport.ts`
  (+test), which may import `habitsStats.ts`, never the reverse. Its
  loader `loadHabitReport` lives in `habitsStatsRead.ts` (no third reader).
- One shared day cell component (`HabitDayCell.tsx`) draws a day for the
  stats calendar and every Report grid; `HabitMonthCalendar` gains a
  compact, read-only mode rather than a copy.
- `PlansTabs` becomes a generic tab control (or a sibling that shares its
  classes); one tab look in the app.
- The dash-free week title is a new function beside `formatWeekRange`
  (which keeps its en dash for Meal Plan), not a second date formatter
  elsewhere.
- `src/lib/habitIdeas.ts` (top level, since `habits/` may not import
  `goalVocabulary.ts`) mirrors `.avengers/plans/habits-ideas.md`, checked by
  `habitIdeas.test.ts` like `goalPrompts.test.ts`.
- `HabitForm.tsx` (351) is split before it grows.

## Contracts

### C0 - Stats calendar truth (170) and the shared cell
- **Objective:** `monthCalendar` and `completionRate` in `habitsStats.ts`
  apply vacations and `ChoreWeekOverride` (through `habits/weekOverrides.ts`
  and `dayInVacation`): an undone vacation day or week-skipped chore day is
  "skipped" (with a reason for the spoken label: on vacation, skipped this
  week), a moved-away day is not due ("not due, moved to Thu"), the
  moved-to day is due; a check always wins. `loadHabitStats` fetches the
  overrides. Extract the day cell from `HabitMonthCalendar.tsx` into
  `HabitDayCell.tsx`; add a compact read-only mode to `HabitMonthCalendar`.
- **Boundaries:** `src/lib/habitsStats.ts` (+test), `src/lib/habitsFamily.ts`
  (only to pass overrides), `src/lib/habitsStatsRead.ts`,
  `src/components/HabitMonthCalendar.tsx`, new `HabitDayCell.tsx`.
- **Verification:** tests for each case (vacation, week skip, move away,
  move to, check wins); completion rate unchanged for vacation; full gauntlet.

### C1 - Report rules and loader
- **Objective:** pure `habitsReport.ts`: the shown person's items (165,
  private rule), Habits then Chores in Manage order, week rows (7 cells and
  the count text per kind, 166), month cards (167), the year grid for one
  item with its totals line (168), filter options and matching (169, falls
  back to All), pager bounds (earliest start; next disabled on current),
  the URL params parse (`view`, `week`/`month`/`year`, `person`, `filter`,
  `item`), person chips for parents (165, 119's order), and the dash-free
  week title (166, beside `formatWeekRange`). Words in `habitVocabulary.ts`.
  `loadHabitReport(viewer, params, today)` in `habitsStatsRead.ts` reads by
  the range shown only.
- **Boundaries:** new `src/lib/habitsReport.ts` (+test) and its sibling
  split `src/lib/habitsReportScope.ts` (+test: params, person and privacy
  scope, filter, period clamp, `reportHref`; amended by Fury after Vision
  pass 1, since `habitsReport.ts` reached 405 lines; `habitsReport.ts`
  imports it, never the reverse),
  `src/lib/habitsStatsRead.ts`, `src/lib/habitVocabulary.ts`,
  `src/lib/mealPlanDates.ts` (one new function), `src/lib/habits/access.ts`
  only if a rule is missing (with test).
- **Verification:** tests for every rule above, including a parent viewing
  a kid, a private habit of someone else, a Side by side row showing only
  the shown person, week and month titles across years.

### C2 - The Report page
- **Objective:** `/habits/report` page and components per 163 to 171: the
  generic tabs, person chips, `HabitFilterChips`, the pager (44px arrows,
  CalendarHeader's look, "This week" pill on a past week), the Week strips,
  Month cards (compact read-only calendar), Year (twelve compact grids, the
  "Which item?" `RadioSheet` chooser), the legend, the empty states (171),
  and the link card at the bottom of `/habits` (both views). The tablet is
  redirected to `/habits` and never sees the card. BackLink to `/habits`.
- **Boundaries:** new `src/app/(app)/habits/report/page.tsx`, new report
  components, `src/app/(app)/habits/page.tsx` (the card), `PlansTabs.tsx`
  (generalize) and its users, `HabitFilterChips.tsx` if needed.

### C3 - Idea library and the two-people rule
- **Objective:** `habitIdeas.ts` from `habits-ideas.md` (structured: title,
  icon, schedule, days, times, time of day, mode) with a parity test (counts
  6 per area and 8 chores, no repeats, no dashes, icons in `HABIT_ICONS`,
  word-for-word match); on the New form only, Life area moves under Name,
  "Ideas for {short}" chips show for the lit area (habit), "Chore ideas"
  under Name for a chore, and a tap fills the whole idea (172, 173);
  hint words per 172. Decision 175: Together or Side by side with fewer
  than two people is refused with "Pick at least two people, or choose
  Just me." in the form's alert line and in `actions/habits.ts`.
- **Boundaries:** new `src/lib/habitIdeas.ts` (+test), `HabitForm.tsx`
  (split first into a sibling, e.g. the people or schedule section),
  `IdeaChips.tsx` only if needed, `src/app/actions/habits.ts`,
  `src/lib/habitVocabulary.ts` (words), `src/lib/habitsToday.ts` only if the
  rule belongs beside `participantsAllowed` (it is at 338, keep it under 350).

### C4 - Records
- Mission ledger and Delivery, the plan, CLAUDE.md status and checklist,
  STRUCTURE.md homes (`habitsReport.ts`, `HabitDayCell.tsx`, the tabs,
  `habitIdeas.ts` and its md), DESIGN.md (the Report, the tabs, the idea
  chips, Skipped for vacation).

# Mission: Habits & Chores PR F, the Report and idea library (mission 36)

**Project:** family-hub (Marshee)
**Status:** DESIGN DECIDED, NOT CONTRACTED (paused 2026-11-06: usage limit)
**Branch:** `claude/habits-f-report` (from origin/main c17ae67, after PR E2 went live)

## Where it stands

- Banner's brief is done (in the session transcript). Its key facts are summed up below.
- Hill decided 163 to 174 and wrote the idea wording, all saved word for word in
  `.avengers/plans/habits-f-decisions-hill.md`. They are not yet folded into
  `habits-chores-v1.md` or a wording file.
- Hill was asked decision 175 (Together or Side by side with only one person).
  Her answer was not recorded before the pause. Ask again.
- Nothing is built.

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

## Contract plan (proposed)

- **C0:** fix the chore skip/move bug and draw vacation days as Skipped in
  `monthCalendar` and `completionRate`, with tests. Extract the shared day
  cell component.
- **C1:** pure `habitsReport.ts` (+test): week rows, month cards, year grid,
  counts, filter options, pager bounds, and the dash-free week title. Add
  `loadHabitReport` to `habitsStatsRead.ts`.
- **C2:** the `/habits/report` page (Week/Month/Year tabs, person chips,
  filter, pagers, item chooser sheet), the link card on `/habits`, and the
  tablet redirect.
- **C3:** the idea library: `habitIdeas.ts` plus its md file and a parity
  test, then the `HabitForm` changes (split first). It can run in parallel
  with C2.
- **C4:** records.
- **Gates:** Vision, Captain and Strange, three passes each.

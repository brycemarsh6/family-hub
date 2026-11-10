# STRUCTURE.md companion: Habits & Chores

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### The habit engine

`schedule.ts`, `carryOver.ts`, `streaks.ts`,
  `progress.ts`, `perfectDays.ts`, `planPrompts.ts`, `access.ts`,
  `habitRows.ts`, `weekOverrides.ts`, `choreStreak.ts`, `hours.ts` (the
  weekly-hours rules, mission-37) and `types.ts` are
  pure: no Prisma client, no `db`, and
  callers pass `today`. `habitWrites.ts`, `participantWrites.ts`, `streakWrites.ts` and
  `planWrites.ts` (all `server-only`) are the only writers of the `Habit`,
  `HabitParticipant`, `HabitLog`, `HabitPlannedDay` and `HabitTimeEntry`
  tables. One sanctioned exception (mission-47, amendment A10):
  `src/lib/assistant/undoWrites.ts` restores, removes and re-creates
  `Habit`, `HabitParticipant`, `HabitLog` and `HabitTimeEntry` rows from
  audit copies only. It applies no habit rule and never writes the columns
  that `VOLATILE` in `undoModels.ts` names (the streak caches). After its
  steps it calls `afterUndo` (`assistant/undoHooks.ts`), which rebuilds the
  touched streaks through `streakWrites.ts` in the same transaction. No
  other module outside the four writer files writes these tables.
  `streakWrites.ts` alone writes the cached streak columns (`currentStreak`,
  `bestStreak`, `streakAsOf`; split out of `habitWrites.ts` in mission-35),
  `participantWrites.ts` holds the participant writes (join, reorder,
  replace) and `atomically`, and `planWrites.ts` is the only writer of
  `HabitPlannedDay`. (Second file added mission-31; third and fourth
  mission-35.) `src/lib/habitsRead.ts` (Today, Manage,
  the editor, the action loaders and `loadHabitsForPlan`) and
  `src/lib/habitsStatsRead.ts` (the stats page and the family view,
  mission-32; the Report's `loadHabitReport`, mission-36) are the only readers of the `Habit`, `HabitParticipant`,
  `HabitLog`, `HabitTimeEntry` and `Nudge` tables for pages and actions
  (an action that needs one entry uses `loadTimeEntryForAction`). Both are
  `server-only`, and each hands its rows to a pure builder. A third reader
  is a BLOCKER. **Dependency direction:** `src/lib/habits/` may import
  `habitVocabulary.ts`, `habitHoursVocabulary.ts`, `householdDate.ts`,
  `constants.ts`, `householdPeople.ts` (the write files only), `db.ts` and the generated
  client (types). Its writers take `today` from their caller and never
  compute it. It never imports `goals*.ts`,
  `goalVocabulary.ts` or `visions*.ts`, nor any other top-level `src/lib/`
  module outside that list: no `habits*.ts`, no calendar or Schedule module
  (`scheduleWindowState.ts`, `calendarDates.ts`), no `types.ts` view type.
  Code that shapes engine answers for a screen lives one level up, in
  `src/lib/` (mission-35 moved the Calendar builder and
  `scheduleHabitDays.ts` out for this reason). The goals side may import the engine
  (`goalsProgress.ts` takes `habits/progress`, the `habits/types` types
  and `habitsHours.ts`'s plan builders, and `goals.ts` takes the
  `HabitFields` type only). `src/lib/habits/*.test.ts` is in
  `package.json`'s test script and both CI timezone steps. (Added
  mission-30.)

### Habits & Chores PR B homes

`src/lib/habitsToday.ts` is
  the only home of the Today page's rules (row building and viewer order; `carrySince` and `habitStartDay` moved to
  `habits/carryOver.ts` in mission-33, and the tap-day window
  `isTapDayAllowed` / `TAP_DAYS_BACK` followed in mission-35, so
  `habitsStats.ts` and `actions/habitChecks.ts` take it from the engine); it is pure, and `habitsRead.ts` fetches and calls it.
  `src/lib/habitChanges.ts`'s `applyHabitChange` is the only optimistic
  reducer for Today rows (the `planItemChanges.ts` precedent).
  `src/components/HabitIcon.tsx`'s record is the only habit icon-name to
  Lucide map, total over `HABIT_ICONS`. `src/components/SortableList.tsx` is
  the only file that imports `@dnd-kit`. Tap actions live in
  `actions/habitChecks.ts`, editor actions in `actions/habits.ts`. Habit
  words (schedule labels long and short, time of day, who-labels, the title
  limit, `canCarryOver`, `canBePrivate`, `isCheckStatus`, the plan-the-day words `PLAN_PROMPT_*`,
  `PLAN_OTHER_DAY_LABEL`, `planChipLabel`, `PLANNED_TODAY_TITLE`,
  `PLANNED_FOR_TODAY_LABEL`, `plannedForLabel`) live in
  `habitVocabulary.ts`; "Mine" / "Together" for a habit's people is
  `habitWhoLabel` there, and `GOAL_OWNERSHIP_LABELS` stays the words for a
  goal's ownership. `STREAK_MIN_SHOWN` and `streakLabel` there are the only
  "does a streak show, and what does it say" rule, for row streaks and the
  chore streak alike; a component that compares a streak to a number or
  types `days` after a count is a BLOCKER (added mission-34, on Captain's
  ruling; the three chore-flame copies moved over in F1).

### Habits & Chores PR C homes

`src/lib/habitsStats.ts` is
  the only home of the stats page's rules: per-person totals, the month
  calendar cells and their `tappable` window, completion rate, the side by
  side rows, the weekly series, perfect days in a month,
  `statsMonthTitle`, `effectiveState` / `dayCellLabel` (the one rule for how
  a calendar cell reads and is spoken, with its words `DAY_CELL_WORDS` and
  `DAY_CELL_REASON_WORDS` in `habitVocabulary.ts`), `nothingDueText` (shared
  with the Report, mission-36), the open-kind count (`openCountOf`,
  `openCountText`) and whether an open kind's unchecked today still draws as
  "today" (`openTodayDoable`, the period's target not yet met). Cell drawing
  is `HabitDayCell.tsx`, and `HabitDayLegend` there is the only month-calendar
  legend (stats page and Report). `src/lib/habitsFamily.ts` builds the family view and
  the stats page data (`buildFamilyPage`, `buildStatsData`,
  `statsSubject`), and holds `doneCounts` / `doneCountLabel`, the one
  "x of y done" rule for Today and the family view. Both files are pure:
  no `db`, and callers pass `today`. The row streak (`displayStreak`,
  `streakUnitOf`) lives in `habits/streaks.ts`; `habitsToday.ts` keeps the
  confetti rule `allRequiredDoneToday`. **Dependency direction:** `habitsFamily.ts` may
  import `habitsStats.ts` and `habitsToday.ts`, and `habitsStats.ts` may
  import `habitsToday.ts`; never the reverse. `canNudge` and
  `canSeeHabitStats` in `habits/access.ts` are the only nudge and stats
  policy. `src/lib/habits/nudgeWrites.ts` (`server-only`, no auth) is the
  only writer of the `Nudge` table; its only caller is
  `src/app/actions/habitNudges.ts`, which owns the session, the guards and
  `revalidatePath`. `src/lib/confettiSeen.ts` is the only home of the
  once-a-day confetti marker on each device (the `lastStore.ts` pattern),
  and `HabitConfetti.tsx` is the only importer of `canvas-confetti`.
  `src/lib/habitsFamilyColumns.ts` (pure, mission-41, Captain's A3) is the
  only home of the wide Whole family column: rows grouped by time of day then
  Anytime, the Together rows a person is on (built from `countedRows`, never
  a second merge), the row tags (words in `habitVocabulary.ts`:
  `FAMILY_ROW_TAGS`, `familyRowTag`), the empty-column line and the header
  count (`familyCountText`, used by both layouts). `HabitFamilyView` holds
  the one optimistic state for both layouts; the stacked view is
  `HabitFamilyColumn`, the wide one `HabitFamilyWide` /
  `HabitFamilyWideColumn`, and `FamilyHabitRow` is the only family row.
  **Dependency direction:** `habitsFamilyColumns.ts` imports only
  `habitVocabulary.ts` and `habitsFamily.ts`; `habitsFamily.ts` never
  imports it.

### Habits & Chores PR D homes

`habits/weekOverrides.ts`
  is the only home of the this-week chore rules (`choreDayState`,
  `choreTag`, `weekChange`) and of `isExcused`, the one "excused row" rule
  (skipped today, or excused all day), built on `isExcusedAllDay`
  (skipped this week or on vacation, and not done: a check done on such
  a day counts, decisions 127 and 130). The counts and the sort call
  `isExcused`; the confetti rule `allRequiredDoneToday` calls
  `isExcusedAllDay`, because a skip today still counts as finishing a
  required row. Deciding whether a row is excused anywhere outside
  `weekOverrides.ts` is a BLOCKER; a component may read `onVacation` or
  `skippedThisWeek` only to choose which label or marker to show. `habits/choreStreak.ts` is the only home of
  the chore streak (`computeChoreStreak`, `choreStreakAfter`,
  `finishedAllChoresLastWeek`). `habits/carryOver.ts` holds `carrySince`, `habitStartDay` and the tap-day
  window `isTapDayAllowed` / `TAP_DAYS_BACK` (all moved from `habitsToday.ts`
  so the engine never imports upward). `habits/choreWrites.ts` (`server-only`) is the only writer of `ChoreWeekOverride` (`habitWrites.ts`'s
  `updateHabit` clears a habit's rows through its `clearChoreChanges` when
  the schedule leaves `weekdays`) and of the `UserPreferences` chore streak
  columns, through one `recomputeChoreStreak`, called in the same
  transaction by every write that can change it. `habits/vacationWrites.ts`
  (`server-only`) is the only writer of `VacationPeriod`. Their callers are
  `src/app/actions/choreChart.ts` and `src/app/actions/vacations.ts`, which
  own the session and the tablet refusal, and call `canEditChart` and
  `canChangeChore` (in `habits/access.ts`, the only chart and
  chore-change policy: a shared chore is a parent's or admin's, decision
  125). `src/lib/choreChart.ts` holds
  the chore pages' pure builders (the chart, the chore header with its
  streak and Sunday flag, the vacation list order); its loaders live in the
  two habit readers above, which now also read `ChoreWeekOverride`,
  `VacationPeriod` and the chore streak columns. On the family view the
  chore streak and Sunday flag count private chores, but only the number
  and the flag leave the server. **Dependency direction:**
  `choreChart.ts` imports only `habits/`, `habitVocabulary.ts`,
  `householdDate.ts` and `mealPlanDates.ts`. `habitsToday.ts`,
  `habitsFamily.ts`, `habitsRead.ts`, `habitsStatsRead.ts`, `habitsReport.ts`
  and `habitsReportScope.ts` may import it (the two Report files take
  `firstNameOf` and the chip types), and it never imports any of them. Among the write files,
  `vacationWrites.ts` and `habitWrites.ts` may import `streakWrites.ts`;
  `streakWrites.ts` may import `choreWrites.ts`; `habitWrites.ts`,
  `streakWrites.ts`, `choreWrites.ts` and `vacationWrites.ts` may import
  `participantWrites.ts`; `planWrites.ts` imports only `habitRows.ts` from
  the engine. Never the reverse of any of these. (Updated mission-35.)

### Habits & Chores PR E2 homes

`habits/planPrompts.ts`
  (pure, engine) is the only home of the plan-the-day rules: `isPromptDay`
  (decision 143), `promptChips` (142), `isPlannableDay`, `isPlannedToday`
  (the `planned` input to `dueState`, 145) and the "Planned for Sat" rule
  (`laterPlannedDay`, `plannedLaterLabel`, 162). `src/lib/habitsPrompts.ts`
  (pure) builds the Pick a day card's data (`buildTodayPrompts`,
  `PromptHabitInput`, `TodayPrompt`); `habitsToday.ts` may import it, never
  the reverse. `habits/planWrites.ts` (`server-only`, no auth, the
  `nudgeWrites.ts` shape) has one caller, `src/app/actions/habitPlans.ts`,
  which owns the session, `canLogFor`, `isPlannableDay` and
  `revalidatePath`, and imports it as `planHabitDay as planHabitDayRow`. If
  a second caller appears (a Winnie route), the day check moves into the
  writer. Planned days are read only by `habitsRead.ts` (Today, dashboard)
  and `habitsStatsRead.ts`'s `loadPlannedHabitDays` (the Calendar range,
  reached from the Schedule through `fetchHabitDays` in
  `actions/calendar.ts`). `src/lib/habitsCalendar.ts` (pure) is the only
  home of which planned days the Calendar shows and when one reads as done:
  `buildCalendarHabitDays` owns the view rule (the tablet sees none; only
  the viewer's own rows on a habit they are still on and may see,
  `canSeeHabit`, count; a removed participant keeps their rows, so the
  participant check is a real rule; the reader's device early return only
  skips the query) and done (`isCheckStatus` that day, or the period's
  target met, decision 160); `plannedPeriodsRange` there is the only "which
  checks the Calendar needs" range. `CalendarHabitDayView` in `types.ts` is
  the Calendar's planned-day item, never a `CalendarTaskView` (a task's tap
  opens the task editor and its `completedAt` means task completion).
  `src/lib/scheduleHabitDays.ts` is pure: `addHabitDaysToSchedule` and
  `coversWindow` (whether fetched coverage holds the whole window);
  `useScheduleHabitDays.ts` owns only fetching and state, with
  `fetchHabitDays` passed in. `PlanDayCard.tsx` (the one Pick a day card,
  decision 161), `PlannedTodayCard.tsx`, `HabitDayCard.tsx` (the Schedule
  row) and `HabitDayPill.tsx` (the all-day strip pill) are the only
  components that draw these; a second copy inside a calendar component is a
  BLOCKER. **Dependency direction:** `habitsCalendar.ts` imports only
  `habits/`, `householdDate.ts`, `habitVocabulary.ts` and `types.ts`;
  `scheduleHabitDays.ts` imports only `calendarDates.ts`,
  `scheduleWindowState.ts` (types) and `types.ts`; `habitsStatsRead.ts`
  may import `habitsCalendar.ts`, never the reverse.

### Habits & Chores PR F homes

`src/lib/habitsReport.ts` is
  the only home of the Report's own rules: the pager (bounds, and the "This
  week" / "This month" pill on a past period), each item's cells by range,
  sections, the year totals, and `countText`, which composes a row's count
  from `openCountOf` / `openCountText` (open kinds) and `nothingDueText`
  (both in `habitsStats.ts`, which the stats page header uses too, so neither
  says "0 of 0", decisions 177 and 181). A second copy of either count rule,
  in a component or a lib file, is a BLOCKER. `habitsReport.ts` and
  `habitsFamily.ts` (`buildStatsData`, `calendar.nothingDue`,
  `calendar.openCount`) call them; the words are in `habitVocabulary.ts`
  (`REPORT_LABELS`, `reportCountOf`, `reportCountThis`, `reportYearTotals`,
  `reportDueLabel`, `REPORT_DUE_TODAY`, `reportNotThis`). Every Report cell
  comes from `monthCalendar` in `habitsStats.ts`, so the Report and the stats
  page draw a day by one rule; a second cell-state rule is a BLOCKER.
  `src/lib/habitsReportScope.ts` is the only home of the Report's address and
  scope: `parseReportParams`, `reportHref`, `weekParam` / `monthParam`, who
  is shown (`reportPersonId`), the person chips, the shown items (Habits then
  Chores, each in Manage order), the filter and the range the loader reads.
  `reportFilterOptions` (with `{ kinds: false }` for lists already split by
  kind), `activeReportFilter` and `matchesReportFilter` there are the one
  habit filter rule; the Report, Today's `HabitTodayList` and the wide Whole
  family (`HabitFamilyWide`) all call them (mission-41, Captain's A2). A
  filter option builder or matcher anywhere else, a component file included,
  is a BLOCKER; `HabitFilterChips.tsx` only draws chips and attaches
  `TIME_ICONS`.
  **Habits & Chores page (mission-53, Captain's A-L3-4 to A-L3-7).**
  `src/lib/habitsDay.ts` is the only home of the day browser
  (`resolveHabitsDay`) and the `/habits` URL builder (`habitsHref`); a
  past day's lock is display only, and writes keep `isTapDayAllowed`. It
  imports only `householdDate.ts` and `habits/carryOver.ts`.
  `habitsFamilyColumns.ts` is the only time-of-day grouping
  (`groupColumnRows` for the family view, phone cards and wide columns
  alike; `groupRowsByTime` for Mine), the only fit rule (`fitsEveryone`,
  `FIT_COLUMN_MIN` 220 and `FIT_COLUMN_GAP` 12, which is `gap-3`; both
  ends name each other) and the only home of a column's empty text
  (`emptyColumnText`). Row tags come from `familyRowTag` through
  `ColumnItem` / `TimeRowItem`. `HabitRow layout="auto"` and
  `FamilyHabitRow layout="card"` are the only tall cards. The file
  imports only vocabulary, `habitsFamily.ts` and types from
  `habitsToday.ts`. `HabitsDayView` is the one client owner of the Filter
  state for both views, and `habitsReportScope.ts` holds every Today and
  Whole family filter rule: `reportFilterOptions(..., { kinds: false,
  areas: false })`, `matchesHabitsFilter`, `narrowedFilterCount`
  (decision 261), `stillHiddenPeople` and `shownColumns`. Lists receive
  `keep(row)` only; a component that matches rows or columns against the
  Filter, people included, is a BLOCKER, and `HabitFilterSheet.tsx` only
  draws each chip's on/off state. `HabitsBar.tsx` is the only Habits bar,
  drawn through `bar(subtitle)`; `HabitFilterSheet.tsx` is the only
  filter sheet and the only Mine / Whole family switch; the bar icon is
  the only Report entry.
  `TIME_ICONS`, exported from `HabitFilterChips.tsx`, is the only
  time-of-day icon map. Both Report files are pure: no `db`, and callers pass
  `today`. `canSeeHabitReport(actor, personId)` in `habits/access.ts` is the
  only "whose Report may this viewer open" rule (it matches `canEditChart` on
  purpose; they come from separate decisions, 164 and 119/125); a
  `MANAGER_ROLES` or role test for the Report anywhere else is a BLOCKER.
  `loadHabitReport` in `habitsStatsRead.ts` is the Report's only reader: it
  asks `reportPersonId` who is shown before it queries, and reads checks,
  vacations and `ChoreWeekOverride` rows for the range shown only, never all
  time. `sharedNeedsMorePeople` in `habitsToday.ts`, beside
  `participantsAllowed`, is the one "Together or Side by side needs two
  people" rule (decision 175) and `SHARED_NEEDS_TWO_MESSAGE` in
  `habitVocabulary.ts` its only wording; `HabitForm` and `actions/habits.ts`
  both call them. `src/components/HabitDayCell.tsx` is the only drawing of
  one habit day, for the stats calendar and every Report grid;
  `HabitMonthCalendar`'s `compact` read-only mode is the Report's month grid,
  and a copy of either inside a Report component is a BLOCKER.
  **Dependency direction:** `habitsReport.ts` imports only
  `habitsReportScope.ts`, `habitsStats.ts`, `habits/schedule.ts`,
  `habits/types.ts`, `householdDate.ts`, `mealPlanDates.ts` (month names),
  `habitVocabulary.ts` and `choreChart.ts`. `habitsReportScope.ts` imports
  only `householdDate.ts`, `habits/` (`access.ts`, `carryOver.ts`,
  `habitRows.ts`, `schedule.ts`, `types.ts`), `goalVocabulary.ts`,
  `habitsToday.ts`, `habitVocabulary.ts` and `choreChart.ts`, and never
  `habitsReport.ts`. `habitsStats.ts`, `habitsToday.ts`, `habitsFamily.ts`,
  `choreChart.ts` and `src/lib/habits/` never import either Report file;
  `habitsStatsRead.ts` may import both. **Next touch:** an
  `isDayExcused(spec, overrides, vacations, day)` in `weekOverrides.ts`
  should become the one per-day "excused" rule; `monthCalendar` and
  `nothingDueText` each decide it today (not yet built). **Size watch:**
  `habitVocabulary.ts` is 425 lines (about 254 code; mission-53, A-L3-8:
  new habit words stay there while its code is well under the cap, past
  about 300 code lines a concern gets its own file, and an exported word
  is referenced, never typed again), `habitsStats.ts` 387, `habitsToday.ts`
  353 (about 283 code), `habitsReportScope.ts` 275, `HabitForm.tsx` 350
  (at the soft cap), `habitsRead.ts` 350, `habitsFamily.ts` 360 (its stats-page data is
  the split seam), and the tests `habitsStats.test.ts` 426,
  `habitsReport.test.ts` 373, `habitsToday.test.ts` 383 (hours tests live in
  `habitsTodayHours.test.ts`), `goalsProgress.test.ts` 367 and
  `habitsHours.test.ts` 298; the next habit rule or test goes in a new
  file by concern (a `habitReportVocabulary.ts` and a sibling stats-calendar
  test are the natural seams).

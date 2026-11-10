# STRUCTURE.md companion: Dashboard

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### The widget registry

`calendar` is first (mission-49,
  decision 237: all four sizes, Large by default, on the tablet).
  `WIDGET_SIZES` / `WIDGET_SIZE_LABELS` are the only size list and size
  names; `DASHBOARD_WIDGET_WORDS` holds the dashboard and Customize words,
  and `CALENDAR_WIDGET_WORDS` the Calendar widget's and its options' words
  (decision 238). A widget's words typed in a component are a BLOCKER.
  `parseDashboardLayout` in `dashboardLayout.ts` is the only reader of the
  stored layout JSON (version 2: a list of widget instances, each
  `{ uid, kind, size, items?, options? }`, so a kind may appear more than once).
  **Options (mission-49):** `src/lib/dashboardWidgetOptions.ts` is the only
  home of each kind's option shape, defaults (`CALENDAR_WIDGET_DEFAULTS`)
  and cleaner (`cleanWidgetOptions`); the parser and `setWidgetOptions`
  both clean through it, so a bad value or a key the kind does not have
  never survives. `calendarOptionsOf(widget)` is the only way to read a
  Calendar widget's options with defaults filled in, and `widgetRowDetail`
  the only Customize second line. Only `calendar` has options; a new
  kind's options are added there, never parsed elsewhere.
  **Upgrade rule (mission-43):** a version 1 layout is upgraded on read,
  sized by v1's own pairing rule, so a saved dashboard opens unchanged; the
  v1 insertion rule (mission-29) lives on only inside that upgrade, and runs
  over the frozen `V1_KINDS` (the seven v1 kinds), never
  `DASHBOARD_WIDGET_KINDS`, so an upgrade never adds a kind v1 lacked. A v2
  layout never gets missing kinds inserted: a removed widget stays removed.
  `nextWidgetUid` is the only rule for a new or repaired uid (Add and the
  parser's repair use it). The default layout and the v1 upgrade hold each
  kind once, so they use the bare kind, which is what `nextWidgetUid` gives
  a first instance.
  The grid is 2 columns and 4 from a 45rem container width (the dashboard
  is a wide page, mission-44: see "Wide pages" below), never from `md:`.
  `src/lib/dashboardGrid.ts` (`packWidgets`, `gridAreaVars`) is the only
  placement rule for the grid at 2 and 4 columns; the DOM stays in layout
  order and CSS variables place each cell, never `grid-auto-flow: dense`.
  `src/lib/dashboardLoaders.ts` holds the dashboard's kitchen reads and
  the Calendar widget's read (`loadCalendarWidget`: events, tasks and
  planned habit days from Denver yesterday through today + 9, one read
  shared by every Calendar widget on the layout), one loader per kind.
  `src/lib/calendarWidget.ts` is the widget's pure engine (the next item,
  a day's items with open before done, caps that drop done items first,
  empty words). It takes `today` and `now` from the browser (`useToday`,
  `useNowMinute`), never the server; it matches events by
  `daysEventCovers`, tasks and habit days by `allDayInstantToLocalDay`, and
  orders events with Schedule's `compareEvents`. The page loads only the kinds on the layout (goals load for
  every signed-in viewer and habits for every non-device viewer, for the
  notes and the pickers).
  **Picks (mission-34, per instance since mission-43):** a widget's optional `items` (only `habits` and
  `goals`, `PICKABLE_WIDGET_IDS`) is checked for shape in the parser and
  for ownership per instance, through `keepOwnPicks` in `src/lib/dashboardPicks.ts`, which also holds
  `picksOf(widget)` (the only way to read a widget's picks), `layoutForViewer` (the
  tablet's layout leaves out kinds whose `onTablet` is false: `habits` and
  `chores`, decision 138),
  and the picker's pure rules (`splitPicks`, `togglePick`); the layout
  edits (`addWidget`, `removeWidget`, `resizeWidget`, `setWidgetItems`,
  `reorderWidgets`) all sit in `dashboardLayout.ts`; `habitsTileFor` (in
  `habitsRead.ts`) and `goalsTileFor` (in `goalsRead.ts`) apply one
  instance's picks to its kind's single load; `isPickableWidget` / `PickableWidgetId` in
  `dashboardWidgets.ts` are the only "which widgets take picks" test; `src/lib/habitsDashboard.ts` the tile row rules (`habitsTileRows`, `choresTileRows`, `pickableHabits`,
  `keepShownRows` (decision 147) and `plannedTodayRows`, the only "which
  rows go on Planned today" rule, which `habitsTileRows` leaves out); the
  Goals tile's picked list is `weekTodoForGoals` beside `weekTodo` in
  `goalsProgress.ts`. The tiles' data comes from `loadDashboardHabits` in
  `habitsRead.ts` and `loadGoalsTile` in `goalsRead.ts`; no third habit
  reader. A tile with controls inside uses `DashboardTile shape="panel"`
  (DESIGN.md). `habitRowTaps` (in `HabitsTile.tsx`) is the only mapping
  from a Today row's tap to a check action, used by `HabitTodayList`,
  `HabitTileRows` and `PlannedTodayCard` for Today rows (`HabitRowView`); `HabitFamilyView`'s
  `dayOf` is the family-row twin (it logs for another person through
  `logForId`); a third copy of the carried-day routing is a BLOCKER.
  **Dependency direction:** `habitsDashboard.ts` imports only
  `habitVocabulary.ts` and types from `habitsToday.ts`; `dashboardPicks.ts`
  imports only `dashboardLayout.ts` / `dashboardWidgets.ts`; `habitsRead.ts`
  and `goalsRead.ts` may import them, never the reverse. `dashboardGrid.ts`
  imports only types from `dashboardWidgets.ts`; `dashboardLoaders.ts` is
  `server-only` and imported only by the dashboard page.
  `dashboardWidgetOptions.ts` imports only `dashboardWidgets.ts`;
  `dashboardLayout.ts` may import it, never the reverse.
  `calendarWidget.ts` imports only pure calendar and dashboard-vocabulary
  modules (`mealPlanDates`, `calendarDates`, `scheduleWindow`,
  `dashboardWidgets`, types), never `db` or a `*Read.ts`.

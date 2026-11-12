# Calendar structure rules

Companion to STRUCTURE.md, "One source of truth". The text here binds
exactly like STRUCTURE.md. The story behind each rule is in
docs/history/structure-rationale.md under the same name.

## The pointer-gesture machine

- **Two machines, and a third copy is a BLOCKER.**
  `src/lib/calendarGesture.ts` (`gestureStep`, pure, tested) is the
  calendar's machine. It alone decides what a touch is (tap, scroll, page
  slide, pinch, hold, drag) and every change between those states.
  `SwipeActions.tsx` still holds its own four-state machine for Inventory
  and Shopping rows.
- **One driver.** `src/lib/usePagedSwipe.ts` is the only caller of
  `gestureStep`. It carries out the effects: pointer capture in try/catch,
  the click swallow, the frame write, and the **one hold timer** (a single
  `window.setTimeout`, started and cleared only by the machine's
  `startHoldTimer` and `clearHoldTimer` effects). It hands `holdStarted`,
  `dragMove`, `dragDrop` and `dragCancel` to the caller's `DragCallbacks`
  and moves nothing itself.
- **`src/lib/useTimelineDrag.ts` is the DOM side of a lifted block, never
  a machine.** It acts only on `DragCallbacks`, writing the lift straight
  to the DOM (`translate`, never `transform`, so the lift's `scale`
  never stretches the move; time line, header tint, gutter marker, edge
  scroll). It must not read pointer events, keep a gesture state of its
  own, run a hold timer, or decide whether a touch is a hold, a drag or a
  scroll. Its only timers are the put-back glide's tidy-up and the edge
  scroll's `requestAnimationFrame`; its only native listener is the
  non-passive `touchmove` that stops native scrolling while a block is
  lifted. Where a drop lands is `resolveDrop` (`src/lib/timelineDrag.ts`,
  pure), fed the live `pxPerMinute`.
- **Which blocks may lift** is `canLiftOnTimeline(event)` in
  `src/lib/timelineDrag.ts` (timed, so never `allDay`, starting and ending on one day; an
  event that crosses midnight draws clipped on two days and does not
  lift). `TimelineDayColumn.tsx` sets `data-drag-id` from it, only when
  the viewer can manage events, and that attribute is how
  `isOnDragBlock` knows. A second lift test written in a component is a
  BLOCKER.
- **One definition each.** `DIRECTION_LOCK_PX` (8), `HOLD_MS` (400) and
  `HOLD_SLOP_PX` (the same 8) live in `calendarGesture.ts`;
  `SwipeActions.tsx` and `pageSettle.ts` import the lock. `SNAP_MINUTES`
  (15) lives in `timelineDrag.ts` and `EDGE_STRIP_PX` (44) in
  `useTimelineDrag.ts`. Whether a released page slide turns is
  `settlePage` (`src/lib/pageSettle.ts`) alone. A second copy of any of
  these is a BLOCKER.
- **A new swipe or hold surface** drives `gestureStep` through a driver.
  It never copies the machine and never adds a second hook with its own
  hold timer (the old CD1 branch's `useLongPressDrag.ts` was exactly
  that, and caused the 8px two-hook bug).
- **Open debt, one contract:** after Bryce checks mission-27/F3's
  `pointerdown` clear in `SwipeActions.tsx` on a real device (synthetic
  PointerEvents cannot settle this gesture), move `SwipeActions` onto
  `gestureStep`, keep its own release math (`openWidth / 2`) at the call
  site, and rename the file `gestureMachine.ts` in the same contract.
  (Added mission-19; rewritten mission-69 and mission-70, on Captain's
  ruling; mission-70's text approved by Bryce 2026-11-10.)

## The small month and the month panel

- **One small month.** `src/components/MiniMonth.tsx` is the only
  navigation grid of days: weekday letters and the 42 cells from
  `monthGridDays`, today from `isTodayCell`, an optional `selected` ring,
  dots from `daysWithItems` (`monthLayout.ts`), `onPickDay`. Its callers
  add their own header (`MonthJumpPanel`'s `MonthChips`). A second day grid
  built from `monthGridDays` for navigation is a BLOCKER; `MonthGrid`/
  `MonthCell` and `YearView` draw events and are not navigation grids.
- **The month panel** is `src/components/MonthJumpPanel.tsx`, opened and
  closed by the title; its state and layout decisions live in
  `useMonthPanel` (`src/lib/monthPanelOpen.ts`). **Remembering:** below
  `MONTH_PANEL_BESIDE_MIN_PX` (700px of the Calendar body's width,
  `gridClasses.ts`; px by design, layout.md rule 2) the state is a plain
  boolean that starts closed (Bryce: the phone never remembers it); from
  700px it is one boolean per person per device in localStorage
  (`useMonthPanelOpen`, `useSyncExternalStore`, closed on the server and
  with no viewer). **Layout:** `monthPanelBeside` (`gridClasses.ts`, pure,
  tested) puts it in a `MONTH_PANEL_SIDE_REM` column beside the view only
  on Schedule, Day, 3 Day and Week, from 700px, and only when the view
  keeps room for seven 49px columns and the hour gutter at the live root
  font size, counting a pinned Sidebar as the rail it squeezes to
  (`widthWithRailNav`, from the live `--app-nav-width`); otherwise it drops down above the view, as on Month and Year
  (chip row only). Its root carries `data-month-panel="open"` only while it
  sits beside the view; that marker is the only signal the app chrome
  reads (layout.md, "The month panel marker"). Beside-only on purpose: the
  squeeze only ever widens a body that is already wide, so it cannot flip
  the layout back. **Place:** opening or closing never moves the reader's
  place (a layout effect in `useMonthPanel` scrolls by however far the
  view's top edge moved, when the page is scrolled); on Schedule the panel
  is sticky under the pinned header (`scheduleChromeHeightPx`,
  `ScheduleView.tsx`, the one formula), and while a stacked panel is open
  there Schedule's one reveal line is the chrome plus the panel's measured
  height (`revealExtraPx`: scroll margins, the day-in-view line, the
  landed-short check, the Today observer); the phone closes before a day
  tap scrolls.
- **Schedule's day in view has one tracker,** `useScheduleDayInView`;
  ScheduleView reports it up (`onDayInViewChange`) only while the panel is
  open (`trackDayInView`), for the ring, and the panel's day tap scrolls
  the list through `scheduleRef` before falling back to `jumpToDay`.
- **A second paging surface is allowed, never a nested one.** The panel's
  little month pages with `PagedSwipeArea` (no drag callbacks), like Month
  and Year. Because `--page-dx` is inherited, `[data-glide=true]` matches
  any ancestor and React handlers bubble, a `PagedSwipeArea` or
  `PagedTrack` inside another swipe root (the timeline's
  `data-fills-viewport` root, Month's or Year's swipe area) is a BLOCKER.
- **The timeline fills to the screen's bottom through
  `useFillViewportHeight`** (`src/lib/useFillViewportHeight.ts`): it
  measures on mount, window resize, a view change, and whenever the
  `data-calendar-body` box (the panel and the view) changes size, which is
  how it follows the panel opening and closing above it. A second height
  measurement of the scroller is a BLOCKER.

(Added mission-72, on Captain's ruling.)

## One write path for an event's time

- **Two actions change an existing event's `startAt` or `endAt`:**
  `updateCalendarEvent` (the edit form) and `moveCalendarEvent` (drag),
  both in `src/app/actions/calendar.ts`. Both finish through one
  function, `afterEventSaved(eventId, requestedIds?)`, the only place an
  edited event reaches `pushEventCopies` and `refreshCalendarViews`. A
  third action that changes an event's time, or an edit path that calls
  `pushEventCopies` itself, is a BLOCKER.
- **When a second file needs to change an event's time** (for example a
  Winnie calendar write), the writes and `afterEventSaved` move together
  into `src/lib/calendarEventWrites.ts` (the `<domain>Writes.ts` rule) in
  that same contract, and both callers use it. Never a copy.
- **Outside this rule:** creating an event (`createCalendarEvent`, a new
  row, not a time change), the pull (`calendarEventPull.ts`, which writes
  Google's times into Marshee, the other direction) and "All of them" on a
  repeating event (`moveCalendarSeries`, which writes no event row itself:
  it changes Google's series and the pull brings the rows in line; see "A
  repeating series belongs to Google" below). "This one" is the plain
  `moveCalendarEvent` and stays under this rule.
- **The move's rules are pure, in `src/lib/calendarMoveRules.ts`:**
  `parseMoveStart` (ISO text with an explicit zone), `MOVE_EARLIEST` and
  `MOVE_LATEST` (the date bound), `planMove` (the end is the new start
  plus the stored length, so a client can never send a length) and
  `coversWholeDay`. They sit outside the `"use server"` file so
  `npm test` reaches them.
- **"Covers a whole day" has two homes because their days differ, not
  their rule:** `belongsInAllDayRow` (`src/lib/timelineLayout.ts`, the
  browser's days) and `coversWholeDay` (`calendarMoveRules.ts`, the
  household zone, for the server). A change to one changes the other in
  the same commit. A third copy is a BLOCKER. (Same precedent as
  `formatWeekTitle` and `formatWeekRange` in STRUCTURE.md.)
  (Added mission-70, on Captain's ruling; Bryce approved 2026-11-10.)

## A repeating series belongs to Google

- **Google owns a repeating series.** A pulled event whose source sync row
  has `googleSeriesId` set is one day of a Google series. Marshee changes
  the whole series only through `moveCalendarSeries`
  (`src/app/actions/calendarSeries.ts`, parents and admins): it patches the
  series parent's `start` and `end` in Google once, If-Match its etag, then
  pulls that calendar. It never writes a `CalendarEvent` row itself, never
  calls `afterEventSaved` or `pushEventCopies`, and never patches one
  instance in Google (that makes exceptions). Moving the days of a series
  row by row (a loop of `moveCalendarEvent`, `updateCalendarEvent` or
  `db.calendarEvent.update`), or a second action that changes a series, is
  a BLOCKER.
- **Steps and rules.** The steps are `moveSeries` in
  `src/lib/calendarSeriesMove.ts` (pure, every database and Google call
  injected, the `calendarPullRun.ts` shape). The decisions are pure in
  `src/lib/calendarSeriesRules.ts`: `planSeriesShift` (the shift in
  wall-clock minutes; it refuses another household day and a shift of
  nothing, and reuses `planMove`'s refusals, never copying them),
  `shiftParentTimes` (the only builder of the parent's times patch, moved
  in the parent's own `timeZone`, only `start` and `end` sent) and
  `planSeriesCleanup` (the rows of this series on this calendar that
  Google no longer lists). The action holds the guard and the bindings; its
  Google calls go through `calendarApi.ts`, its `LinkedCalendar` read
  through `loadSeriesCalendar` in `linkedCalendarsRead.ts`, its token
  through `getAccountAccessToken` and its deletes through
  `deletePulledEvent(del, calendarId)` in `calendarEventPull.ts`, which
  never sends Google anything for the series' own calendar. The cleanup
  runs only after a pull with no failures. The pull it runs is
  `pullCalendars({ force: true, onlyCalendarId, ignoreLease: true })`; no
  other caller passes `onlyCalendarId` or `ignoreLease`.
- **The wall-clock shift has one home.** Moving an instant by wall-clock
  minutes in a zone is `shiftWallClockInZone` in `src/lib/householdDate.ts`
  (beside `wallClockMs` and `instantAtWallClock`, which
  `zoneMidnightInstant` also uses). The server's `shiftParentTimes` and the
  browser's optimistic shift in `useEventMoves.ts` both call it, and the
  browser reads a drop's minutes through `planSeriesShift` with
  `HOUSEHOLD_TIME_ZONE`, because the server decides in that zone. A second
  copy of either is a BLOCKER.
- **The browser groups by `CalendarEventView.seriesId`**, filled only by
  `toCalendarEventView` from the source calendar's sync row. It is the one
  Google-derived id a view may carry, used only to group the days of one
  series; the browser never sends it, and the server reads its own
  `googleSeriesId` from the stored row. `CalendarEventSyncView` still
  never carries a Google id.
  (Added mission-71, on Captain's ruling; Bryce approved 2026-11-11.)

## The timeline's all-day row and zoom text

- **Lanes and items have one home.** `TIMELINE_ALL_DAY_LANES` (2) lives in
  `src/lib/timelineAllDay.ts`; Month's caps stay in `monthLayout.ts`. The
  row's items (all-day events, then tasks, then planned habit days) are
  built only by `timelineAllDayItems`. The timeline has exactly two callers
  of `assignLanes`: `TimelineAllDayStrip.tsx` (the layout, capped at
  `TIMELINE_ALL_DAY_LANES`, or unlimited while open) and
  `allDayHiddenCount` (`TimelineGrid.tsx` asks `pageAllDayHiddenCount`
  whether the chevron shows). A third caller, a lane count written in a
  component, or a second builder of the row's items is a BLOCKER.
- **One open state per visible page,** owned by `TimelineGrid.tsx` and
  reset during render when the column set changes; the strip, the header
  page and `AllDayToggle.tsx` receive it as props and keep none of their
  own.
- **Words.** "+N" / "N more", the count button's accessible name and the
  chevron's two labels are `allDayMoreLabel`, `allDayMoreAriaLabel`,
  `ALL_DAY_EXPAND_LABEL` and `ALL_DAY_COLLAPSE_LABEL` in
  `src/lib/calendarViewVocabulary.ts`. `MonthCell.tsx`'s inline "+N more"
  is known debt: the PR that gives Month decision 13's "3 more" moves its
  words into that file beside these, never a second inline copy.
- **Zoom text.** `zoomTextScale` (`timelineZoom.ts`) is the only text
  scale. `TimelineGrid.tsx` writes `--zoom-text-scale` once, beside
  `--hour-height`; markup reads only the variable (fallback 1). A component
  that needs the number in JavaScript calls `zoomTextScale(pxPerMinute *
  60)` on the passed-down `pxPerMinute`. What a block shows (title tier,
  title lines, time line, location line) is decided only by `blockTextFit`
  in real pixels from `useRootFontPx`; its rem constants and the class
  strings in `TimelineDayColumn.tsx` change together. The all-day sizes are
  `ALL_DAY_FONT_SIZE` and `ALL_DAY_ROW_HEIGHT` in `TimelineAllDayBar.tsx`,
  imported by the strip and `HabitDayPill.tsx`. A second scale function, a
  component writing its own zoom variable, or a block fit decided outside
  `blockTextFit` is a BLOCKER.
  (Added mission-73, on Captain's ruling; Bryce approved 2026-11-11.)

## Task completed, Undo (mission 74)

- **One bar, one owner.** `CalendarViews.tsx` calls `useUndoBar()`
  (`src/lib/useUndoBar.ts`) once and mounts the only `<UndoBar>` (the search
  page, mission 75, has its own single bar). The event
  moves (`useEventMoves.ts`) and the task bar both raise it through
  `showBar`/`closeBar`; a second `<UndoBar>` mount or bar state is a BLOCKER.
- **Mark complete** closes `TaskDetailSheet` (its `onCompleted`, not
  `onChanged`) and `showTaskCompleted` shows "Task completed, Undo". Undo
  calls `uncompleteTask`, the same action as the sheet's "Mark not complete".
  Only `TaskDetailSheet.tsx` and `CalendarViews.tsx` (and later the search page) import `uncompleteTask`;
  `CalendarViews` hands it to `useTaskDone`, which calls `showTaskCompleted`, so `useUndoBar.ts` never
  imports from `app/`.
- **Ticks are optimistic.** `useTaskDone` (`src/lib/useTaskDone.ts`, mission 75)
  holds one `Map<taskId, Date | null>` (`taskDoneOverrides.ts`): Mark complete and Undo set it at once, every view
  draws `applyTaskDone(tasks, map)` (Schedule through its `applyDone` prop).
  An override never outlives the server's answer: it is pruned when a fresh
  `tasks` prop agrees, and when Schedule's own loaded rows agree
  (`pruneTaskDoneWith`, which also covers days outside the page's window, and
  runs only when those rows' done states change, never on a plain re-render). A
  refused or failed Undo drops the override (`clearDone`), refreshes and shows
  a warn bar. Any other change (Mark not complete, Edit, Delete) calls
  `clearTaskDone(taskId)` from both sheet mounts first, which also closes that
  task's own "Task completed" bar (never a move's).
- **Who may undo** is `taskUndoRules.ts` (`uncompleteRefusal`,
  `TASK_UNDO_WINDOW_MS` = 60 s), enforced by the server action: parents any
  time, a person on the task (or the Tablet) within 60 seconds. What the
  sheet draws is `mayCompleteTask`; the sheet's own "Mark not complete" stays
  parents only.
- **One task sheet mount.** `CalendarTaskSheet.tsx` (mission 75) is the only
  place `<TaskDetailSheet>` is mounted. `CalendarSheets.tsx`, the sheet inside
  `ScheduleView.tsx` and the search page all use it, passing their own
  `refresh({ old, next? })` (Schedule redraws those day chunks, then router
  refresh; the others router refresh). A second `<TaskDetailSheet>` mount is a
  BLOCKER: the close, clear-tick, redraw and "Task completed" order is written
  once. `isTablet` comes from `page.tsx` (`tabletMayCompleteAnyTask`).
- **One task-tick hook.** `useTaskDone` owns the override map, its prune, the
  `taskBarFor` ref and `onTaskCompleted`. Any page with a task sheet and a bar
  calls it with its own `useUndoBar`; the action comes in as an argument.

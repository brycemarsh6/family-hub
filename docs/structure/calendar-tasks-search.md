# Calendar structure rules: tasks, top bar, search and delete

Companion to docs/structure/calendar.md (split from it in mission 76). The
text here binds exactly like STRUCTURE.md.

## Task completed, Undo (mission 74)

- **One bar, one owner.** `CalendarViews.tsx` calls `useUndoBar()`
  (`src/lib/useUndoBar.ts`) once and mounts the only `<UndoBar>` (the search
  page, mission 75, has its own single bar). The event
  moves (`useEventMoves.ts`) and the task bar both raise it through
  `showBar`/`closeBar`; a second `<UndoBar>` mount or bar state is a BLOCKER.
- **Mark complete** closes `TaskDetailSheet` (its `onCompleted`, not
  `onChanged`) and `showTaskCompleted` shows "Task completed, Undo". Undo
  calls `uncompleteTask`, the same action as the sheet's "Mark not complete".
  Only `TaskDetailSheet.tsx`, `CalendarViews.tsx` and `CalendarSearch.tsx` import `uncompleteTask`;
  those two hand it to `useTaskDone`, which calls `showTaskCompleted`, so `useUndoBar.ts` never
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

## The top bar has no Refresh (mission 75)

- The right-hand circles are Today, View (or the row of six) and
  **Search** (`CalendarHeader.tsx`, `router.push("/calendar/search")`,
  since `ActionCircle` has no link form). Pulling from Google is
  automatic; its rules are in docs/structure/calendar-sync.md, "Syncing
  without a button". A Refresh or pull-down control is a BLOCKER
  (decision 16).

## The search page (mission 75)

- **`/calendar/search`** is `page.tsx` (roster, `canManage`, `isTablet`, `BackLink`)
  plus `CalendarSearch.tsx`. The matching and arranging are `calendarSearch.ts`
  and the `searchCalendar` action; the page only asks, with a 300 ms pause and a
  request counter so an older answer never replaces a newer one. A page that
  matches in the browser, or a second search query, is a BLOCKER.
- **Results are Schedule's cards.** One `DaySection` per day. The search-only
  look is optional props (`dateLabel`, `repeatingEventIds`, `highlightWords` on
  `DaySection`; `repeats`, `highlightWords` on `EventCard`; `highlightWords` on
  `TaskCard`), so no other caller changes. Any new search-only look goes the same way.
- **Sheets and bar.** `EventDetailSheet` and `CalendarTaskSheet` (the one task
  mount), the page's own `useUndoBar` + `useTaskDone` and one `UndoBar`. After a
  change the current search runs again (`rerun`); there is no `router.refresh`
  because the results are client state.

## Parents can't delete each other's items (mission 76)

- The rule and its words live only in `src/lib/calendarDeleteRules.ts`: an
  admin or parent may delete unless another active adult is on the item and
  they are not. Kid-only, nobody, or only deactivated adults: allowed.
- `deleteCalendarEvent` and `deleteTask` read the item's people fresh and
  refuse with the rule's words. The event check runs before
  `removeEventCopies`, so a refused delete leaves Google's copies alone.
- The views carry `deleteBlockedMessage`, built from the verified viewer in
  the mappers; both sheets show it as a warn note in place of Delete.

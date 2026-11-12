# Mission 74: Calendar full screen PR 8, Task completed, Undo

- **Status:** STOPPED (Vision's 3-pass budget used, BLOCKED at pass 3; asked Bryce 2026-11-11 whether to allow a fourth pass for fix F4) (Bryce OK'd the mock and all three recommendations 2026-11-11: "Yes")
- **Started:** 2026-11-11 · **Updated:** 2026-11-11
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 8: Task completed, Undo (decision 10; answer 3)"
- **Branch:** `claude/calendar-fullscreen-pr8-d7e24d`, cut from `origin/main` `fb43a71` (PR 7 merged as #115)
- **Mock:** `.avengers/mocks/calendar-pr8-task-undo-mock.html`

## Brief

- **Goal:** after "Mark complete" in `TaskDetailSheet` the sheet closes,
  the task shows crossed out, and the shared `UndoBar` shows "Task
  completed, Undo" for 5 seconds. The server's `uncompleteTask` keeps
  "parents any time" and adds "a person on the task, within 60 seconds of
  `completedAt`" as a named constant and a pure, tested rule.
- **Done means:** the above from both sheet mounts (`CalendarSheets` and
  `ScheduleView`); the bar's Undo and the sheet's "Mark not complete" call
  one action; a kid cannot un-complete after 60 seconds or on a task they
  are not on (pure rule tests); the bar never covers the + or sits under
  the home indicator; the gauntlet passes; merged, deploy checked, phone
  test in `.avengers/status.md`, a hand-over for PR 9 in Delivery.
- **Out of scope:** a who-completed column (answer 3 accepts its absence),
  any database change, a task sheet in Month (Month opens the day), search
  and sync (PR 9), splitting `tasks.ts` or `ScheduleView.tsx` beyond what
  this needs.

## Danger register

From AGENTS.md, absolute: no `db:seed`/`db:reset`; never a clean script for
`User`; migrations additive only (none in this PR); secrets never in git or
chat; never `git add -A`/`.`; direct pushes to `main` blocked; merging
deploys to the family. No database writes by any agent.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always). Vision owns the permission rule.
- Strange: the bar is visible (placement against the + and home indicator,
  phone and iPad, Tablet at Largest).
- Captain: **in** (Fury, after C2: two new lib files, `useUndoBar.ts` and
  `taskUndoRules.ts`, and the diff passed ~350 lines). Original note: out unless a new component file appears or the diff passes ~300
  lines; a new `src/lib/` rule file follows the `tabletRules.ts` precedent.
  Vision carries the size check (`tasks.ts` 445, `ScheduleView.tsx` 564,
  `CalendarViews.tsx` 494 lines at the start).
- Banner: done (brief below).

## Banner's brief (2026-11-11, summary)

- `Task` (`schema.prisma:642`) has `completedAt`, no completed-by field.
  `TaskPerson` rows are the people on a task; a device login is never one.
- `completeTask` (`tasks.ts:295`): signed in, then `assertCanCompleteTask`
  (managers, the Tablet, or a TaskPerson). It always overwrites
  `completedAt`, so a repeat tap would restart a 60-second window.
  `uncompleteTask` (`tasks.ts:318`): managers only, does not read the row.
  Only side effect: `revalidatePath("/calendar")`. No Google push, no
  Winnie, no Assistant API write, no habits link (separate tables, no
  streaks involved).
- Only caller of both: `TaskDetailSheet.tsx:146,161`. The sheet stays open
  after complete today. `canComplete = canManage || isMine` (:127), so the
  Tablet sees no Mark complete button though the server allows it.
  No try/catch around the actions.
- `UndoBar` is mounted only in `CalendarViews.tsx:473`; its state is owned
  by `src/lib/useEventMoves.ts` (`showBar`, `closeBar`). `ScheduleView` and
  `CalendarSheets` have no access to it today.
- The crossed-out look already renders from `completedAt` in `TaskCard`,
  `MonthCell` and `AllDayTaskBar`, once the data refreshes.
- Possibly stale: the dashboard Calendar widget (only `/calendar` is
  revalidated). Unverified.

## Questions for Bryce (with the mock)

1. Wording "Task completed" / "Undo"; late refusal "Too late to undo. Ask a
   parent to mark it not complete." (warn). Recommendation: yes.
2. Tablet: show Mark complete, and allow its Undo within the same 60
   seconds. Recommendation: yes (CLAUDE.md says the Tablet can check off
   any task; today the button is missing).
3. The sheet's "Mark not complete" stays parents only. Recommendation: yes.

## Fury's structural calls (no Bryce decision needed)

- `completeTask` sets `completedAt` only when it is empty, so a repeat tap
  cannot extend the window.
- The window and rule live in a new pure `src/lib/` file with tests, not in
  `tasks.ts` (action files export only async functions; `tasks.ts` is over
  the soft cap).

## Contracts

Sequential: C1, then C2 (C2 imports C1's rule file). Shared rules: sizes in
rem, never px text; touch only; Lucide icons only; never `git add -A`/`.`;
one commit per contract; `git show --stat HEAD` after. No database writes,
no migration. Gauntlet as above (the build may fail in a worktree for env
reasons: say so, do not hide it).

### C1 - the undo rule and the server actions

1. **Objective:** a pure, tested rule for who may un-complete a task, used
   by `uncompleteTask`; `completeTask` stops restarting the window.
2. **Boundaries:**
   - May touch: new `src/lib/taskUndoRules.ts`, new `src/lib/taskUndoRules.test.ts`,
     `src/app/actions/tasks.ts`.
   - Must not touch: `prisma/schema.prisma`, any component, `src/lib/tabletRules.ts`
     (import from it, do not change it), `package.json`.
3. **Work:**
   - new `src/lib/taskUndoRules.ts`: `export const TASK_UNDO_WINDOW_MS = 60_000;` and a
     pure `uncompleteRefusal({ role, isOnTask, completedAt, now }): string | null`
     (null = allowed). Rules in order: `MANAGER_ROLES` always allowed; a
     task already not complete (`completedAt` null) is allowed (nothing to
     do); the Tablet (`tabletMayCompleteAnyTask(role)`) is allowed when
     `now - completedAt <= TASK_UNDO_WINDOW_MS`; anyone else must be on the
     task (`"You're not assigned to that task."`) and within the window;
     past the window: `TOO_LATE_TO_UNDO = "Too late to undo. Ask a parent to mark it not complete."`
     (Bryce approved the wording). A completedAt in the future (clock skew)
     counts as inside the window. Also a pure
     `mayCompleteTask({ canManage, isMine, isTablet }): boolean` for what
     the sheet draws (manager, a person on the task, or the Tablet).
   - Tests: each branch, the exact edge (60 000 ms allowed, 60 001 refused),
     kid not on task inside the window refused, device inside/outside,
     parent long after allowed, `mayCompleteTask` truth table.
   - `tasks.ts` `completeTask`: set `completedAt` only when it is null
     (`updateMany` where `completedAt: null`; if 0 rows, check the task
     exists, else `"That task no longer exists."`; already-complete is a
     success, not an error). `uncompleteTask`: signed in (`"Sign in to do that."`),
     managers keep today's path; others read the task's `completedAt` and,
     for a non-device, their `TaskPerson` row, then apply
     `uncompleteRefusal(..., now: new Date())`. Update both doc comments
     (decision 10 / answer 3 replace calendar-v2 #12's "complete only").
     Keep `tasks.ts` growth small; logic belongs in the lib file.
4. **Verification:** `npx tsc --noEmit` 0; `npm run lint` 0; `npm test` all
   pass with the new tests counted (state before/after counts); the UTC
   command passes; `npm run build` 0.
5. **Evidence:** the test names and counts, the diff stat, line counts of
   `tasks.ts` before/after, `git show --stat HEAD`.
6. **Done:** the rule and constant exist only in new `src/lib/taskUndoRules.ts`;
   `tasks.ts` imports them; tests cover the 60 000 / 60 001 edge.

- **C1 status:** DONE (Stark: 12 new tests, npm test 2048 pass, tasks.ts 445 to 464 lines; tsc 0 after `npm ci` in the worktree, Fury re-ran).

### C2 - the sheet closes, the bar shows, Undo works from both mounts

1. **Objective:** "Mark complete" closes `TaskDetailSheet` and shows the
   shared `UndoBar` "Task completed" with "Undo" from both mounts; the
   Tablet sees Mark complete.
2. **Boundaries:**
   - May touch: new `src/lib/useUndoBar.ts` (the bar state moved out of
     `useEventMoves`), `src/lib/useEventMoves.ts`, `src/components/CalendarViews.tsx`,
     `src/components/CalendarSheets.tsx`, `src/components/ScheduleView.tsx`,
     `src/components/TaskDetailSheet.tsx`, `src/app/(app)/calendar/page.tsx`,
     `docs/structure/calendar.md`.
   - Must not touch: `DESIGN.md` (680 lines, over its 650 hard cap; its
     `UndoBar` entry already names PR 8's tasks), `src/components/UndoBar.tsx` (reuse as is),
     `src/app/actions/tasks.ts`, `src/lib/taskUndoRules.ts`, `TimelineGrid.tsx`,
     `TimelineAllDayBar.tsx`, `TimelineAllDayStrip.tsx`, `MonthCell.tsx`, `TaskCard.tsx`.
3. **Work:**
   - new `src/lib/useUndoBar.ts`: owns `bar`, `showBar(next)` (new id each time, so a
     new message replaces the old and restarts the clock), `closeBar`.
     `useEventMoves` takes `showBar`/`closeBar` instead of owning them;
     the move bar behaves exactly as before. Also export a small helper
     (in the same file) that builds the task bar: `showTaskCompleted(showBar, closeBar, taskId, refresh)`
     shows `{ message: "Task completed", tone: "neutral", actionLabel: "Undo" }`;
     its action closes the bar, calls the `uncompleteTask` server action
     (the same action the sheet's "Mark not complete" calls), then on
     success `refresh()`, on refusal `showBar({ message: error, tone: "warn" })`.
     No new bar after a successful Undo.
   - `TaskDetailSheet`: new prop `onCompleted()`; on a successful complete
     call it instead of `onChanged()` (the mount closes the sheet). New
     prop `isTablet`; `canComplete = mayCompleteTask({ canManage, isMine, isTablet })`.
     `canUncomplete` stays `canManage` (Bryce: parents only in the sheet).
   - `page.tsx` passes `isTablet = tabletMayCompleteAnyTask(user.role)`
     through `CalendarViews` to `CalendarSheets` and `ScheduleView`.
   - `CalendarViews`: `useUndoBar()` once, passes `showBar`/`closeBar` to
     `useEventMoves`, keeps the one `<UndoBar>` mount, gives
     `CalendarSheets` and `ScheduleView` an `onTaskCompleted(taskId, refresh)`.
   - Mounts: `CalendarSheets` closes the sheet, `router.refresh()`, shows
     the bar (refresh = router.refresh). `ScheduleView` closes the sheet,
     refreshes the task's day chunk and `router.refresh()`, shows the bar
     with that same refresh.
   - `docs/structure/calendar.md`: a short "Task completed, Undo" entry
     (who owns the bar, the rule file, both mounts).
4. **Verification:** gauntlet as above; `CalendarViews.tsx` and
   `ScheduleView.tsx` line counts before/after (stay under the 650 hard cap;
   report growth).
5. **Evidence:** diff stat, line counts, a grep showing `uncompleteTask`
   is called from exactly `src/components/TaskDetailSheet.tsx` and new `src/lib/useUndoBar.ts`, and
   `UndoBar` still mounted once.
6. **Done:** both mounts show the bar after complete; Undo un-completes
   and refreshes; the move bar unchanged; the Tablet sees Mark complete.
- **C2 status:** DONE (Stark: tsc 0, lint 0, npm test 2048 pass, UTC 2038 + 10 skips, build 0; CalendarViews 494 to 505, ScheduleView 564 to 583, useEventMoves 310 to 301, useUndoBar new 56; not exercised in a browser).

## Gates

### Pass 1 (2026-11-11, HEAD 24c6703)

- **Vision: PASS.** Gauntlet re-run green (tsc 0, lint 0, 2048 pass, UTC
  2038 + 10 skips, build 0); boundaries clean. Notes: `useUndoBar.ts`
  Undo has no `.catch` (a network failure is silent); `tabletRules.ts`
  comment still says un-complete is parent-only; by design a person on
  the task (or the Tablet) can undo someone else's tick within 60 s
  (answer 3); the crossed-out look waits for the refresh.
- **Captain: BLOCKED.** BLOCKER: `src/lib/useUndoBar.ts` imports the
  `uncompleteTask` Server Action from `app/` (STRUCTURE.md Layout map,
  `src/lib/` "What never lives here"; `useEventMoves.ts` takes its actions
  as closures). Notes: `assertCanCompleteTask` repeats the `NOT_ON_TASK`
  string; the Tablet's undo reuses `tabletMayCompleteAnyTask` (flag for
  Tablet PR B: one switch flips both); `mayCompleteTask` lives in an
  undo-named file (rename to `taskRules.ts` if a third rule arrives); the
  STRUCTURE.md Calendar trend list is stale (amendment wording given);
  `docs/structure/calendar.md` is now 249 lines.
- **Strange: BLOCKED.** BLOCKER: the list contradicts the bar for a
  server round trip. After Mark complete the bar says "Task completed"
  while the task is still drawn unchecked until the refresh lands; after
  Undo the bar closes and the task stays crossed out for two round trips
  (DESIGN.md "Instant feedback": a reversible state flip must be
  optimistic). Notes: bar placement passes everywhere (16px clear of the
  +, above the safe area, never over the pinned sidebar; Undo 64x48 on
  the phone, 96x72 on the Tablet at Largest); kid and Tablet logins have
  no + so the bar keeps an empty right gap (fine); the warn refusal
  matches the mock; who sees which button matches the mock. Harness and
  shots: this session's scratchpad `strange/`.

### Pass 2 (2026-11-11, HEAD c89caf1)

- **Captain: PASS.** Pass 1 blocker fixed (`useUndoBar.ts` imports only
  react; the action is handed in). Notes: the trend list carries the
  after-F1 counts (CalendarViews 534, ScheduleView 591 after F2);
  `docs/structure/calendar.md` 258 lines, a split candidate past ~300;
  `ScheduleView.tsx` should move something out before its next feature.
- **Strange: PASS.** At a 1200 ms lag: crossed out the moment the sheet
  closes (all-day row and Schedule), un-crossed 60 ms after Undo, refusal
  and thrown error put the tick back with the right warn bar, a parent's
  Mark not complete after a tick ends un-crossed; placement unchanged.
  Notes: the "Task completed" bar outlives a parent's Mark not complete
  inside its 5 s; Mark complete still waits for its action ("Saving...")
  before the sheet closes; Schedule opening away from today in the harness
  (check on the phone). Shots: scratchpad `strange/shots2/`.
- **Vision: BLOCKED.** Gauntlet green, boundaries clean. BLOCKER: an
  override is dropped only when a new `tasks` prop agrees, so (1) after a
  failed Undo `putBack` re-sets "done" with no prop change, and a later
  un-complete from another device stays hidden on that screen (worst on
  the always-on Tablet); (2) a task ticked in Schedule outside the page's
  ±61 day window never appears in `serverTasks`, so its override lives
  forever and hides later changes. Note: a late refusal can replace a
  newer task bar.

### Pass 3 (2026-11-11, HEAD 792a3ba)

- **Vision: BLOCKED (budget used).** Gauntlet green with exit codes
  captured directly (build 0); boundaries clean; pass 2 scenarios 1 and 2
  ended. BLOCKER (a regression F3 introduced): ScheduleView's prune
  effect runs on every render, because `useToday()` returns a new Date
  each render and so `months` and `loadedTasks` change identity. Tick in
  Schedule, then Undo before the tick's refresh lands: the effect prunes
  the new `null` override against the stale not-done rows ("agree"),
  drops it, and the tick's refresh then redraws the task crossed out for
  1 to 2 s until the Undo's refresh lands. Mirror case on a quick
  re-tick. Reproduced with the real pure functions (scratchpad `sim.ts`).
  Fix offered: prune only when the rows' task states change (a content
  key of id and done, plus a `pruneTaskDoneByState` helper with a test).
  Notes: an override can still outlive a lost refetch or a sub-second
  race with another device (needs a failed fetch; a generation counter
  later); `taskBarFor` is not reset when the bar closes itself (cosmetic).
- **Strange pass 3:** running at the time of the stop.

## Fix contracts

### F1 - optimistic task ticks, the action handed in, the notes folded in

1. **Objective:** the list flips at once on Mark complete and on Undo
   (reverting on refusal or failure), `useUndoBar.ts` no longer imports
   from `app/`, and the cheap gate notes are folded in.
2. **Boundaries:**
   - May touch: `src/lib/useUndoBar.ts`, new `src/lib/taskDoneOverrides.ts`,
     new `src/lib/taskDoneOverrides.test.ts`, `src/components/CalendarViews.tsx`,
     `src/components/ScheduleView.tsx`, `src/app/actions/tasks.ts` (the
     `NOT_ON_TASK` import only), `src/lib/tabletRules.ts` (its doc comment
     only), `docs/structure/calendar.md`, `STRUCTURE.md` (the Calendar
     trend list under "Soft cap: 350 lines" only).
   - Must not touch: `DESIGN.md`, `src/components/UndoBar.tsx`,
     `src/components/TaskDetailSheet.tsx`, `src/components/CalendarSheets.tsx`,
     `src/lib/taskUndoRules.ts`, `TimelineGrid.tsx`, `prisma/`, `package.json`.
3. **Work:**
   - Optimistic layer: a pure module `src/lib/taskDoneOverrides.ts` (new)
     with `applyTaskDone(tasks, overrides)` (returns tasks with each
     overridden `completedAt` swapped in; same array when no override
     touches it) and `pruneTaskDone(overrides, serverTasks)` (drops an
     override once the server's task agrees on done/not done; keeps it
     otherwise), plus tests. `CalendarViews` holds one
     `Map<taskId, Date | null>` in state, prunes it when the `tasks` prop
     changes, and hands `applyTaskDone(tasks, overrides)` to every view
     it renders; `ScheduleView` gets the map (or an apply function) and
     applies it to its own windowed `row.tasks` too.
   - `onTaskCompleted` sets the task done in the map before refreshing.
   - `showTaskCompleted` takes the action and the setter as arguments
     (an options object is fine): `uncomplete: (id) => Promise<{ error?: string }>`
     and `setDone(id, completedAt | null)`. Undo: `closeBar()`, set not
     done at once, call `uncomplete`; on success refresh; on refusal put
     back the completed time and show the warn bar with the server's
     message; on a thrown error (network) put it back and show the warn
     bar "Couldn't undo. Try again." (Fury: the app's own "Couldn't ...
     Try again." pattern; reported to Bryce). `CalendarViews` imports
     `uncompleteTask` and passes it in; delete the import from
     `useUndoBar.ts` and fix its comments.
   - `tasks.ts`: `assertCanCompleteTask` returns the imported `NOT_ON_TASK`.
   - `tabletRules.ts`: the comment now says the Tablet may also undo a
     completion within `TASK_UNDO_WINDOW_MS` (`taskUndoRules.ts`).
   - `docs/structure/calendar.md`: "Only `TaskDetailSheet.tsx` and
     `CalendarViews.tsx` import `uncompleteTask`; `CalendarViews` hands it
     to `showTaskCompleted`, so `useUndoBar.ts` never imports from `app/`",
     and one line on the overrides map.
   - `STRUCTURE.md` trend list: update the `ScheduleView.tsx`,
     `CalendarViews.tsx` and `useEventMoves.ts` entries and add
     `TaskDetailSheet.tsx` and `actions/tasks.ts` entries with the real
     after-F1 counts (Captain's wording in the Gates section is the model).
     (Preflight flags STRUCTURE.md at 1136 lines against the 650 code cap;
     Fury: the constitution has its own housekeeping threshold, 1264 per
     Captain, so the trend-list edit stands.)
4. **Verification:** gauntlet as above; `grep -rn "@/app" src/lib` shows
   no import (comments aside); line counts of every touched file
   before/after (CalendarViews and ScheduleView stay under 650).
5. **Evidence:** test names and the new total, the grep, line counts,
   `git show --stat HEAD`.
6. **Done:** in Strange's harness the task is crossed out the moment the
   sheet closes and un-crossed the moment Undo is tapped; a refusal puts
   the tick back with the warn bar.

- **F1 status:** DONE (Stark: +8 tests, npm test 2056 pass, UTC 2046 + 10 skips, tsc/lint/build 0; no `@/app` import in `src/lib`; CalendarViews 523, ScheduleView 586, useUndoBar 75). Stark flagged a stale-override edge, fixed by F2.

### F2 - clear a task's override on any other change

1. **Objective:** a task's optimistic override never outlives a change made
   another way (the sheet's "Mark not complete", Edit, Delete).
2. **Boundaries:**
   - May touch: `src/components/CalendarViews.tsx`,
     `src/components/CalendarSheets.tsx`, `src/components/ScheduleView.tsx`,
     `docs/structure/calendar.md` (the "Ticks are optimistic" bullet only).
   - Must not touch: `src/components/TaskDetailSheet.tsx`, `src/lib/useUndoBar.ts`,
     `src/lib/taskDoneOverrides.ts`, `DESIGN.md`, `STRUCTURE.md`, `prisma/`.
3. **Work:** `CalendarViews` exposes `clearTaskDone(taskId)` (deletes the
   key; returns the same map when absent). Both sheet mounts call it in
   `onChanged` and `onDeleted` before refreshing, so the server's answer
   shows. Scenario to prove by reading: parent ticks (override done), then
   reopens and taps Mark not complete: the override is cleared, the
   refresh shows not done.
4. **Verification:** gauntlet as above; line counts before/after.
5. **Evidence:** diff, gauntlet output, `git show --stat HEAD`.
6. **Done:** every non-complete change path from both mounts clears the
   override for that task.

- **F2 status:** DONE (Stark: `clearTaskDone` in CalendarViews, called by both mounts' onChanged/onDeleted; gauntlet green, 2056 pass; CalendarViews 534, ScheduleView 591, CalendarSheets 130).

### F3 - overrides never outlive the server's answer

1. **Objective:** no task override survives once the server has answered,
   on any screen, including Schedule outside the page window.
2. **Boundaries:**
   - May touch: `src/lib/useUndoBar.ts`, `src/lib/taskDoneOverrides.ts`,
     `src/lib/taskDoneOverrides.test.ts`, `src/components/CalendarViews.tsx`,
     `src/components/ScheduleView.tsx`, `src/components/CalendarSheets.tsx`,
     `docs/structure/calendar.md` (the "Ticks are optimistic" bullet),
     `STRUCTURE.md` (the Calendar trend list counts only).
   - Must not touch: `DESIGN.md`, `src/components/UndoBar.tsx`,
     `src/components/TaskDetailSheet.tsx`, `src/lib/taskUndoRules.ts`,
     `src/app/actions/tasks.ts`, `prisma/`, `package.json`.
3. **Work (Vision's fix, pass 2):**
   - (a) In `showTaskCompleted`, the refusal and thrown-error paths drop
     the override (a handed-in `clearDone(taskId)`, which CalendarViews
     already has as `clearTaskDone`) and call `refresh()`, instead of
     putting `completedAt` back. The warn bars stay as they are.
   - (b) CalendarViews exposes `pruneTaskDoneWith(list)`
     (`setTaskDone(prev => pruneTaskDone(prev, list))`, same map when
     nothing drops); ScheduleView calls it from an effect whenever its
     loaded rows' tasks change (flattened `row.tasks`), so an override
     for a task outside the page window drops once Schedule's fetch
     agrees. No render loop: the effect depends on the rows, and prune
     returns the same map when nothing drops.
   - (c) Strange's note: when a task's override is cleared by the sheet's
     onChanged/onDeleted, close the bar if it is that task's
     "Task completed" bar (remember which task the current task bar is
     for; never close a move's bar).
   - Tests: the agree-then-later-disagree case for the module, if (a)
     or (b) changes it.
   - `docs/structure/calendar.md` bullet and the STRUCTURE.md trend-list
     counts (`CalendarViews.tsx`, `ScheduleView.tsx`, and any other entry
     this touches) updated to the real after-F3 `wc -l`.
4. **Verification:** gauntlet as above; line counts before/after
   (ScheduleView stays under 650).
5. **Evidence:** diff, gauntlet output, line counts, `git show --stat HEAD`;
   for each of Vision's two failure scenarios, the line(s) that now end it.
6. **Done:** Vision's scenarios 1 and 2 cannot leave a stale tick; the
   pass 2 PASS behaviours (Strange) are unchanged.

- **F3 status:** DONE (Stark: Undo's refusal/error path drops the override and refreshes; Schedule prunes against its own rows; the task bar closes when that task's override is cleared; gauntlet 2056 pass; CalendarViews 551, ScheduleView 599).

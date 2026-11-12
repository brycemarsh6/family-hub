# Mission 74: Calendar full screen PR 8, Task completed, Undo

- **Status:** AT-THE-GATES (C1, C2 DONE) (Bryce OK'd the mock and all three recommendations 2026-11-11: "Yes")
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

(pass 1 dispatched 2026-11-11)

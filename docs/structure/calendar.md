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
  row, not a time change) and the pull (`calendarEventPull.ts`, which
  writes Google's times into Marshee, the other direction). PR 5's
  "All of them" brings its own rule.
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

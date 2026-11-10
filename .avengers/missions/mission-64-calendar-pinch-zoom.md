# Mission: Calendar pinch to zoom (hour timeline)

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
**Started:** 2026-11-10 · **Updated:** 2026-11-10

## Brief

- **Goal:** on the Calendar's hour timeline (Day, 3 Day, Week), pinching two
  fingers apart makes hours taller (zoom in), pinching together makes them
  shorter (zoom out), like Google Calendar. The hour under the fingers stays
  under the fingers while pinching. The zoom is remembered per person and
  per device.
- **Done means:**
  1. One live hour height drives the timeline (gridlines, hour labels, event
     blocks, now-line, scroll-to-now) instead of the fixed 48px.
  2. A two-finger pinch on the hour rail changes it between **32px and
     128px per hour** (default stays 48px). The minute under the pinch
     midpoint stays at the same screen position while pinching.
  3. A pinch never turns the page (swipe-to-change-days does not fire
     during or after a two-finger gesture), and iPhone's whole-page zoom
     does not happen on the hour rail.
  4. The chosen hour height is saved in localStorage under a key that
     includes the signed-in person's id, read with `useSyncExternalStore`,
     shared by Day, 3 Day and Week. Reloading keeps it.
  5. Event blocks: the time line shows when the block is 40px or taller, or
     when the event is really under 30 minutes AND the block is at least
     24px tall (today's behaviour at 48px/hour). Shorter than that: title
     only.
  6. Pure logic (clamp, anchor math, storage parse, the time-line rule) has
     unit tests; gauntlet green.
- **Out of scope:** Month, Year, Schedule views; a zoom button or slider;
  zoom on the dashboard Calendar widget; drag to reschedule (CD1, PR #26);
  making hour height follow Text size; wrapping long titles onto two lines.

## Bryce's decisions (2026-11-10, in chat)

- **Range:** copy Google. Measured from Bryce's Google Calendar screenshots
  (iPhone, dark mode): about 32pt per hour zoomed out, about 128pt per hour
  zoomed in. In Marshee on his phone that is about 14 hours to about 3.5
  hours on screen. The iPad shows more hours at the same zoom.
- **Remember:** yes, per person and per device.
- **Views:** Day, 3 Day and Week share one zoom.
- **Short events:** like Google. Title only when there is room for one line;
  time when there is room for two. Fixes the 15-minute override that would
  otherwise cut the time line in half when zoomed out.

### Second round (2026-11-10, after the gates)

- **Fury's conversion error, corrected.** Fury told Bryce 32/128px meant
  about 14 / 3.5 hours on his phone, trusting the old "9.2 hours at 48"
  comment. Strange measured the iPhone Day rail at 681px: 48px shows about
  14.2 hours, 32px about 21, 128px about 5.3 (which does match Google).
- **Range: 32 to 192px per hour** (Bryce). Out like Google (about 21 hours
  on the phone), in to about 3.5 hours so 2 PM to 6 PM fills the screen.
- **Whole-day floor** (Bryce): never zoom out past the whole day filling
  the visible rail (iPad portrait otherwise left about 180px blank under
  11 PM). Phones unaffected.
- **Short blocks get a smaller title** (Bryce accepted Strange's fix) so a
  30-minute title is not cut at 32px.
- **Time line and location stay as built** (Bryce: "keep it, try it as
  is, focus on the zoom"). The pre-existing half-cut time line on
  15-minute events at 48px is left alone.
- **DESIGN.md and STRUCTURE.md updated** (Bryce: yes to both).

## Danger register

From AGENTS.md, absolute for every agent:
- No `npm run db:seed` / `db:reset`, no clean/reset scripts for `User`.
- No schema change in this mission (zoom lives in localStorage).
- Never `git add -A` / `git add .`; stage by path; `git show --stat HEAD`.
- No push to `main`; branch, PR, Gauntlet, merge (Fury only).
- Secrets never in code or chat.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: the timeline looks different at every zoom.
- Captain: two new lib files and edits to files already past the 350 soft cap
  (`TimelineGrid.tsx` 514, `CalendarViews.tsx` 503).
- Banner: out. Fury read the timeline, swipe hook and page inline.

## Facts Fury gathered (file:line at HEAD 6ba78ca)

- `src/components/TimelineGrid.tsx:110-111` `HOUR_HEIGHT_PX = 48`,
  `PX_PER_MINUTE`; `:325` sets `--hour-height`; `:273-274` scroll-to-now uses
  `PX_PER_MINUTE`, keyed on `columnDaysKey` only (must stay that way: a zoom
  change must not jump back to now); `:481`, `:489` rail height and labels
  via the CSS variable; `:505` passes `pxPerMinute` to each column.
- `src/components/TimelineDayColumn.tsx` places blocks in px from
  `pxPerMinute` (`top`, `drawnHeightPx`), so zoom re-renders it. The time
  line rule is at the `heightPx >= 40 || trueDurationMinutes <
  MIN_BLOCK_MINUTES` condition. Its 44px comment names `HOUR_HEIGHT_PX (48)`.
- `src/components/CalendarViews.tsx:147` `usePageSwipe({ onSwipeLeft,
  onSwipeRight })`, spread on a `touch-pan-y` wrapper around TimelineGrid
  (`:343`). `touch-pan-y` already tells the browser not to pinch-zoom there.
- `src/lib/usePageSwipe.ts:213` `handlePointerDown` restarts the gesture on
  **every** pointerdown, including a second finger's. A two-finger pinch
  would therefore reset and may still lock into "swiping". Mission-19's
  note: the swallow-clear sits after early returns; keep it reachable for a
  new first finger.
- `src/app/(app)/calendar/page.tsx` has `user` (`user.userId`); CalendarViews
  is not given the viewer's id today.
- Per-device precedent: `src/lib/lastCalendarView.ts` (localStorage +
  `useSyncExternalStore` + a same-tab signal).

## Contracts

### C1 - Live, pinchable, remembered hour height on the timeline

- **Status:** DONE (commit 58f5c5e)
- **Objective:** replace the fixed 48px hour with a live hour height that a
  two-finger pinch changes (32 to 128px, anchored at the pinch midpoint),
  saved per person per device, without breaking swipe-to-page.
- **Boundaries:**
  - May touch: new `src/lib/timelineZoom.ts` (pure: constants
    `MIN_HOUR_HEIGHT_PX = 32`, `MAX_HOUR_HEIGHT_PX = 128`,
    `DEFAULT_HOUR_HEIGHT_PX = 48`; clamp; parse a stored string to a valid
    height or the default; storage key from a person id; the anchor math
    that, given anchor minute, new px per minute, rail offset and the
    midpoint's Y in the scroller, returns the new scrollTop; and
    `showsTimeLine(heightPx, trueDurationMinutes)`), new `src/lib/timelineZoom.test.ts`,
    new `src/lib/useTimelineZoom.ts` (client hook: the stored value via
    `useSyncExternalStore` with a same-tab signal like
    `lastCalendarView.ts`, the native touch listeners, the anchoring).
  - May touch (edit): `src/components/TimelineGrid.tsx`,
    `src/components/TimelineDayColumn.tsx`, `src/components/CalendarViews.tsx`
    (thread one `viewerId: string | null` prop only),
    `src/app/(app)/calendar/page.tsx` (pass `user?.userId ?? null` only),
    `src/lib/usePageSwipe.ts`, `src/lib/usePageSwipe.test.ts`,
    `src/components/TimelineAllDayStrip.tsx` (stale comment only, if it
    names the old constant as a live value).
  - Must not touch: `prisma/`, `src/lib/timelineLayout.ts`,
    `src/lib/lastCalendarView.ts`, `src/lib/useCalendarNavigation.ts`,
    every other component, `package.json`, `CLAUDE.md`, `DESIGN.md`,
    `STRUCTURE.md`, `.avengers/`.
- **Rules the build must follow:**
  1. Pinch uses native `touchstart`/`touchmove`/`touchend`/`touchcancel`
     listeners added with `{ passive: false }` on the scroller. With exactly
     two touches: `preventDefault()`, height = clamp(startHeight ×
     currentDistance / startDistance). The anchor minute is the minute under
     the two-finger midpoint when the pinch starts; on each move the
     scroller's `scrollTop` is set so that minute sits under the CURRENT
     midpoint (so moving both fingers also pans, like Google). Also
     `preventDefault` Safari's `gesturestart`/`gesturechange` on the
     scroller so the page itself never zooms.
  2. Rail offset = the hour rail's top inside the scroll content (the sticky
     weekday header plus the all-day strip sit above it). Measure it from
     the DOM, never a constant.
  3. Height updates at most once per animation frame; scrollTop is applied
     after the new height has rendered (layout effect), so the anchor does
     not drift. Save to storage only when the pinch ends.
  4. When the stored height first resolves after hydration (server snapshot
     is the default 48), keep the minute at the top of the visible rail
     where it was; scroll-to-now stays keyed on the column set only and uses
     the live px per minute.
  5. `usePageSwipe`: a pointerdown while another pointer is already down
     makes the current gesture yield for the rest of that gesture (mode
     "scrolling", no page turn, nothing swallowed wrongly), and the new
     finger never restarts the gesture's start point. Track active pointer
     ids; clear them on up/cancel. A fresh first finger after all fingers
     lift still clears the stale swallow flag (mission-19 F1). The decision
     goes in an exported pure function beside `nextGestureMode` so
     `usePageSwipe.test.ts` can test it (node:test only, no DOM runner).
  8. Not reusable here: `src/lib/useScrollAnchor.ts` anchors Schedule's
     page scroller on prepends; the timeline has its own scroller. Do not
     import or edit it.
  6. No `px` text sizes added; Lucide only; keep every existing comment
     accurate (update ones that say the hour is a fixed 48px).
  7. Storage key prefix `marshee:timeline-hour-height:`; a missing or
     garbage value, or no viewer id, means the default and no write.
- **Verification:** the full gauntlet above, all green. New tests in
  `src/lib/timelineZoom.test.ts` and new cases in
  `src/lib/usePageSwipe.test.ts` (second pointer yields; first finger after
  lift resets) run in both `npm test` and the UTC run.
- **Evidence required:** each gauntlet command with its last lines (test
  counts before and after); `wc -l` of every touched file; the diff stat;
  the exact anchor formula with one worked example in numbers; a note on
  whether a browser check was possible (pinch cannot be faked with a mouse,
  so say what was and wasn't exercised).
- **Done criteria:** Vision re-runs the gauntlet green; no file outside the
  boundary changed; at 48px the timeline renders exactly as before
  (gridlines, labels, block positions, time-line rule); `TimelineGrid.tsx`
  stays under the 650 hard cap.
- **Report:** Stark DONE. New `src/lib/timelineZoom.ts` (pure helpers),
  `src/lib/timelineZoom.test.ts` (15 tests), `src/lib/useTimelineZoom.ts`
  (hook). `usePageSwipe.ts` gained pure `nextActivePointers` and
  `pointerDownAction` (5 tests). Gauntlet green by his run: tests 1778 to
  1798; UTC 1791 pass, 7 skipped (not compared with before); build ok.
  TimelineGrid 526 lines. He ran `npx prisma generate` (no database) for a
  stale local client. Out-of-range stored values are clamped, not reset.
  No browser exercise of the pinch (cannot be faked with a mouse).

### C2 - Range 32 to 192, whole-day floor, short-block title fits

- **Status:** DONE (commit below C2 log line)
- **Objective:** apply Bryce's second-round decisions to the zoom: max 192,
  a floor so the day never ends above the bottom of the visible rail, and a
  title that fits whole in short blocks.
- **Boundaries:**
  - May touch: `src/lib/timelineZoom.ts`, `src/lib/timelineZoom.test.ts`,
    `src/lib/useTimelineZoom.ts`, `src/components/TimelineDayColumn.tsx`,
    `src/components/TimelineGrid.tsx`.
  - Must not touch: everything else (including `usePageSwipe.ts`,
    `CalendarViews.tsx`, `DESIGN.md`, `STRUCTURE.md`, `.avengers/`; Fury
    writes the docs).
- **Rules:**
  1. `MAX_HOUR_HEIGHT_PX = 192`. `MIN_HOUR_HEIGHT_PX` stays 32.
  2. New pure `minHourHeightFor(visibleRailPx)` = max(32, visibleRailPx /
     24), with `visibleRailPx` = scroller `clientHeight` minus the sticky
     header's height (measured, never a constant; same measurement the
     scroll-to-now effect uses). The pinch clamps to [that floor, 192]. The
     rendered height is also clamped to that floor, so a stored 32 on an
     iPad draws the whole day, without overwriting the stored value (the
     same person on a phone keeps 32). Re-evaluate on resize. Keep the
     anchor rules from C1 (a floor change that alters the height keeps the
     minute at the top of the visible rail).
  3. New pure `titleFitsFullSize(heightPx)` = heightPx >= 20 (the undrawn
     height). Below it, the title span uses `text-[0.625rem]
     leading-[0.75rem]` in every column width, so a 12px line fits the 12px
     content box with descenders inside. At 20 and up, nothing changes from
     C1. Do not change `showsTimeLine` or the location line.
  4. Fix the stale `PX_PER_MINUTE` comment at `TimelineGrid.tsx:80`, and any
     comment or test that still says 128 is the maximum.
  5. Tests: `minHourHeightFor` (phone rail 681 gives 32; iPad rail 960
     gives 40; 0 gives 32), `titleFitsFullSize` at 19.9 and 20, and the
     clamp at 192.
- **Verification:** the full gauntlet, green.
- **Evidence required:** each gauntlet command's last lines with test
  counts; `wc -l` of touched files; `git diff --stat`.
- **Done criteria:** Vision and Strange re-gate PASS; at 48px on a phone
  the timeline is unchanged from C1.
- **Report:** Stark DONE. MAX 192; pure `minHourHeightFor`,
  `titleFitsFullSize`; clamp and pinch take a floor. The hook takes
  `stickyHeaderRef`, measures the floor on mount, on resize and at pinch
  start; drawn height = max(stored or live, floor); a pinch that ends where
  it began saves nothing (so an iPad tap never overwrites a phone's 32).
  Gauntlet green by his run: 1801 tests; UTC 1794 + 7 skips; build ok.
  Note: the floor is first measured in a passive effect after mount, and a
  later all-day strip growth is only picked up at resize or pinch start.

### C3 - Floor follows the header; flush on an unchanged pinch end

- **Status:** DISPATCHED
- **Objective:** keep the whole-day floor true whenever the sticky header or
  the scroller changes size, and stop the small jump when a pinch ends where
  it began.
- **Boundaries:**
  - May touch: `src/lib/useTimelineZoom.ts`.
  - Must not touch: everything else (Fury edits `DESIGN.md`,
    `STRUCTURE.md` and the mission file).
- **Rules:**
  1. Replace the window `resize` listener with one `ResizeObserver` that
     observes both the scroller and `stickyHeaderRef.current` and calls
     `measureFloor`; disconnect it in the cleanup.
  2. Measure the floor first in a layout effect, not a passive one, so the
     first paint never draws below the floor.
  3. In `end()`'s unchanged-height branch, render the final height with
     `flushSync` while the anchor is still set, then clear the anchor (the
     same order as the saving branch). Still save nothing.
  4. No change to stored-value handling: a stored 32 on an iPad stays 32.
- **Verification:** the full gauntlet, green.
- **Evidence required:** gauntlet last lines with counts; `wc -l`;
  `git diff --stat`.
- **Done criteria:** Vision and Strange pass 3 PASS (the last pass in the
  budget). Strange re-measures iPad portrait Day Nov 10, Week Nov 8 to 14 and
  Week Nov 15 to 21: 0px blank band in each, stored value still 32.
- **Report:** pending.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | PASS | none | Stale `PX_PER_MINUTE` comment (TimelineGrid:80); usePageSwipe 337, near soft cap, extraction owed; SwipeActions lacks the second-finger yield; CalendarViews 507 vs 502 trend line; fifth hand-rolled localStorage store. Amendments A-64-1 (adopted) and A-64-2 (optional, not adopted) |
| 1 | Vision | PASS | none | Gauntlet green at a68101d (1798; UTC 1791 + 7 skips, which also exist at base 6ba78ca); boundary exact. Notes: the hydration rescale branch is effectively unreachable (TimelineGrid mounts after hydration); scroll-then-second-finger case unproven; one finger left after a pinch may not scroll until both lift; pinch-on-event click unproven; two-finger tap saves an unchanged height |
| 2 | Vision | BLOCK | Floor measured only at mount, on resize and at pinch start; strip shrink leaves a blank band (C3) | Possible one-frame flash at 32 on iPad (C3 rule 2); unchanged-pinch end can jump (C3 rule 3); DESIGN.md "never drawn cut" and "12px line" are Normal text size only; STRUCTURE.md "only way markup sees it" too strict (both fixed by Fury) |
| 2 | Strange | BLOCK | (1) same stale floor: 28px band on iPad portrait Day and stripless weeks; (2) "a title is never drawn cut" false at Largest (fixed by scoping the DESIGN.md sentence, option (a)) | Pass 1 blocker fixed (descenders inside at 32); 192 on iPhone shows 3.55 hours; 48 unchanged; synthetic pinch to 192 held the midpoint minute at 675.00 |
| 1 | Strange | BLOCK | 30-min titles cut at 32 to 39px/hour on columns 128px+ (title gets 12 of 16px; descenders chopped) | Range gives 21/14/5.3 hours on phone, not 14/3.5 (Fury's error); 15-min time line half-cut at 48 (pre-existing); Largest text at 32 unreadable on short blocks; iPad dead band at 32; DESIGN.md exception assumes fixed 48; at 128 a 15-min event still draws 30 min tall. Synthetic pinch: anchor held within 0.5 minute; two fingers never paged |

## Phone test for Bryce (after merge)

1. iPhone, Calendar, Day view. Pinch apart on 2 PM: 2 PM stays under your
   fingers and at the most about 3.5 hours fill the screen (2 PM to 6 PM).
2. Pinch together: about 21 hours on screen at the most. Short events show
   a whole one-line title, no letters cut.
3. Pinch, then lift: the day did not change (no swipe to the next day).
   One-finger left/right swipe still changes days.
4. Switch to 3 Day and Week: same zoom. Leave Calendar and come back: same
   zoom. The page itself never zooms.
5. Same on the iPad. Zoomed all the way out, the day fills the screen with
   no blank band under 11 PM.
6. Start scrolling with one finger, then add a second: the day does not
   change.
7. Pinch with your fingers starting on an event, lift: the event does not
   open.
8. Lift one finger mid-pinch and drag the other: say whether it scrolls
   (it may wait until both lift; that is expected).

## Handoff log

- 2026-11-10: Bryce decided range (copy Google, 32 to 128px), remember per
  person and device, Day/3 Day/Week shared, short-event rule. C1 written.
- 2026-11-10: C1 built and committed. Vision, Strange, Captain dispatched in
  parallel (all read-only) against the commit after this log line.
- 2026-11-10: Captain PASS, Vision PASS, Strange BLOCK (cut titles at 32).
  Fury's hours conversion was wrong; Bryce re-decided (second round). C2
  written and dispatched; Fury writes the DESIGN.md and STRUCTURE.md edits.
- 2026-11-10: C2 built; committed with the DESIGN.md and STRUCTURE.md
  amendments. Vision and Strange pass 2 dispatched.
- 2026-11-10: Pass 2: Vision BLOCK and Strange BLOCK on the same stale
  floor. Fury scoped the DESIGN.md title sentence to Normal text size and
  loosened the STRUCTURE.md markup clause. C3 dispatched. Pass 3 is the
  last in the budget.

## Delivery

- **Shipped:** pending.
- **Shipped check:** pending.
- **Deliberate leftovers:** pending.

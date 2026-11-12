# Mission 73: Calendar full screen PR 7, the all-day row like Google and text that zooms

- **Status:** AT-THE-GATES (Bryce OK'd the mock and all seven recommendations 2026-11-11: "Yes")
- **Started:** 2026-11-11 · **Updated:** 2026-11-11
- **Plan:** `.avengers/plans/calendar-fullscreen-v1.md`, "PR 7: The all-day row like Google, and text that zooms (decisions 9, 13; answer 4)"
- **Branch:** `claude/calendar-fullscreen-pr7-ba468d`, cut from `origin/main` `c466dc7` (PR 6 merged as #114)
- **Mock:** `.avengers/mocks/calendar-pr7-allday-mock.html`

## Brief

- **Goal:** the timeline's all-day row (Day, 3 Day, Week) shows two lanes,
  then "+N" under each busy column (3 Day, Week) or "N more" (Day); tapping
  the count or a chevron in the left corner opens every lane, an up chevron
  closes. Pinching makes block titles and all-day pills grow with the zoom
  (1x at 48px an hour and below, up to a tested ceiling at 192px), on top
  of Text size. Long titles wrap to as many whole lines as the block holds.
  Folded in: the iPad Largest hour labels that wrap ("10 AM" on two lines),
  and the iPad Largest 15-minute block where title and time overlap.
- **Done means:** the above on a 393 by 852 phone and iPad 1024 by 768 and
  768 by 1024 at Normal and Largest, light and dark; the mission 65 pinch
  anchor holds with an open, tall all-day row; nothing cut mid-letter at
  any zoom or text size; Month untouched; a pure `zoomTextScale` with edge
  tests; the gauntlet passes; merged, deploy checked, phone test in
  `.avengers/status.md`, a hand-over for PR 8 in Delivery.
- **Out of scope:** Month's lanes and wording (`MonthCell`), task undo
  (PR 8), search (PR 9), the gesture machine, the mission 65 first-frame
  flicker (unless it falls out of the zoom work for free).

## Danger register

From AGENTS.md, absolute: no `db:seed`/`db:reset`; never a clean script for
`User`; migrations additive only (none expected); secrets never in git or
chat; never `git add -A`/`.`; direct pushes to `main` blocked; merging
deploys to the family. No database writes in this PR.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts src/lib/google/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: all of it is visible; the plan's checks are his (anchor with a
  tall row, nothing cut mid-letter).
- Captain: **in** (Fury, after C2: four new files, `timelineAllDay.ts`,
  `TimelineAllDayBar.tsx`, `AllDayToggle.tsx`, `useRootFontPx.ts`, and
  `TimelineGrid.tsx` sits at exactly 400 lines). Original note: out unless the diff passes ~300 lines or a new file appears
  beyond a vocabulary module; `TimelineAllDayStrip.tsx` is at 424 lines
  (soft cap), so the contracts extract before they add. Vision carries the
  size check.
- Banner: done (brief below).

## Banner's brief (2026-11-11, summary)

- Strip: `src/components/TimelineAllDayStrip.tsx` 424 lines; collapsed uses
  `assignLanes` default 3 lanes (`monthLayout.ts` `PHONE_LANES`); expand is
  a per-column "+N more" button using `@container` widths; collapse is a
  "− Show less" row; no chevron, no `aria-expanded`; rows `24px` px.
- Pills `text-[0.5625rem]`, `h-6`, `truncate`. Block titles
  (`TimelineDayColumn.tsx` 276) single line `truncate`; small title under
  20px via `titleFitsFullSize` in `timelineZoom.ts` (103 lines, no
  `zoomTextScale` yet). `--hour-height` set at `TimelineGrid.tsx` (375).
- Hour labels: `TimelinePage.tsx` `TimelineHourLabels`, `GUTTER_WIDTH_PX =
  48`, `text-[0.625rem]`, no `whitespace-nowrap`.
- No "more" vocabulary module; `calendarViewVocabulary.ts` holds view names.

## Fury's recommendations put to Bryce (in the mock)

1. Two lanes on every width; Month untouched.
2. "+2" in 3 Day and Week, "2 more" in Day; one tap opens all columns.
3. The chevron shows only when something is hidden, or while open.
4. It closes again on a page turn (as today).
5. Zoom text ceiling 1.5x at 192px, linear from 48px.
6. Titles wrap to whole lines then "..."; the time line only when it fits
   (also fixes the Largest 15-minute overlap).
7. Hour labels never wrap and stop growing at 12px.

## Contracts

Sequential: C1, then C2, then C3 (C2 and C3 both touch `TimelineGrid.tsx`).
Shared rules for all three: sizes in rem, never px text, except the
recorded px exceptions (mission 58; the 128px container query; the
`min(...,12px)` caps); touch only, nothing needs hover; Lucide icons only;
reduce motion means no animation; never `git add -A`/`.`; one commit per
contract; `git show --stat HEAD` after. No database. Gauntlet as above
(the build may fail in a worktree for env reasons: say so, do not hide it).

### C1 - the pure rules (lib only, with tests)

- **Status:** DONE 6ed6e2d (6 lib files, 13 new tests, 2029 pass in Denver and UTC; no component touched)

1. **Objective:** add the pure functions and constants PR 7 needs, each
   tested, with no component change.
2. **Boundaries:** May touch: `src/lib/timelineZoom.ts`,
   `src/lib/timelineZoom.test.ts`, `src/lib/calendarViewVocabulary.ts`,
   `src/lib/calendarViewVocabulary.test.ts`, new `src/lib/timelineAllDay.ts`,
   new `src/lib/timelineAllDay.test.ts`. Must not touch: any file in
   `src/components/`, `src/lib/monthLayout.ts` (Month keeps its caps),
   `package.json`.
   - `timelineZoom.ts`: `ZOOM_TEXT_SCALE_MAX = 1.5`; `zoomTextScale(hourHeightPx)`
     returns 1 at or below `DEFAULT_HOUR_HEIGHT_PX` (48), rises linearly to
     `ZOOM_TEXT_SCALE_MAX` at `MAX_HOUR_HEIGHT_PX` (192), clamps above, and
     returns 1 for NaN or non-finite input. `titleLineCount({ availablePx,
     lineHeightPx })`: whole lines that fit, never below 1, 1 for a zero or
     non-finite line height. `timeLineFits({ heightPx, titleLinePx,
     timeLinePx, paddingPx })`: true only when one title line plus one time
     line plus padding fit in the block's height (the real-pixel rule that
     replaces the Normal-text px guess behind the Largest 15-minute overlap;
     C3 decides how it combines with `showsTimeLine`).
   - new `timelineAllDay.ts` (pure, no React, no `server-only`; same standing
     as calendarDates.ts): `TIMELINE_ALL_DAY_LANES = 2`;
     `timelineAllDayItems(allDayRow, tasks, habitDays)` returning the
     `MonthLayoutEvent[]` the strip builds today (moved, not rewritten, from
     `TimelineAllDayStrip.tsx` lines ~60-100; C2 deletes the copy there);
     `allDayHiddenCount(columnDays, items)` returning the total hidden
     beyond `TIMELINE_ALL_DAY_LANES` (via `assignLanes(..., TIMELINE_ALL_DAY_LANES)`).
   - `calendarViewVocabulary.ts`: `allDayMoreLabel(count, inDay)`: "+2"
     for 3 Day and Week, "2 more" for Day (Bryce's decision 13);
     `allDayMoreAriaLabel(count)`: "Show 2 more all-day items" (1 item:
     "Show 1 more all-day item"); `ALL_DAY_EXPAND_LABEL = "Show all all-day
     items"`, `ALL_DAY_COLLAPSE_LABEL = "Show fewer all-day items"`. Month's
     wording is not moved (Month untouched this PR).
3. **Verification:** `npx tsc --noEmit`, `npm run lint`, `npm test`, the
   UTC line, all exit 0; test count rises.
4. **Evidence:** the new test names; each command's tail; line counts of
   the touched files; `zoomTextScale` at 32, 48, 120, 192, 300, NaN.
5. **Done:** the functions exist with edge tests (48 exactly, 192 exactly,
   above 192, below 48, NaN; one line minimum; the singular aria label),
   and no component changed (`git diff --stat` shows only the files above).

### C2 - the all-day row (two lanes, "+2" / "2 more", the chevron)

- **Status:** DONE 7a6209d (strip 424 to 261 lines, bars extracted, chevron in TimelineGrid and Day corner, one expand state; 2030 tests, build ok)

1. **Objective:** the timeline's all-day row shows `TIMELINE_ALL_DAY_LANES`
   lanes, the count under each busy column, and a chevron in the left
   corner that opens and closes every lane; pills grow with the zoom.
2. **Boundaries:** May touch: `src/components/TimelineAllDayStrip.tsx`,
   `src/components/TimelinePage.tsx` (only to pass the expand state and
   toggle into the strip), `src/components/TimelineGrid.tsx` (the state
   owner and the 3 Day/Week fixed corner), `src/components/HabitDayPill.tsx`
   (its size classes only), new `src/components/TimelineAllDayBar.tsx`
   (extract the event and task bar markup out of the strip so it drops
   below its current 424 lines), new `src/components/AllDayToggle.tsx`
   (the chevron button), `src/lib/timelineAllDay.ts` (new in C1, and its test) if
   a helper is missing. Must not touch: `MonthCell.tsx`, `MonthGrid.tsx`,
   `monthLayout.ts`, `TimelineDayColumn.tsx`, `timelineZoom.ts`,
   `useTimelineZoom.ts`, `calendarGesture.ts`, `usePagedSwipe.ts`,
   `CalendarViews.tsx` (494 lines, its limit).
   - **One expand state for the whole visible page**, owned by
     `TimelineGrid` (the same keyed-to-the-column-set reset during render
     the strip uses today: a page turn closes it). The current header page
     gets `expanded` and the toggle; the neighbour pages in `PagedTrack`
     are always collapsed.
   - Collapsed: `assignLanes(..., TIMELINE_ALL_DAY_LANES)`. Expanded: all
     lanes. Under each column with hidden items, a button with
     `allDayMoreLabel` text and `allDayMoreAriaLabel`; it opens. The old
     "− Show less" row and the `@container` digit tiers go.
   - **The chevron** (`AllDayToggle`, Lucide `ChevronDown`, rotated or
     `ChevronUp` when open, `aria-expanded`, the two labels from C1, at
     least 44 by 44 CSS px target): 3 Day and Week, in the fixed gutter
     corner in `TimelineGrid` at the bottom of the sticky header; Day,
     under the date in the strip's corner cell. It renders only when
     `allDayHiddenCount(...) > 0` or while expanded (Bryce's call 3). The
     visibility count comes from `timelineAllDayItems` + the same lanes,
     never a second copy of the item-building code.
   - **Pills scale with zoom:** event, task and habit pills use
     `calc(<today's rem> * var(--zoom-text-scale, 1))` for font size and
     row height (24px row becomes `calc(1.5rem * var(--zoom-text-scale,1))`;
     state in the header comment that this moves the old 24px to rem, so
     Text size now grows the row too). C3 sets the variable; until then
     the fallback 1 keeps today's look.
   - Keep the existing tap behaviour of every pill, `items-start` with a
     corner, and the early return when there is nothing to show (a corner
     alone still renders).
3. **Verification:** gauntlet commands exit 0; a headless harness or the
   dev server is optional (no agent can sign in): if you build a harness,
   put it in your scratchpad, not the repo.
4. **Evidence:** line counts before and after for every touched file
   (the strip must end below 424, `TimelineGrid.tsx` must not pass 400);
   a grep showing `TIMELINE_ALL_DAY_LANES` used and no literal `2` lane cap;
   a grep showing the item-building code exists once; command tails.
5. **Done:** two lanes then "+N"/"N more"; chevron opens and closes all;
   page turn closes; Month files unchanged (`git diff --stat`).

### C3 - zooming text, wrapping titles, hour labels

- **Status:** DONE c78781c (zoom scale set in TimelineGrid, whole-line title clamp, time line gated by timeLineFits, labels nowrap; new useRootFontPx; 2030 tests, build ok)

1. **Objective:** block titles and the all-day row grow with the zoom,
   titles wrap to whole lines, the time line shows only when it truly
   fits, and the hour labels never wrap.
2. **Boundaries:** May touch: `src/components/TimelineGrid.tsx` (set
   `--zoom-text-scale` beside `--hour-height` from `zoomTextScale`),
   `src/components/TimelineDayColumn.tsx`, `src/components/TimelinePage.tsx`
   (`TimelineHourLabels` classes only), `src/lib/timelineZoom.ts` (and test),
   a new `src/lib/useRootFontPx.ts` only if no existing export gives the
   live root font size (`appChrome.ts` reads it inside a private measure;
   browser-only reads use `useSyncExternalStore`, DESIGN.md). Must not
   touch: `TimelineAllDayStrip.tsx`, `TimelineAllDayBar.tsx` (new in C2), `Month*`,
   `monthLayout.ts`, `useTimelineZoom.ts` (unless the anchor breaks; then
   stop and report), `calendarGesture.ts`, `usePagedSwipe.ts`,
   `CalendarViews.tsx`.
   - Titles: font size and line height `calc(<today's rem> *
     var(--zoom-text-scale, 1))` (today's three tiers kept: the under-20px
     small title from mission 65, compact, full). `truncate` becomes a
     line clamp of `titleLineCount(...)` lines computed in real pixels
     from the block's height, the live root font size and the scale, with
     the time line's room reserved when it shows. The repeat icon stays
     inside the title.
   - Time line: shown when today's `showsTimeLine` rule says so AND
     `timeLineFits(...)` in real pixels (fixes the iPad Largest 15-minute
     overlap); compact columns keep their `@min-[128px]` rule. Time and
     location lines scale with the zoom too.
   - Hour labels: `whitespace-nowrap` and `text-[min(0.625rem,12px)]`,
     with a one-line comment naming mission 70's marker precedent. The
     gutter stays 48px.
3. **Verification:** gauntlet exit 0. Optional harness in your scratchpad.
4. **Evidence:** where `--zoom-text-scale` is set (file:line); the line
   clamp code; line counts (TimelineDayColumn must stay under 350,
   TimelineGrid under 400); command tails.
5. **Done:** at 48px an hour and below the page renders as before at
   Normal (same classes, scale 1); zoomed in, titles and pills grow; no
   title is cut mid-line; labels never wrap.

### F1 - Pass 1 fixes (Vision and Strange blockers, chosen notes)

- **Status:** DONE 4211e69 (gauntlet green: tsc 0, lint 0, tests 2032 pass, UTC 2022 pass + 10 skips, build 0)

1. **Objective:** fix the three pass-1 blockers so no title, time or
   location line is cut mid-letter at any zoom or Text size, plus the
   cheap notes.
2. **Boundaries:** May touch: `src/components/TimelineDayColumn.tsx`,
   `src/lib/useRootFontPx.ts`, `src/lib/timelineZoom.ts`,
   `src/lib/timelineZoom.test.ts`, `src/components/AllDayToggle.tsx`,
   and comment-only edits in `src/components/TimelineAllDayStrip.tsx`,
   `src/components/TimelineAllDayBar.tsx`, `src/components/TimelineGrid.tsx`
   (must stay at or under 400 lines), `src/lib/calendarViewVocabulary.ts`.
   Must not touch: Month files, `monthLayout.ts`, `useTimelineZoom.ts`,
   `calendarGesture.ts`, `usePagedSwipe.ts`, `CalendarViews.tsx`,
   `appChrome.ts`, DESIGN.md, STRUCTURE.md, docs (Fury writes those).
   - **B1 (Vision):** the location line shows only when it fits in real
     pixels (title line + time line if shown + location line in the
     content box), like the time line. Lift the check into a pure function
     in `timelineZoom.ts` with tests if that is cleaner.
   - **B2 (Strange):** narrow columns cut words at the right edge
     ("teachei"). Add `break-words hyphens-auto` to the clamped title span
     (the approved mock had `word-break: break-word`).
   - **B3 (Strange):** at iPad Largest a 15 or 30 minute block at 48px an
     hour loses descenders: the full title line (22.5px) does not fit the
     20px content box. Use the small tier from real pixels too:
     `smallTitle = !titleFitsFullSize(heightPx) || TITLE_LINE_REM * rootPx
     * scale > contentPx` (computed after `contentPx`); the line count
     uses the small line height when the small tier is chosen.
   - **N (Vision):** `useRootFontPx` must not call `getComputedStyle` on
     every render: cache the value in the module, refresh it only in the
     subscribe callbacks (mutation, resize) and on first subscribe; export
     the read as `readRootFontPx` (Captain amendment A).
   - **N (Captain):** fix the stale comments Captain named
     (TimelineAllDayStrip.tsx:44-46, TimelineAllDayBar.tsx:6-8,
     TimelineGrid.tsx:33-40, calendarViewVocabulary.ts header) with his
     suggested wording (in the Gate log's Captain entry and his report
     quoted below); add a "change together" comment where
     TimelineDayColumn's class strings mirror `TITLE_LINE_REM`,
     `SMALL_TITLE_LINE_REM`, `TIME_LINE_REM`; restore TimelineGrid's blank
     line after the imports if the 400 cap allows.
   - **N (Strange):** `AllDayToggle` width `w-[min(2.75rem,48px)]` so it
     never spills out of the 48px gutter at Largest (height may stay
     2.75rem).
3. **Verification:** gauntlet, five commands, real exit codes (no pipe to
   tail without `; echo $?` on the command itself).
4. **Evidence:** the diff summary per item; the new tests; line counts;
   for B1 and B3, the numbers from the failing cases worked through the new
   code (iPad Largest root 24: 30 min at 150px/h with a location; 15 min at
   48px/h).
5. **Done:** all items in, gauntlet green, files within caps.

### F2 - Pass 2 fixes (Vision blocker, Strange notes)

- **Status:** DONE 5806d6a (gauntlet green: tsc 0, lint 0, tests 2036 pass, UTC 2026 pass + 10 skips, build 0)

1. **Objective:** the small title tier fits every box at every zoom and
   Text size, decided by one tested pure function; compact titles stop
   losing a line to a hidden time line.
2. **Boundaries:** May touch: `src/components/TimelineDayColumn.tsx`
   (must stay under 350 lines), `src/lib/timelineZoom.ts`,
   `src/lib/timelineZoom.test.ts`. Must not touch: everything F1's
   must-not list names, plus `TimelineGrid.tsx`, DESIGN.md, STRUCTURE.md,
   docs.
   - **B (Vision pass 2):** cap the small tier at mission 65's 12px line:
     class `text-[min(calc(0.625rem*var(--zoom-text-scale,1)),10px)]
     leading-[min(calc(0.75rem*var(--zoom-text-scale,1)),12px)]`, and in
     JS the small line is `Math.min(SMALL_TITLE_LINE_REM * rootPx * scale,
     12)`. Lift the whole tier, line-count, time-line and location
     decision into one pure function in `timelineZoom.ts` (for example
     `blockTextFit({ heightPx, trueDurationMinutes, rootPx, scale,
     compactNarrow, hasLocation, inDay })` returning tier, title lines,
     time shown, location shown); the component only renders its answer.
     Add a grid test: roots 16, 17.6, 21.6, 24; hour heights 32 to 192;
     durations 15 to 120 in 5 minute steps; with and without location;
     each tier; asserting lines x line + time + location <= content box
     and lines >= 1.
   - **N2 (Strange):** in a compact column under 128px the time line is
     hidden by CSS but its room is still reserved. Compute two line counts
     (narrow: no time line, the 0.78125rem compact line; wide: as now) and
     switch with the container query, e.g. CSS variables
     `--clamp-narrow` / `--clamp-wide` with `[-webkit-line-clamp:var(--clamp-narrow)]
     @min-[128px]:[-webkit-line-clamp:var(--clamp-wide)]`. Keep the
     128px px rule (mission 58 exception).
   - **N3 (Strange):** `hyphens-manual` when the title is clamped to one
     line, `hyphens-auto` otherwise (no "Piano les-..." ellipsis).
   - **N (Vision):** fix the CHANGE TOGETHER comment so it names the
     classes as they are now written.
3. **Verification:** the five gauntlet commands, real exit codes.
4. **Evidence:** the new function and test names, the grid size the test
   covers, line counts, command results.
5. **Done:** all four items in; at Normal and 48px an hour the rendered
   classes and line counts match HEAD before F2 except where N2 gains a
   line.

## Gate log

- **Fury's ruling before the gates (C3's flagged conflict):** a true
  15-minute event at Normal text and 48px an hour now shows its title only
  (the time line no longer fits whole in a 20px content box; before, it
  showed clipped mid-line). Kept: Bryce's recommendation 6, "the time line
  shows under the title only when there is room for it", which he approved.
  Strange to confirm on screen.
- Pass 1: Vision, Strange and Captain dispatched in parallel at `69dddbc`.
- **Captain pass 1: PASS**, no blockers. NOTEs (to fold into the fix batch):
  stale comments in TimelineAllDayStrip.tsx:44-46, TimelineAllDayBar.tsx:6-8,
  TimelineGrid.tsx:33-40 and calendarViewVocabulary.ts's header; export
  `readRootFontPx` from useRootFontPx.ts (appChrome.ts's own read is debt);
  a "change together" comment beside TimelineDayColumn's rem constants;
  restore TimelineGrid's blank line. Drafted rulebook text: A (STRUCTURE.md
  "The live root font size has one JS reader"), B (docs/structure/calendar.md
  "The timeline's all-day row and zoom text", plus one sentence on "The hour
  timeline's scale has one home"), C (the TimelineGrid trend line, next seam
  `useAllDayExpand.ts`). Needs Bryce's OK before landing.

- **Vision pass 1: BLOCKED**, gauntlet all exit 0 (2030 tests; UTC 2020 +
  10 skips; build 0), boundaries clean. BLOCKER: TimelineDayColumn.tsx:169,
  the location line still uses the old `heightPx >= 72` rule, so at iPad
  Largest (30 min at 144 to 166 px/h, 35 min near 124 to 130) title, time
  and location overflow and letters lose their bottoms. Fix: gate it on
  real pixels like the time line. NOTEs: full titles at scale 1 now take a
  1.25 line height (15px, was 16px); compact clamp is on the safe side;
  expand state and chevron visibility check out; `useRootFontPx` runs
  `getComputedStyle` on every render of every column (cache it); the zoom
  anchor holds by reasoning; stale strip comment; count buttons 24px tall
  (not new).
- **Strange pass 1: BLOCKED.** B2: narrow Week columns cut titles at the
  right edge ("teachei", "conferer"), fix `break-words hyphens-auto`. B3:
  iPad Largest, 15 and 30 minute blocks at 48px/h lose g, y, p tails, fix
  the small tier from real pixels. NOTEs: the 15-minute title-only ruling
  reads cleanly (looks like a 30 minute block now; zoom or tap shows the
  time); lanes, counts, aria labels right; chevron correct, 44px, spills
  9px at Largest (fix `min()` width); count button 24px is allowed by
  DESIGN.md timeline exception (c), whose wording still names "+N more" and
  "− Show less" (Fury updates); pinch anchor holds with the open row
  (drift under 1.2 minutes); zoom text 1, 1.25, 1.5 as approved; hour
  labels never wrap; at Largest and full zoom the open header takes 305px
  on iPad landscape; reduce motion instant; dark mode right. Shots and
  harness in this session's scratchpad `strange/`.
- Fix batch F1 dispatched (all three blockers plus chosen notes).
- Pass 2: Vision and Strange re-gate F1 (Captain already PASS).
- **Vision pass 2: BLOCKED.** Gauntlet all exit 0 (2032; UTC 2022 + 10
  skips; build 0); boundary clean; pass-1 location blocker closed (85,008
  combination sweep: time and location never overflow). BLOCKER: the small
  title tier (0.75rem line, 18px at Largest) is taller than the box when
  zoomed far out at Larger and Largest (hour heights 32 to 43, short
  events, up to 6px). Pre-existing since mission 65, but F1's objective
  says any zoom. Fix: cap the small tier at mission 65's 12px line (10px
  font) in CSS and JS; better, one pure fit function with a grid test.
  NOTEs: `useRootFontPx` cache correct (one stale frame at worst after a
  Text size change made with no calendar open); hyphenation works
  (`lang="en"`); the CHANGE TOGETHER comment names the old class form.
- **Strange pass 2: PASS.** 120 configurations, 0 cuts (titles, time,
  location, pills). NOTEs: "Dentis / t" in a 38px phone Week column (all
  letters whole; acceptable; Safari hyphenation is Bryce's real check);
  compact titles lose a line to a hidden time line (N2); "Piano les-..."
  hyphen before an ellipsis (N3); location is Day only by design.
- Fix batch F2 dispatched (Vision's blocker plus N2, N3).

## Delivery

# Mission 73: Calendar full screen PR 7, the all-day row like Google and text that zooms

- **Status:** INTERROGATING (mock sent to Bryce 2026-11-11, waiting for his OK)
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
- Captain: out unless the diff passes ~300 lines or a new file appears
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

(Written after Bryce's OK.)

## Gate log

## Delivery

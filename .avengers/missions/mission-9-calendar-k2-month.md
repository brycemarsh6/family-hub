# Mission: Calendar K2 — Month view + navigation

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (boundaries and line budgets re-checked against the real post-C4 tree, 2026-09-02; ready to dispatch C1 the moment K1 delivers)
**Started:** 2026-09-02 · **Updated:** 2026-09-02

## Brief

- **Goal:** Add the Month view to `/calendar` — the third view in the
  existing `RadioSheet` switcher — as a Sunday-first six-week grid that
  reads events as colored pills, draws multi-day events as spanning bars,
  and hands off to Day view on a day tap. Phase K2 of
  `.avengers/plans/calendar-v1.md`; the design is the walkthrough log's
  screenshot-1 entry (adopt/adapt/skip calls already made with Bryce).
- **Done means:** signed in, the switcher offers Day / Week / Month; Month
  shows the current month as a six-row grid (adjacent-month days in
  `--muted`, today's number in the accent circle) with up to three pills
  per cell and a "+N more" overflow; a three-day all-day event renders as
  one continuous bar across its cells and across a week break; a
  multi-person pill shows up to three color bands; ended events dim per
  Strange's K1 instruction; tapping a day number opens that day in Day
  view; prev/next page by month with the same window-edge honesty as
  Week (`isOutsideWindow` per cell, `canStepToPeriod` for the arrows,
  direction-of-travel rule from C7); the whole grid clears the bottom nav
  at 375px with no horizontal scroll; gauntlet green under both timezones;
  the Nov 1 2026 DST month renders 30 consecutive dates.
- **Out of scope (do not build):** filters/tags/meals (K3), recurrence
  expansion (K4 — `rrule` rows render once, on their `startAt`), AI import,
  Google sync, search, Skylight's swipe-to-page (arrows only, per the plan),
  any change to the event model.

## Danger register

Standing (STRUCTURE.md + AGENTS.md), absolute for every agent:
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- **No committed, rerunnable script may create, update, or delete `User`
  rows** (amended 2026-09-02). Seeders attach to existing people;
  verification people are created and deleted one-off by id.
- Migrations are **additive only** — and **K2 needs none**. A contract
  that finds itself wanting a schema change is BLOCKED-ON-CONTRACT.
- Never push without the user (autonomy granted 2026-09-02 covers building
  and pushing the working branch; **not** opening a PR).

This session: the container's `.env` points at a **local throwaway
Postgres** (port 5433, db `marshee_k1`) with no family data. Scratch under
`prisma/tmp-*/` is git-ignored and tsconfig-excluded. **Gates that create
credentialed rows run serially** (Vision, then Strange); Captain may run
alongside either.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pinned to `TZ=America/Denver`; baseline after K1 = 135 + C4's additions)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts` (same count)
- `npm run build`

## Assembled

- Stark + Vision (always).
- **Strange** — a whole new view a human sees; the lane-assignment renderer
  is the riskiest visual in the calendar.
- **Captain** — new files (`MonthGrid.tsx`, `monthLayout.ts` + test), and
  `CalendarViews.tsx` grows a third branch right after K1 fought to keep it
  under the cap.
- Banner — not needed; K1 left `file:line` citations for every seam.

## Contracts (DRAFT — re-check boundaries against the post-C4 tree before dispatch)

### C1 — Pure month layout + the shared-vocabulary exports Captain asked for
- **Status:** PENDING (dispatch first; C2 depends on it)
- **Objective:** given a month, a Sunday-first six-week grid of 42 days,
  and given the events, a per-row **lane assignment** so spanning bars and
  pills never collide — pure functions, no React, no DB, no `new Date()`.
- **Boundaries:** may touch `src/lib/monthLayout.ts` (new),
  `src/lib/monthLayout.test.ts` (new), and — for Captain's collapse-the-
  duplicates note only — `src/lib/mealPlanDates.ts` (85 lines; **add one
  export**, `toLocalDateString`) and `src/lib/calendarDates.ts` (250;
  **export the existing private `calendarDayDiff`**, no behavior change)
  plus `src/lib/calendarDates.test.ts` (349 — **at the cap: add no tests
  here**, only adjust if the export rename requires it). Must not touch
  any component, page, action, or `prisma/**`. `monthLayout.ts` imports
  only from `mealPlanDates.ts` and `calendarDates.ts`.
- **Shape:** `monthGridDays(anchor): Date[42]` (always six rows, so the
  grid height never jumps between months); `assignLanes(rowDays,
  events): { spans: {event, startCol, endCol, lane}[], overflowByDay:
  number[] }` — multi-day events first, longest first, then single-day
  by start time; a per-cell cap of three visible entries with the rest
  counted into `overflowByDay`; spans that cross a week break are split
  into one span per row (the caller draws a continuation, not the lib).
  Uses `daysEventCovers` from C2 so the exclusive all-day end is honored
  by construction, and `isOutsideWindow` so out-of-window cells are marked.
- **Verification:** `node:test` cases: a month starting on Sunday (Nov
  2026 — also the DST month), one starting on Saturday, Feb of a non-leap
  year (needs rows 5–6 from the next month), a 3-day all-day bar across a
  week break (row split, lanes continuous), two overlapping bars taking
  lanes 0 and 1, a cell with five single-day events → three shown + 2
  overflow, and a cell outside the fetch window. Both timezones.
- **Done criteria:** tests red-then-green for the lane collision case;
  the 42-day grid for every month of 2026 has no duplicate and no gap;
  `calendarDates.test.ts` line count unchanged or lower; the two new
  exports have tests in **`monthLayout.test.ts`** (per the amended cap
  rule, tests split by module under test).

### C2 — `MonthGrid.tsx` + the Month branch in `CalendarViews.tsx`
- **Status:** PENDING (depends on C1)
- **Objective:** render C1's layout: header row of `SHORT_DAY_NAMES`, six
  rows, day numbers (adjacent-month in `--muted`, today accent-circled),
  pills (title truncated, background from `avatarColorHex()` bands capped
  at three, Strange's past treatment), spanning bars with continuation at
  week breaks, "+N more", and the not-loaded treatment on out-of-window
  cells (the C4 glyph, smaller). Day-number tap → Day view on that date.
  Switcher gains Month; title reads "September 2026"; arrows page by
  month via `canStepToPeriod` with the C7 direction rule.
- **Boundaries:** may touch `src/components/MonthGrid.tsx` (new),
  `src/components/MonthCell.tsx` (new, if the cell earns its own file),
  `src/components/CalendarEmptyStates.tsx` (new — see the extraction rule
  below), `src/components/CalendarViews.tsx` (**307 of 350 — read the line
  budget below before writing a line**), `src/components/CalendarHeader.tsx`
  (100, label only), `src/components/DaySection.tsx` (196, **only** to
  import the extracted empty-state cards and to make `onOpenEvent`
  required), `src/lib/types.ts` (96 — add `createdByName` to
  `CalendarEventView`), `src/components/EventDetailSheet.tsx` (189) and
  `src/app/(app)/calendar/page.tsx` (118) for the `createdByNames`→field
  migration, `src/app/(app)/calendar/loading.tsx` (the Month skeleton —
  **measure it, never guess; this repo has shipped that bug twice**).
  Must not touch: `EventCard.tsx`, `EventForm.tsx`, any action, `prisma/**`,
  `monthLayout.ts` or `calendarDates.ts` (C1 owns both — a missing helper is
  BLOCKED-ON-CONTRACT, not an edit).
- **⚠️ Line budget, the reason this contract has an order.**
  `CalendarViews.tsx` is **307** and holds five `useState`s plus the
  view-router; Captain's standing prediction is 350–380 by K3. A third view
  branch **will** cross the soft cap. So: **extract the view-router into
  `MonthGrid`/`DaySection` call sites and, if still over 330 after the
  Month branch, split the period/paging state into
  `useCalendarPeriod.ts`** (a lib hook — that needs a boundary extension,
  so report it rather than doing it silently). Report `CalendarViews.tsx`'s
  line count at three points: before, after the type migration, after the
  Month branch.
- **Verification:** 375px screenshots light/dark of: the current month
  with a 3-day bar crossing a week break, a five-event cell showing "+2
  more", the Nov 2026 month (30 consecutive dates, DST), the month at the
  forward window edge with out-of-window cells marked, and Day view after
  a day-number tap. `getBoundingClientRect` on every tappable day number
  (≥44px compact tier) and on the grid's last row vs the bottom nav. No
  horizontal scroll at 320/375/1024. Line counts: `CalendarViews.tsx`
  must stay under 350 — if the Month branch pushes it over, extract the
  view-router and say so.
- **Done criteria:** the "Done means" list above, every item shown by
  screenshot or measurement; counts back to zero.

## Post-C4 tree, measured 2026-09-02 (the numbers the contracts assume)

| file | lines | headroom to 350 |
|---|---|---|
| `EventForm.tsx` | 346 | **4** — K3's problem, not K2's; do not touch |
| `calendarDates.test.ts` | 349 | **1** — add no tests here |
| `CalendarViews.tsx` | 307 | 43 — the Month branch eats this |
| `calendarDates.ts` | 250 | 100 |
| `DaySection.tsx` | 196 | 154 |
| `EventDetailSheet.tsx` | 189 | 161 |
| `EventCard.tsx` | 168 | 182 (untouched by K2) |
| `page.tsx` | 118 | 232 |
| `CalendarHeader.tsx` | 100 | 250 |
| `types.ts` | 96 | 254 |
| `mealPlanDates.ts` | 85 | 265 |
| `ActionCircle.tsx` | 38 | 312 |

## Inherited from K1's gates — fold into C1/C2

**From Strange, C4 pass 2 (the last K1 gate):**
- **`body.scrollWidth`, never `documentElement.scrollWidth`**, is the
  correct instrument for horizontal overflow in this app — the html element
  clips and hides it. Strange caught itself under-reporting with the wrong
  one. Any K2 overflow check must use `body`.
- **The Starts/Ends row at 375 has ~10px of slack**, with the date input at
  its intrinsic floor. **No further control fits in that row.** (320 already
  overflows by 29px, pre-existing; the constitution's coverage width is 375
  and that is clean.)
- **Close the parser note cheaply if K2 touches the page:** the `?date=`
  regex is shape-only, so `2026-02-30` rolls over to Mar 2. A round-trip
  check — reject unless `toDateParam(parse(date)) === date` — makes the
  validation semantic rather than lexical, at the cost of one comparison.

**From Captain, C4 pass 1:**

- **`CalendarEventView.createdByName: string | null`** in `src/lib/types.ts`
  replaces K1's `createdByNames` map (`page.tsx`, `CalendarViews.tsx`,
  `EventDetailSheet.tsx` adjust). C2 owns this since it touches those files.
- **Collapse the four `YYYY-MM-DD` formatters**: export
  `toLocalDateString(date)` from `mealPlanDates.ts` and `calendarDayDiff`
  from `calendarDates.ts`; replace the copies in `PantryItemEditSheet.tsx:20`,
  `EventForm.tsx:40`, `CalendarViews.tsx:302` (`toDateParam`), and
  `EventForm.tsx:56` (`daysBetween`). C1 exports; C2 replaces the calendar
  copies (the pantry one is out of K2's scope — a note for whoever touches
  it next).
- **New date tests go in `monthLayout.test.ts`**, never into
  `calendarDates.test.ts` (349, one under the cap; tests are not exempt).
- **If Month cells reuse any empty-state card**, extract
  `NoEventsCard`/`NotLoadedCard`/the skeleton row into
  `CalendarEmptyStates.tsx` rather than importing `DaySection` for its
  private components.
- **Make `DaySection.onOpenEvent` required** on the non-loading branch (its
  own comment already says "required").

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Strange | — | — | — |
| 1 | Captain | — | — | — |

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-09-02 — File drafted by Fury while K1's C4 was still building, so K2
  can start the moment K1 delivers. Contracts are DRAFT: boundaries assume
  C4 lands `CalendarHeader.tsx` and `ActionCircle.tsx` and keeps every file
  under 350 lines; re-check against the real tree before dispatching C1.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

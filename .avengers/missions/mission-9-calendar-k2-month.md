# Mission: Calendar K2 — Month view + navigation

**Project:** family-hub (Marshee)
**Status:** CONTRACTED-DRAFT (contracts written from the plan; boundaries and line budgets to be re-checked against the K1 tree once C4 lands and K1 is delivered)
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

### C1 — Pure month layout: `src/lib/monthLayout.ts` + tests
- **Status:** PENDING
- **Objective:** given a month, a Sunday-first six-week grid of 42 days,
  and given the events, a per-row **lane assignment** so spanning bars and
  pills never collide — pure functions, no React, no DB, no `new Date()`.
- **Boundaries:** may touch `src/lib/monthLayout.ts` (new),
  `src/lib/monthLayout.test.ts` (new). Must not touch anything else;
  imports only from `mealPlanDates.ts` and `calendarDates.ts`.
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
  the 42-day grid for every month of 2026 has no duplicate and no gap.

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
  `src/components/CalendarViews.tsx`, `src/components/CalendarHeader.tsx`
  (label only), `src/app/(app)/calendar/loading.tsx` (the Month skeleton —
  **measure**), `src/app/(app)/calendar/page.tsx` (only if the fetch window
  must widen to cover a six-week grid at the edges — say so in the report).
  Must not touch: `DaySection.tsx`, `EventCard.tsx`, `EventForm*`, actions,
  prisma, `calendarDates.ts`, `monthLayout.ts` (C1 owns it — BLOCKED-ON-
  CONTRACT if it lacks something).
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

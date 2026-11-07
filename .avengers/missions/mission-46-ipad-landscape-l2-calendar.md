# Mission 46: iPad landscape L2 (the Calendar goes wide)

**Project:** family-hub (Marshee)
**Status:** BUILDING
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/ipad-landscape-l2-calendar-46358d` (from `origin/main` at `174f74d`)
**Plan:** `.avengers/plans/ipad-landscape-v1.md`, step L2 (Calendar section; decisions 215 to 224)

Numbering: Bryce asked for "mission 45", but `mission-45-assistant-cookbooks.md`
already holds 45, so this is 46 (Fury, 2026-11-07, said in chat).

## Brief

- **Goal:** the Calendar page uses the full width of the kitchen iPad in
  landscape, per the plan: Schedule gets a tappable mini month beside the
  list; Month, Week, 3 Day and Day columns widen and their text becomes
  readable; Year shows 4 mini months across.
- **Done means:** at 1180x820 every Calendar view fills the width
  (Schedule: mini month about 440px on the left, list on the right; Month
  7 columns about 160px with readable chip titles; Week 7 columns about
  157px with 12px titles; Year 4 across). At 820x1180 and with the
  Sidebar or Rail at 1180 the views fit the room left. At 375 nothing
  changes. Every sheet still opens over the whole screen. The Gauntlet is
  green; PR merges; production shows it.
- **Out of scope:** the event and task forms (L6), the Calendar dashboard
  widget (W2), drag to reschedule (CD1), anything on other pages.

## Bryce's decisions

- From the plan (approved 2026-11-07): 215 covers the Calendar section
  and the "Calendar, Schedule" board.
- Hill is on break (Bryce, 2026-11-07): design calls go to Bryce with a
  mock. Open questions on the canvas boards "L2 Calendar: Month, wide"
  and "L2 Calendar: Schedule mini month" (posted 2026-11-07).

## Fury's structural calls

- `data-page-width="wide"` goes on the page root in `calendar/page.tsx`
  and `calendar/loading.tsx` (Banner: neither is a container, and every
  sheet renders inside `CalendarViews`, so the containers go lower down).
- Containers wrap only columns: the Year grid, each timeline day column
  (for its own text size), the Month grid, the Schedule two-panel row.
  Never the `CalendarViews` root, which holds every sheet.
- Timeline text size switches by the column's own width (a container on
  each `TimelineDayColumn`), not by how many columns there are, so a
  157px Week column reads like a 3 Day one and a 44px phone column stays
  as today.

## Danger register

From AGENTS.md, absolute for every agent:
- Local dev uses the Neon `dev` branch (`.env` is a symlink to the main
  checkout's; its live line is the dev endpoint, checked 2026-11-07). A
  `DATABASE_URL` whose host is not the dev endpoint: stop and say so. No
  agent edits `.env`.
- `npm run db:seed` and `npm run db:reset` are forbidden. No clean or
  reset script for `User`. No migration in this mission.
- The dev branch holds real family data: private.
- Never `git add -A` / `git add .`; stage by explicit path;
  `git show --stat HEAD` after each commit.
- Direct pushes to `main` are blocked; branch, PR, Gauntlet green, merge.

## Gauntlet

- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts`
- `npm run build`

## Assembled

- Stark + Vision (always).
- Strange: every Calendar view changes visibly. Sizes: 1180x820,
  820x1180, 375, and 1180 with Sidebar and with Rail (Bryce).
- Captain: Bryce asked; the Schedule mini month is a new component and
  ScheduleView (532 lines) and CalendarViews (501) are near the hard cap.
- Banner: one brief (2026-11-07), facts used below.

## Contracts

### C1 - the page opts in; Week, 3 Day, Day and Year use the width
- **Status:** DISPATCHED
- **Boundaries:** may touch: `src/app/(app)/calendar/page.tsx`,
  `src/app/(app)/calendar/loading.tsx`, `src/components/YearView.tsx`,
  `src/components/TimelineDayColumn.tsx` · must not touch:
  `src/components/CalendarViews.tsx`, `src/components/ScheduleView.tsx`,
  `src/components/MonthGrid.tsx`, `src/components/MonthCell.tsx`,
  `src/lib/monthLayout.ts`, `src/components/TimelineGrid.tsx`,
  `src/components/CalendarHeader.tsx`, `src/components/AppChrome.tsx`,
  every sheet component, `prisma/`, `package.json`, `DESIGN.md`,
  `STRUCTURE.md`, `CLAUDE.md`, `.env`.
- **Spec:**
  1. `page.tsx`: the root `<div className="py-2 ...">` gains
     `data-page-width="wide"`. Keep the "py-2 is load-bearing" comment;
     add one line saying the attribute lifts the 768px cap (STRUCTURE.md
     "Wide pages", mission-46).
  2. `loading.tsx`: the same attribute on its root, so the skeleton is
     wide from the first paint. `YearGridSkeleton` matches the real Year
     grid's classes (below), inside the same `@container` wrapper.
  3. `YearView.tsx`: wrap the grid in `<div className="@container">`;
     the grid becomes `grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3
     @min-[60rem]:grid-cols-4`. (At 1180 the container is about 1148px:
     4 across. Sidebar about 892px and 820 upright about 788px: 3. Phone:
     2.) Update the comment that names `grid-cols-2`.
  4. `TimelineDayColumn.tsx`: the column's root (`relative border-l
     border-line`, around line 96) also gets `@container`. When `compact`
     is true, the title is `text-[10px] @min-[8rem]:text-xs` (today it is
     always 10px), and the time-range line, which today renders only when
     `!compact`, also renders for compact columns from an 8rem (128px)
     column width (`hidden @min-[8rem]:block` on that span when compact,
     under the same height gate). The location line stays Day only.
     Rewrite the "Day view only (D5)" comment to say the rule is now the
     column's own width: phone 3 Day and Week columns (about 44 to 100px)
     keep today's look, and a wide Week column (about 157px) reads like
     Day. Do not change `compact`'s definition in `TimelineGrid.tsx`.
  - No em or en dashes in anything written. Report total line counts of
    every touched file. Add no package.
- **Verification:** the whole Gauntlet passes. A dev server may be
  running on port 3000; do not start or stop one.
- **Evidence required:** each Gauntlet command's tail; `git diff --stat`;
  the exact new class strings; line counts.
- **Done criteria:** Strange sees Week at 1180 with 12px titles and time
  lines in 157px columns, phone Week unchanged, Year 4/3/2 across at the
  sizes above, skeleton wide.

### C2 - Month chips readable on wide (waits for Bryce, question 1)
- **Status:** PENDING

### C3 - Schedule mini month (waits for Bryce, questions 2 and 3)
- **Status:** PENDING

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-07: mission opened. Mission 44 marked DELIVERED. Banner brief
  in. Two mock boards posted for Bryce. C1 dispatched (needs no design
  call: the plan already settles it).

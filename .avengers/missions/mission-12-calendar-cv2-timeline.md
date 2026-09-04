# Mission: Calendar CV2 — the timeline layout library (+ the queued C5 repairs)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (two contracts, **disjoint boundaries — run in parallel**)
**Started:** 2026-09-03 · **Updated:** 2026-09-03
**Plan:** `.avengers/plans/calendar-v2.md` — phase CV2, plus mission-11's queued C5
**Branch:** `claude/calendar-cv2-timeline`, stacked on `claude/calendar-cv1-vocabulary` — **five branches deep, none merged**, by Bryce's standing decision to hold production until the Calendar is genuinely usable

## Brief

- **Goal:** build the pure layout maths the hour timeline needs — the one
  genuinely new rendering model in Calendar v2, since **nothing in `src/`
  positions anything by time today.** No component, no view: a tested library
  the next phases consume. Plus the two repairs mission-11 left queued.
- **Done means:** `src/lib/timelineLayout.ts` converts an event and a day into
  block geometry in **minutes, never pixels**; overlapping events get side-by-side
  columns via a greedy packer that reads like `assignLanes`'s sibling; all-day
  and multi-day events are partitioned into a row the **existing**
  `monthLayout.assignLanes` packs, with no second packer; a documented,
  tested DST policy; and the tab-refresh gesture is restored with the
  overclaiming cost comment corrected.
- **Out of scope:** `TimelineGrid` and every view (CV3/CV4), the
  `CalendarViews.tsx` extraction (**Captain ruled it required before CV3, and
  CV2 explicitly does not need it**), tasks, drag.

## Danger register

⚠️ **`DATABASE_URL` is the Neon `dev` branch** — a real snapshot of family
data, password hashes included. Isolation is not privacy.
- **Never print `.env`**; **never quote a real event title** — one reached a
  builder's terminal in mission-11 during dialog inspection; it disclosed it,
  kept it out of its report, and switched to counting. Hold that line.
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- Test data only via `db:seed-calendar` / `db:clean-calendar`; restore
  `calendarEvent` **4** and `user` **5**, confirmed by direct read.
- **Never create, update, or delete `User` rows.** Minting a session cookie
  for an existing user is permitted.
- Migrations: **none.** A contract wanting one is BLOCKED-ON-CONTRACT.
- **Never `git add -A` or `git add .`** — stage by explicit path
  (STRUCTURE.md danger register, added after Fury did exactly this).
- Never push or open a PR without Fury.
- Nothing is serving the repo — start your own; use a Chrome debug port
  distinct from those mission-11 burned (9222/9333/9401/9444/9555/9611/9666/
  9777/9871/9903/9987).

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` (pins `TZ=America/Denver`
  **inside the script**) · `TZ=UTC node --import tsx --test src/lib/*.test.ts
  src/lib/voice/*.test.ts` (**the direct invocation is the only honest second
  timezone**) · `npm run build`

Baseline **207**. C2 raises it substantially; C1 should not move it.

## Assembled

- Stark ×2 (parallel — disjoint) + Vision.
- **Captain** — a new lib module whose shape sets the pattern for the
  timeline, and a second consumer of `monthLayout.assignLanes`.
- **Strange — not assembled.** C2 renders nothing. C1 touches the nav bar's
  behaviour but not its appearance; **if either gate sees a pixel move, that
  is a BLOCKER and Strange comes in.**
- Banner — not needed.

## Contracts — disjoint, parallel

| file | C1 | C2 |
|---|---|---|
| `src/components/HubNav.tsx` | **owns** | — |
| `src/lib/useCanonicalCalendarUrl.ts` (comment only) | **owns** | — |
| `src/lib/timelineLayout.ts` (new) + test | — | **owns** |
| everything else | must not | must not |

### C1 — Restore the iOS refresh gesture; correct the overclaiming cost comment
- **Status:** PENDING
- **1. The comment at `useCanonicalCalendarUrl.ts:71-77` overclaims**, and
  Fury repeated the claim in a commit message. It says the native replace
  costs nothing. Vision measured a **cold Back into a canonicalised entry at
  2 RSC fetches versus 1 on base** — deterministic, 3/3 dev and 3/3 prod.
  Correct it to state: free on loads and picks; **+1 fetch on a cold Back into
  a canonicalised entry**, bounded to once because every such entry shares a
  cache key; **base does the same for any native `pushState` entry**, so this
  is the price of the History API integration Next's own docs recommend, not
  of this hook; and native still beats `router.replace` overall (which cost
  15 extra GETs across 14 picks by also invalidating the router cache).
  Also note the **dev-only double-fire** (React StrictMode's mount-effect
  double-invoke; production fires once) so the next harness author doesn't
  chase it.
- **2. Restore the refresh gesture.** Since canonicalisation, re-tapping the
  **already-active** Calendar tab pushes a duplicate history entry — making
  the next Back a dead press — and **fetches nothing**. Vision's note is the
  reason this matters: **that same-URL refetch was the only refresh gesture an
  iOS standalone PWA has.** No address bar, no reload button. F8 exists
  precisely because Emily's phone backgrounds and reloads the app.
  Vision's fix: render the active tab's `<Link>` with **`replace`** (no
  duplicate entry) and **`router.refresh()`** on an active re-tap.
- **Check all five tabs, not just Calendar** — `HubNav` renders Kitchen /
  Calendar / Home / Chores / Lists and the change applies to every one.
  Verify a re-tap on each behaves sensibly, and that **navigating between**
  different tabs is unchanged.
- **Boundaries:** `src/components/HubNav.tsx`,
  `src/lib/useCanonicalCalendarUrl.ts` (**comment only**). Nothing else.
- **Verification:** an active re-tap adds **no** history entry and **does**
  refetch (show the request); the Back after it is not dead; inter-tab
  navigation unchanged; **mission-11's scenarios still hold** — S1, S3, F5,
  F7, F8 (their transcripts are in `mission-11`'s Vision sections). Gauntlet
  both timezones, **207 unchanged**.
- **Evidence:** before/after request captures for an active re-tap on at least
  two tabs; a history-length reading proving no duplicate entry; the five
  mission-11 scenarios; both timezone counts.

### C2 — `src/lib/timelineLayout.ts`, pure and tested
- **Status:** PENDING
- **Objective:** given a day and an event, the block's position and height
  **in minutes**; given a day's events, side-by-side columns for overlaps;
  given a set of column days, the split between the all-day row and the timed
  grid. **No React, no DB, no pixels, no zero-argument `new Date()`.**
- **Imports only** `./mealPlanDates` and `./calendarDates` — the same rule
  `monthLayout.ts` follows. **Mirror `assignLanes`'s shape** so the two libs
  read as siblings.
- **`minutesOfDay(instant)`** = `getHours() * 60 + getMinutes()`, local
  getters only.
- **`blockGeometry(day, event)`** → `{ topMinutes, heightMinutes,
  clippedStart, clippedEnd }` or `null`. Day bounds from
  `startOfDay`/`addDays` (exact under DST); clip at the bounds; a
  `MIN_BLOCK_MINUTES` floor so a 5-minute event is still tappable; pull a late
  block up so `top + height ≤ 1440`. **An end exactly at the day's own
  midnight is NOT clipped** — that agrees with `eventDaySpan`'s existing
  exact-midnight rule (`calendarDates.ts:134-153`), and disagreeing with it is
  how the two libs would silently diverge.
- **The DST policy is a decision, not an accident — make it, document it, test
  it.** A fixed 24-row wall-clock rail is the expected answer (Google and
  Apple both do this): on **Nov 1 2026** the repeated 1 AM hour collapses, so
  a 3-hour event across it draws 2 hours tall, and spring-forward's missing
  hour is an empty row. **The guarantee is no NaN, no negative height, no
  crash.** If you choose differently, argue it.
- **`belongsInAllDayRow`** — `allDay === true` routes to the row **without
  reading the times** (this is what keeps the timed path off the deferred
  all-day-storage-bug audit list, and tasks are all-day by construction in
  CT1); a *timed* event spanning ≥ 1 full calendar day also routes there, via
  `calendarDayDiff`, never a millisecond duration. **Fri 10 PM → Sat 2 AM
  belongs in the grid on both days, clipped** — Google's behaviour.
- **`partitionForTimeline(columnDays, events)`** → `{ allDayRow, timed }`.
  The row is then fed to **`monthLayout.assignLanes` unchanged** — it *is* a
  month row (spans, lanes, "+N"). **Do not write a second packer.** Note
  `timelineLayout.ts` must not import `monthLayout.ts` for this; the caller
  composes them.
- **`assignColumns(geometries)`** — greedy, the sibling of `assignLanes`:
  sort by top ascending, height descending, then a stable id tiebreak;
  clusters split where `top >= clusterEnd`, so **touching events (9–10 and
  10–11) are NOT an overlap**; each block takes the lowest column whose last
  block ended at or before its start; `columnCount` is per cluster so widths
  are `1/columnCount`. **Use the *visual* bottom for cluster ends**, so the
  `MIN_BLOCK_MINUTES` pad cannot let two blocks paint over each other.
- **Determinism matters** — `assignLanes` has a stable id tiebreak for exactly
  this reason. A renderer whose columns reshuffle between two renders of the
  same data is a bug. **Vision's C1 note from mission-9 applies here too:
  K4's recurrence will produce several instances of one `rrule` row, so the
  id must be distinct per instance before it reaches this function** — say so
  in the doc comment.
- **Tests** (`src/lib/timelineLayout.test.ts`): midnight-crossing both ways;
  an end exactly at midnight; a sub-minimum-height event; a late-evening block
  pulled up; both DST days — **the fall-back cases Denver-gated with `skip`,
  or they pass vacuously under UTC and prove nothing** (mission-9's lesson);
  touching-vs-overlapping as a **red-then-green** pair; a three-deep overlap
  chain resolving to two columns; two independent clusters with different
  counts; determinism under a shuffled input; the all-day/timed partition
  including the Fri 10 PM → Sat 2 AM case; and composition with
  `assignLanes` on the row it produces.
- **Boundaries:** `src/lib/timelineLayout.ts` and its test. **Nothing else** —
  a missing helper in `calendarDates.ts` is `BLOCKED-ON-CONTRACT`, not an edit.
- **Verification:** full gauntlet, both timezones, equal counts, and the
  red-then-green transcript pasted (write the touching-vs-overlap test, watch
  it fail, then implement). **A regression test never seen red proves
  nothing** — this project's standing law.
- **Evidence:** the red-then-green output; both timezone counts; `wc -l`; the
  exported signatures (CV4 consumes them); and your stated DST policy with the
  test that pins it.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Captain | — | — | — |

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-09-03 — Opened by Fury after CV1 delivered and Bryce approved the five
  constitution amendments. C1 is mission-11's queued C5, folded in here as
  CV2's opening contract since the boundaries are disjoint from the library
  work and both can run at once.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

# Mission: CD1 — long-press and drag to reschedule

**Project:** family-hub (Marshee)
**Status:** **OPEN — contracts written, none dispatched.**
Branch `claude/calendar-cd1`. Nothing built, no PR, nothing live.
**Started:** 2026-09-09 · **Updated:** 2026-09-09

## Brief

- **Goal:** Long-press a timed block on the hour timeline (Day / 3 Day / Week),
  drag it to a new time, drop. Snaps to **15 minutes**; dragging across columns
  changes the **day**; **duration is preserved**. Anything shorter than the hold
  is handed back to the scroller or to CV6's page-swipe.
- **Done means:** a manager can drag a block to a new time and it persists
  (verified by direct database read); a vertical drag without the hold still
  scrolls; a horizontal drag without the hold still pages; **a kid cannot lift a
  block**; a rejected drop snaps back with the house `{ error }` inline; the
  six-leg gauntlet passes.
- **Out of scope:** dragging **all-day / multi-day blocks and tasks** (different
  row, different gesture — Month drag is later); **resizing** a block; K3
  filters/tags; K4 recurrence; the RSVP and search walkthroughs; Google sync.

## Danger register

Absolute, for every agent including Fury:

- **Never** `npm run db:seed` / `npm run db:reset`; never a Neon branch reset.
- **Never** create, update, delete or deactivate `User` rows.
- **Never** edit an existing migration. **This mission adds none** — `rrule`
  already exists (`schema.prisma:434`) and nothing else new is stored.
- ⚠️ **This mission has a REAL database write path** — the first on this arc
  since CT2. `moveCalendarEvent` mutates `CalendarEvent.startAt`/`endAt` on the
  family's actual calendar. Test data comes from scoped, fingerprint-cleaned
  fixtures deleted **by id as each measurement finishes**, never batched.
- The dev branch holds **real family data**. Report roles and counts, **never
  names or event titles** — count characters rather than quoting. **Four agents
  on this arc have leaked one.**
- Baseline to restore: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
- **Never `git add -A` / `git add .`** — stage by explicit path, then
  `git show --stat HEAD`.
- Direct pushes to `main` are blocked. Branch → PR → green Gauntlet → merge.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins `TZ=America/Denver` **inside `package.json`**, so
  `TZ=UTC npm test` silently runs Denver twice)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `npm run build`
- At delivery: `node .claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

**Baseline entering this mission: 350 / 343 + 7 skipped / 350.** Build 34 routes.

## Assembled

- **Stark + Vision** — irreducible.
- **Strange** — a new gesture with a visible lift, over content. **DESIGN.md's
  press-state rule names CD1 by name** ("CD1 layers more gestures over content
  and should be held to this"), and Strange is the gate that caught that class
  twice on this arc where the other two passed the same code.
- **Captain** — three new files, a new Server Action, and **three target files
  at or near their caps**.
- **Banner — assembled and reported.** Its brief corrected a false premise of
  mine and killed a planned carve-out; both are recorded below.

## Facts established before contracts

By command, not assumption. **My boundaries have been wrong eight times on this
project, always from a false premise about what already exists.**

1. **⚠️ Blocks render in `TimelineDayColumn.tsx`, NOT `TimelineGrid.tsx`** —
   Banner corrected my working assumption. Timed events are `<button>` elements
   at `TimelineDayColumn.tsx:106-217`, inside a `.map()` over `slots`, carrying
   **only `onClick`** (`:141`, `onOpenEvent(event, day)`) — no pointer handlers
   at all. Positioned absolutely from `slot.block.topMinutes * pxPerMinute`
   (`:170-178`).
2. **The draggable/not-draggable discriminant already exists and is reliable.**
   `partitionForTimeline()` (`timelineLayout.ts:241-261`) returns
   `{ allDayRow, timed }`; `belongsInAllDayRow()` (`:217-228`) routes an event to
   the all-day strip if `allDay === true` **or** it covers a full calendar day.
   **Tasks never reach `TimelineDayColumn` at all** — they render in
   `TimelineAllDayStrip.tsx`. So "is a plain timed event" is already answered by
   membership in `timed`; CD1 does not need a new test.
3. **⚠️ THE PLAN'S RECURRENCE CARVE-OUT IS PARTLY UNBUILDABLE — decided, not
   deferred.** `CalendarEvent.rrule` exists (`schema.prisma:434`) but **nothing
   hand-written in `src/` reads or writes it** — confirmed by grep: every hit is
   generated Prisma code or the schema comment, which itself says *"K1 never
   reads `rrule` — recurrence expansion is K4."* And `CalendarEventView`
   (`types.ts:103`) **does not carry `rrule`**, nor does `calendarEventQuery.ts`
   select it.
   **Decision:** build the **server-side** guard in `moveCalendarEvent`
   (`rrule != null` → refuse), because that action reads the stored row anyway to
   recompute duration, so it is free — and when K4 starts writing rrules, a drag
   would otherwise silently reschedule a recurring master with **no this/all
   dialog**, which is data-corruption-shaped. **Do NOT build the client-side
   "show but don't lift"**: it would require widening `CalendarEventView` and the
   query for a state that **cannot currently occur**, and it would be untestable
   through the UI. Unit-test the server guard with a synthetic row and **record
   it as unreachable through the UI today** — do not claim it was exercised end
   to end.
4. **The permission model.** `MANAGER_ROLES = ["admin", "parent"]`
   (`constants.ts:243`). Both `createCalendarEvent` (`:141-142`) and
   `updateCalendarEvent` (`:180-182`) use
   `if (!user || !MANAGER_ROLES.includes(user.role)) return { error: "Only parents can do that." }`.
   Result type is `CalendarEventActionResult = { error?: string }`
   (`calendar.ts:32`) — a returned error, never a thrown redirect.
5. **`updateCalendarEvent`'s anatomy** (`calendar.ts:176-231`):
   `validateEventInput` (`:107-127`, returns `string | null`) → a
   `db.$transaction` → `isMissingRowError` catch (`:225`) →
   `revalidatePath("/calendar")` (`:229`).
6. **No inverse of `blockGeometry` exists.** `timelineLayout.ts` exports
   `MINUTES_PER_DAY` (1440), `MIN_BLOCK_MINUTES` (30), `minutesOfDay` (`:106`),
   `blockGeometry` (`:135`), `assignColumns` (`:294`), `partitionForTimeline`
   (`:241`) — all minutes → position. **CD1 must write pixels → minutes.**
7. **Column index maps directly to a date.** `VIEW_CONFIG[view].days(anchor)`
   gives the column dates (Day `[anchor]`, 3 Day 3 from anchor, Week
   `daysOfWeek(sundayOf(anchor))`), and `TimelineGrid.tsx:350` iterates
   `columnSlots[i]` against `columnDays[i]` — same array, same order, same
   length. Banner verified the stability rather than assuming it.
8. **The gesture's neighbours.** An inner `overflow-y-auto` scroller at
   `TimelineGrid.tsx:369` owns vertical scroll; a `position: sticky top-0` header
   at `:384`; CV6's `usePageSwipe` wraps the whole grid at
   `CalendarViews.tsx:338-351` via `<div className="touch-pan-y">`. **No
   transforms or portals on the blocks themselves.**
9. **`useOptimistic` is NOT used anywhere in the calendar yet.** CD1 introduces
   it there; `PantryList.tsx:66-73` is the house precedent
   (`useOptimistic(items, applyChange)` + `useTransition`, `applyChange` pure).
10. **Sizes now, at dispatch (2026-09-09):** `TimelineDayColumn.tsx` **232**,
    `TimelineGrid.tsx` **555**, `CalendarViews.tsx` **496**,
    `calendar.ts` **350 — exactly the soft cap**, `timelineLayout.ts` 331,
    `usePageSwipe.ts` 294, `PantryList.tsx` 379. *(Totals. Contracts must report
    BOTH counts per STRUCTURE.md, using `preflight.mjs`'s canonical counter.)*

## ⚠️ A NEW environment trap, found by C3 (2026-09-09)

**An agent worktree has no `.env`, and therefore no `DATABASE_URL`.** `.gitignore`
line 34 is `.env*`, so a fresh `git worktree` gets none — confirmed by direct
`ls` on a live worktree while another builder held it. **Any contract whose
verification needs the database cannot be verified in a worktree**, no matter how
it is written.

Independently, **`src/lib/dal.ts` carries `import "server-only"`**, which throws
at module load outside Next's request lifecycle — so a Server Action that imports
it is unreachable from a plain `tsx` script *even in the main tree*. The two
blocks compound: worktree builders cannot reach data at all, and nobody can reach
a guarded action from Node.

**Consequence for dispatching:** a contract that must touch data belongs in the
**main tree**, or its verification belongs to a gate. Recording it here because
it is structural, not a one-off, and it will bite every future data-touching
contract on this project.

## Known risk, named before a gate finds it

- **`calendar.ts` is at exactly 350** and C3 adds an action to it. Per the
  amended caps clause a file whose **code** is well under is not a split
  candidate — so C3 reports both counts and does **not** pre-emptively split.
- **`TimelineGrid.tsx` is at 555** and was already extracted once from 649 in
  CV5. C5 adds to it. **Captain's standing ruling is that CD1 should not open
  with a defensive extraction** — but that was ruled before `calendar.ts`'s
  position was known. If C5 would cross 650, that is BLOCKED-ON-CONTRACT, not a
  hard-cap justification: mission-17 already recorded a file shipping prose
  instead of a seam for exactly that reason.
- **This mission has a real database write path.** Every prior CV-era mission was
  client-side only. The fixtures rule above is not boilerplate here.

## Contracts

**C1, C2 and C3 touch disjoint file sets and go in PARALLEL worktrees.** C4 needs
C2's math. C5 needs C3 and C4. Sized so one dispatch survives a rate limit.

### C1 — the precondition Vision named
- **Status:** ✅ **DONE (`abbd61c`), merged.** Tests **350 → 354**. Gauntlet green
  all six legs. Verified by Fury: the swallow-clear now runs as the **first**
  statement, ahead of both guards.
- **Disclosed deviation, and it is the one the contract authorized.** The
  contract described reordering three statements; the builder extracted the
  whole decision into a pure exported `nextPointerDownDecision` instead —
  because the contract itself warned that a test against `nextSwallowNextClick`
  alone **cannot go red** (its contract is unchanged by a reordering), and asked
  for a falsifiable seam rather than an unfalsifiable test. Same shape as
  `nextGestureMode`/`resolveSwipeDirection` already in that file. **Proven RED**
  against the historical ordering (2 failures, `true !== false`) **then GREEN**,
  with the reverted file confirmed byte-identical by `diff`.
- **Objective:** In `usePageSwipe.ts`, make the click-swallow clear the **first
  statement** of `handlePointerDown`, before both early returns.
- **Why this is a precondition and not a note:** it currently sits at `:222`,
  **after** `if (isGestureClaimed?.()) return;` at `:217`. Vision named the exact
  resurrection at mission-19 pass 2: gesture 1 is a touch swipe that pages (arms
  the flag, no compat click); gesture 2 is a **long-press that claims the
  pointer**, so pointerdown returns early and the stale flag survives; the click
  ending that long-press is eaten. **CD1 is the mission that passes that flag**,
  so the bug becomes reachable the moment C5 lands.
- **Boundaries:** may touch `src/lib/usePageSwipe.ts`,
  `src/lib/usePageSwipe.test.ts` · must not touch anything else.
- **The test must be proven RED first** against the current order, then green.
- **Done criteria:** the clear runs for every pointerdown including a claimed
  one; red-then-green evidence; gauntlet green.

### C2 — the pure drag math
- **Objective:** New `src/lib/timelineDrag.ts` — the inverse `blockGeometry`
  never had, plus snapping and column mapping. Pure, no React, no DOM.
- **Surface:** pixels → minutes; **snap to 15**; clamp so a block cannot leave
  the day (respecting `MIN_BLOCK_MINUTES` and `MINUTES_PER_DAY`); an x offset →
  column index → date. **Duration is preserved by construction** — the caller
  supplies a new *start* only.
- **Boundaries:** may touch new `src/lib/timelineDrag.ts`, new
  `src/lib/timelineDrag.test.ts` · must not touch `src/lib/timelineLayout.ts`
  (import from it; do not edit it), `src/components/**`, `src/app/**`,
  `prisma/**`.
- **⚠️ DST is not optional here.** A drag that changes the day crosses the same
  seam that has bitten this project roughly a dozen times. Build dates with
  **calendar-component arithmetic**, never `+ ms`. Test Nov 1 2026 (fall back)
  **and Mar 8 2026 (spring forward)** — the mission-15 record shows
  spring-forward had **no case at all** in two state-machine test files, so do
  not assume it is covered elsewhere.
- **Tests live in `src/lib/`** — the glob is a hand-enumerated two-directory
  list, not recursive; a test elsewhere **silently never runs while the suite
  reports green**.
- **Done criteria:** exhaustive round-trip and snapping tests, both DST days,
  green under all three timezone legs.

### C3 — `moveCalendarEvent`
- **Status:** ✅ **DONE (`8526245`), merged.** Guard order verified by Fury:
  session → role → validity → row read → all-day refusal → rrule refusal →
  duration recompute → validate → update → refresh. Gauntlet green, tests
  unchanged at 350 (this contract added none — see the gap below).
- **`endAt` provably cannot come from a client:** the signature is
  `(id, newStartAt)` — **there is no end parameter at all**, so a `curl`'d POST
  supplying one would simply be ignored. Duration is read fresh from the stored
  row immediately before use.
- **It used the house helper rather than Fury's literal instruction, and was
  right to.** The contract said `revalidatePath("/calendar")`; the builder used
  `refreshCalendarViews()` (`calendar.ts:28`), which is what the three existing
  write actions use (`:165`, `:229`, `:252`). Verified by Fury.
- **⚠️ NO LIVE VERIFICATION EXISTS FOR THIS ACTION — named, not fabricated.**
  Two independent structural blocks, both disclosed: **(a) an agent worktree has
  no `.env` and therefore no `DATABASE_URL`** (see the new trap below), and
  **(b) `dal.ts` carries `import "server-only"`, which throws the instant the
  module loads outside Next's request lifecycle** — so the action is
  unreachable from any plain Node script regardless of credentials. The builder
  tried the one non-forging probe, hit the `server-only` throw, and stopped.
  **No database read or write occurred — not even a count**, so the baseline
  could be neither confirmed nor disturbed. **Closing this is a gate's job in
  the main tree, which does have `.env`.**
- **⚠️ FURY'S CONTRACT ERROR — the ninth of this shape.** The contract asked for
  a unit test of the `rrule` guard but listed **only `calendar.ts`** in
  may-touch, with no test file. The builder **flagged it rather than silently
  writing an out-of-boundary file** — correct behaviour, and the gap is mine.
  Note the guard may not be unit-testable in place at all: a `"use server"` file
  may export only async functions, so testing it needs the policy split to
  `src/lib/` that `loginRateLimitPolicy.ts` established. **Routed to the gates
  to rule on rather than patched blind.**
- **Size, canonical counter, reported as required:** `calendar.ts` is now
  **461 total / ~220 code** — over the 350 soft cap, as this mission predicted.
  The builder correctly did **not** pre-emptively split. **Captain's call.**
- **Objective:** A guarded Server Action `moveCalendarEvent(id, newStartAt)` in
  `src/app/actions/calendar.ts`.
- **It must recompute `endAt` from the STORED duration, server-side** — read the
  row, compute `endAt - startAt`, apply to the new start. **Never trust a
  client-supplied end.** Then `validateEventInput`, then `revalidatePath("/calendar")`.
- **Manager only**, using the exact existing shape:
  `if (!user || !MANAGER_ROLES.includes(user.role)) return { error: "Only parents can do that." }`.
  Same `CalendarEventActionResult` return type; `isMissingRowError` handled the
  way `updateCalendarEvent` handles it.
- **Refuse a row with `rrule != null`** with a clear message. Per fact 3 this is
  **unreachable through the UI today** — unit-test it with a synthetic row and
  **say plainly that it was not exercised end to end.** Do not claim otherwise.
- **Refuse an all-day row too** — server-side defence in depth, since the client
  guard is a different layer and this action is a public POST endpoint.
- **Boundaries:** may touch `src/app/actions/calendar.ts` · must not touch
  `src/lib/timelineLayout.ts`, `src/components/**`, `prisma/**`,
  `src/lib/dal.ts`, `src/lib/session.ts`.
- **⚠️ `calendar.ts` is at exactly 350 total.** Report **both** counts with the
  canonical counter. Do **not** pre-emptively split.
- **Done criteria:** the action exists, is manager-gated, recomputes duration
  server-side, refuses all-day and rrule rows; gauntlet green.

### C4 — `useLongPressDrag`
- **Objective:** New `src/lib/useLongPressDrag.ts` — hold **≥400ms** without
  moving **>8px** → drag mode; anything sooner is yielded to the scroller and to
  page-swipe.
- **It must claim the pointer through CV6's existing seam** — `usePageSwipe`
  already accepts `isGestureClaimed?: () => boolean` (`:174`), consulted at
  `:217` and on **every** move at `:231`, so a claiming gesture can interrupt
  mid-drag. **Do not add a second mechanism.**
- **Follow the house gesture laws**, which exist because this project paid for
  each: the release decision reads a **ref, not React state** (batching left an
  earlier version reading a stale drag distance); `setPointerCapture` is
  **try/caught** (an unguarded call once abandoned a gesture mid-drag, leaving a
  row stuck to the finger); and **the swallow-clear must be the first statement**
  of pointerdown (C1's lesson, applied here from the start).
- **Split the pure decisions out as exported functions** so `node:test` can reach
  them — this toolchain has **no DOM**, and mission-19/F1 established that an
  inline ref mutation in a client hook is untestable. `nextGestureMode` /
  `resolveSwipeDirection` / `nextSwallowNextClick` in `usePageSwipe.ts` are the
  precedent.
- **Boundaries:** may touch new `src/lib/useLongPressDrag.ts`, new
  `src/lib/useLongPressDrag.test.ts` · must not touch `src/lib/usePageSwipe.ts`
  (C1 owns it), `src/components/**`, `src/app/**`.
- **Done criteria:** the hook exists with its pure decisions exported and tested,
  the 400ms/8px thresholds are named constants, gauntlet green.

### C5 — wire it up
- **Objective:** Attach the gesture to timed blocks, render the lift, apply the
  optimistic move, and pass `isGestureClaimed` to `usePageSwipe`.
- **Boundaries:** may touch `src/components/TimelineDayColumn.tsx`,
  `src/components/TimelineGrid.tsx`, `src/components/CalendarViews.tsx` · must
  not touch `src/lib/usePageSwipe.ts`, `src/lib/timelineDrag.ts`,
  `src/lib/useLongPressDrag.ts`, `src/app/actions/**`, `prisma/**`.
- **Only blocks in the `timed` partition are draggable** (fact 2). All-day and
  tasks are not — and they are not even in this component.
- **Optimistic via `useOptimistic` + `useTransition`**, the `PantryList.tsx:66-73`
  pattern, `applyChange` pure. A rejected drop **snaps back** and shows the house
  `{ error }` inline.
- **⚠️ Held to DESIGN.md's press-state rule, which names CD1 explicitly.** The
  lift (scale + shadow) must **not** reduce the legibility of the block's own
  title — measure ink and contrast **during** the drag, not just at rest.
- **⚠️ `TimelineGrid.tsx` is 555/650.** If this contract would cross 650, that is
  **BLOCKED-ON-CONTRACT** — report it. Do **not** write a hard-cap
  justification; mission-17 already recorded a file shipping prose instead of a
  seam for exactly that reason.
- **Done criteria:** drag works on the timeline, a vertical drag still scrolls,
  a horizontal drag still pages, a kid cannot lift, a rejected drop snaps back;
  gauntlet green.

## Preflight

Run on every contract **immediately before its dispatch**, not when written — a
boundary is true at dispatch time, not writing time. Settle every judgement item
by running the command that settles it; this project has recorded **twice** that
they were surfaced and skimmed.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | **C1** | ✅ DONE `abbd61c`, merged | — | tests 350 → 354 |
| — | **C3** | ✅ DONE `8526245`, merged | — | no live verification — see its entry |
| — | — | no gate has run yet | — | — |

## Handoff log
- 2026-09-09 — **Mission opened.** Banner assembled and reported first; its
  brief **corrected a false premise of mine** (blocks live in
  `TimelineDayColumn.tsx`, not `TimelineGrid.tsx`) and **killed half a planned
  carve-out** (fact 3). Five contracts written, none dispatched.

## Delivery

**NOT DELIVERED — contracts written, nothing built.**

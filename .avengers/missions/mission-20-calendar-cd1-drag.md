# Mission: CD1 — long-press and drag to reschedule

**Project:** family-hub (Marshee)
**Status:** **ALL 5 CONTRACTS + F1 BUILT AND ON THE BRANCH. GATES RUNNING.**
Branch `claude/calendar-cd1`. **Nothing merged; nothing live.**
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
carries an `.env*` entry, so a fresh `git worktree` gets none — confirmed by direct
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
- **Status:** ✅ **DONE, merged.** Tests **350 → 378** (+28); combined with C1 the
  suite is now **382**. Import surface verified by Fury as exactly
  `./timelineLayout` and `./mealPlanDates` — no boundary reach.
- **⭐ It proved the WRONG approach produces a WRONG answer, rather than only
  asserting the right one works.** Concrete divergences, cited in the module's
  own comments: **Nov 1 2026** minute 1380 (intending 23:00) → calendar-component
  build gives `23:00 MST`, millisecond arithmetic gives **`22:00` — an hour
  early**; **Mar 8 2026** minute 1380 → calendar-component gives
  `Mar 08 23:00`, millisecond arithmetic gives **`Mar 09 00:00` — a full
  calendar day late.** That is the seam that has bitten this project roughly a
  dozen times, demonstrated rather than reasoned about.
- **Non-vacuity proven under UTC, not assumed.** Under UTC 25 of its 28 cases
  run and 3 skip — the 3 are the *ambient* DST cases, which cannot fire in a
  zone with no transition, while the **TZ-pinned divergence test still runs and
  passes**. Verified independently by Fury. The suite's UTC skip count moves
  7 → 10 for exactly that reason.
- **Two disclosed judgement calls, both defensible:** it did **not** import
  `calendarViewConfig.ts` (the caller already holds `columnDays`, so
  `columnDateForIndex` takes it as a parameter — keeping the import surface
  minimal), and it did **not** add a monolithic "resolve the whole drag"
  helper, leaving composition to C5 and matching how `timelineLayout.ts` itself
  is organised as many small pure functions.
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
- **Status:** ✅ **DONE, merged.** Tests **382 → 402** (+20). **Preflight was
  CLEAR** — 0 hard failures, nothing flagged, the first on this project.
- **It applied C1's lesson PREEMPTIVELY** rather than waiting for a gate: the
  swallow-clear is the first act of pointerdown (`:242-249`, decided at
  `:194-196` before either guard). **Proven RED by rewriting the function to the
  pre-C1 historical bug shape** — 2 failures, `true !== false` — then restored
  and confirmed **byte-identical by `diff`** before re-running green.
- **All four house gesture laws hold, each cited:** release reads a **ref**
  (`:358` `finalOffset = offsetRef.current`), `setPointerCapture` is
  **try/caught** (`:278-282`), the swallow-clear is first (above), and the
  thresholds are named constants (`LONG_PRESS_HOLD_MS = 400` `:66`,
  `LONG_PRESS_SLOP_PX = 8` `:72`).
- **The seam is used, not duplicated:** `isGestureClaimed: () => phase.current
  === "dragging"` is returned for `usePageSwipe` to consume.
  `usePageSwipe.ts` was **not touched** — confirmed by the diff.
- **Disclosed judgement call:** it added its **own** click-swallow tracking,
  because a completed drag's release is followed by a `click` on the same block
  (pointer capture retargets it) that must not also fire `onOpenEvent`. Not
  named in the objective, but implied — and building it into the hook stops C5
  reinventing the swallow pattern inline. Entirely inside its own file.
- **Honestly labelled limit:** its reasoning that native scroll and page-swipe
  survive the "pending" window is **reasoning, not browser measurement** — the
  hook never captures or prevents default until after it commits. C5's wiring is
  where that becomes measurable.
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
- **Status:** ✅ **DONE (`df4ef31`), merged — but see Fury's error below; the
  first merge attempt silently brought NOTHING and was reported as success.**
  Gauntlet green, **402 tests
  unchanged** (this contract added none and touched no test file, as required).
- **⭐ IT FOUND A SERIOUS DEFECT IN C4'S ALREADY-MERGED CODE and disclosed it
  rather than fixing it** — `useLongPressDrag.ts` was on its must-not-touch
  list. **Confirmed independently by Fury.** See F1 below.
- Wiring as contracted: one hook instance in `CalendarViews.tsx`,
  `isGestureClaimed` into `usePageSwipe` (`:280-284`), `getHandlers` threaded
  two levels to `TimelineDayColumn.tsx:228`. **No React context introduced.**
- **The kid gate is at `getHandlers={canManage ? … : undefined}`** — the same
  level `canManage` already gates the header's Add circle — so a kid's block
  never lifts at all rather than lifting and snapping back with a refusal.
  **The server's `MANAGER_ROLES` guard remains the real one.**
- **Rejection needs no manual revert, and the builder explained why rather than
  writing one:** `moveCalendarEvent` calls `refreshCalendarViews()` only on
  success, so a failed call leaves the underlying prop unchanged and
  `useOptimistic`'s transition settles back onto it automatically. The block
  snaps back with zero extra code.
- **The press-state rule was MEASURED, not asserted.** Title ink at rest
  **1755.94** → during drag **1935.92**, which is exactly `1755.94 × 1.05²` —
  the title got *larger*, not covered — with colour and opacity byte-identical,
  because the transform and shadow are applied **to the button itself, never a
  separate overlay layer**. That is the structural version of the rule Bryce
  approved, not a styled approximation.
- **Two instrument errors caught by the builder itself, both disclosed:** a CDP
  driver sending `buttons: 1` on `mouseReleased`, and — the one worth keeping —
  **a harness that imported from the MAIN repo's copy instead of the worktree's**
  (both paths coexist since worktrees nest on disk), silently exercising stale
  pre-C5 code and producing a false negative. Caught by grepping the built
  bundle for strings unique to its own edits. *"Exactly the class of 'verified
  the wrong tree' mistake this project has been bitten by before."*
- **⚠️ Sizes after this contract — `CalendarViews.tsx` has TEN LINES of
  headroom:** `CalendarViews.tsx` **640 total / 247 code (650 hard cap)**,
  `TimelineGrid.tsx` **599/213**, `TimelineDayColumn.tsx` **347/122**.
  **Captain's call, and it is now urgent rather than theoretical.**
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

### F1 — a tap permanently disables dragging (found by C5, confirmed by Fury)

- **Status:** ✅ **DONE `8035220`**, committed to `claude/calendar-cd1`.
  Preflight was re-run immediately before dispatch (0 hard failures, 1 judgement
  item — **settled by command, not skimmed**: 20 tests confirmed, and `release`
  confirmed asserted at `:56` for `idle` and `:96` for `dragging` but **never**
  paired with `pending`). Dispatched in the **main tree, not a worktree** —
  deliberately, given this mission's own worktree/`.env` trap and its lost-C5
  merge error, and this contract needs no database at all.
  *(Historical: Fury previously recorded F1 as "dispatched" when it never was —
  the second record error in this mission, same class as the first: a claim
  written before the action, then never reconciled.)*
- **The defect.** `nextLongPressPhase`'s `"pending"` branch
  (`src/lib/useLongPressDrag.ts`) handles `move`, `holdElapsed` and `cancel`,
  but **`release` falls through to `return "pending"`** — under a comment
  claiming the fallthrough is *"a stray extra pointerDown while already
  pending"*, which is an **overclaiming comment**: `release` is a real member of
  `LongPressDragEvent` (the `dragging` branch tests for it explicitly) and it is
  **the common case** — an ordinary tap is pointerdown → release before 400ms.
- **Why it is severe.** The phase never returns to `idle`, and this project's
  own design puts **exactly one hook instance per page**. So **any tap that
  opens an event disables dragging for the rest of the page's life.** Tapping an
  event is the single most common thing anyone does on this screen.
- **C5 reproduced it with a control**, which is what makes it a finding rather
  than a reading: ordinary tap → second long-press `claimed = false`; **control**
  — completed drag → second long-press `claimed = true`.
- **Boundaries:** may touch `src/lib/useLongPressDrag.ts`,
  `src/lib/useLongPressDrag.test.ts` · must not touch `src/components/**`,
  `src/lib/usePageSwipe.ts`, `src/lib/timelineDrag.ts`, `src/app/**`,
  `prisma/**`.
- **Fix the comment too.** It states a false reason for the fallthrough and is
  part of why the case was missed. This repo tracks overclaiming comments.
- **The test must be proven RED first**, and **ask why C4's 20 tests missed
  this** — the gap is that no case exercised `pending` + `release`. Whatever
  else that reveals about the phase machine's coverage, close it: enumerate
  every (phase, event) pair and assert each, so a missing case cannot hide again.
- **Done criteria:** an ordinary tap returns the phase to `idle`; a full
  (phase × event) matrix is asserted; red-then-green evidence; gauntlet green.
- **Outcome.** All met. Red first (`pass 20 / fail 2` against the unfixed
  source), then green; non-vacuousness re-proven *after* committing by stashing
  the fix back out and watching the matrix go red again. Tests **402 → 404**;
  the matrix asserts all **15** cells. `useLongPressDrag.ts` **409 total /
  ~181 code** — over the soft cap on totals, well under on code, so **not** a
  split candidate under STRUCTURE.md's amended clause; not split.
- **⚠️ The answer to "why did C4's 20 tests miss this" generalises, and is the
  finding worth keeping.** Coverage was **per-axis, not per-cell**: every
  *phase* had a test and every *event* had a test, so both axes looked fully
  covered while the actual grid had an unasserted cell — and the defect lived
  in exactly that cell. **A state machine tested by rows and columns is not
  tested.** The builder hand-checked all 15 cells against the source and found
  exactly one wrong pair, the one this contract targeted; no other pair was
  incorrect. Fury verified the commit, the boundary audit, `tsc` and the
  404-test count independently rather than trusting the report.

### Gate pass 1 — what both gates found, and the one pattern behind it

**Both gates re-ran all six legs green** (404 tests, 34 routes) and both returned
a **clean boundary audit** across all 10 source files. Every blocker is a
correctness or structure finding, not a failed leg. Vision created **zero**
fixtures and took one read-only count: `Task 0, TaskPerson 0, CalendarEvent 4,
User 5` — exactly baseline.

**Vision's three, each measured with a positive control:**

1. **Any leftward pixel of drag moves the event to the previous day.**
   `CalendarViews.tsx` resolves the column with `floor` **from the starting
   column's left edge**, so `dx = -0.01` already lands one day earlier while
   `+1` day needs a full column width. Measured at Week's real 47.28px column:
   `dx=-1 → -1 day`, `dx=+46 → 0 days`. Real drags essentially never end at
   exactly `dx = 0`, so **roughly half of all intended vertical-only drags land
   on the wrong day** — and the optimistic update makes it look deliberate. Day
   view is immune (one column); 3 Day and Week are not.
2. **Midnight-crossing timed events are draggable despite being out of scope,
   and both fragments compute a wrong time.** `belongsInAllDayRow` routes them
   into `timed`, so C5 attached handlers to both clipped fragments; neither the
   payload nor `onDragEnd` reads `clippedStart`/`clippedEnd`. Measured: dragging
   the late fragment down an hour shifts it **120 minutes** and silently
   discards the other day's portion; dragging the early fragment **up or down**
   an hour both save the same earlier time, because `clampStartMinutes` assumes
   single-day containment. **Present in live data** — 1 of the 4 real events has
   this shape (count only, per the register).
3. **An ordinary mouse mis-click leaves the gesture permanently claimed.** The
   hold timer checks the phase but **not that the pointer is still down**, and
   capture is taken *after* `holdElapsed` — so once the cursor leaves the block
   no `pointermove` or `pointerup` reaches the hook, and the timer claims a drag
   with nothing held. Measured in headless Chrome against the **real hook**:
   positive control (press-hold-move-release) works; yanking the mouse away
   leaves `claimed=true` with no pointer down; **touch is immune** (implicit
   capture). From that stuck state the next press writes a **fabricated delta** —
   a straight-down 24px drag reported `dx=+10, dy=−6` — *and* fires the click
   that opens the detail sheet on top of it. CV6's page-swipe is dead for the
   rest of the page's life.

**Captain's two — and both are Fury's contract errors, not the builders'.** In
each case the may-touch set made the compliant route unreachable, so the builder
obeyed the boundary by copying, and disclosed it. **A boundary is a threshold
you can satisfy by copying** — `color.ts` already carries that lesson on its
face, and this is now the fourth and fifth instance on this arc.

1. **A fifth `withTimeZone`**, byte-identical to the four STRUCTURE.md already
   carries as debt, in the one clause that names a specific helper and a
   specific count. The new copy's header cites the debt *as a pattern*, which is
   what the clause's "not a pattern to cite" language exists to stop.
2. **A third copy of the gesture machine's shared elements** — capture guard,
   swallow decision, pointer-down decision, guarded `setPointerCapture` — while
   the hold machine itself is legitimately different. Captain is explicit that
   this is a *partial* third copy and a narrower reading is defensible, but its
   harm test is decisive: a bug in the swallow decision now needs **three** hand
   edits, and **the divergence the rule predicts is already live** —
   mission-19/F1's `pointerdown` clear is in `usePageSwipe.ts` and
   `useLongPressDrag.ts` and **still absent from `SwipeActions.tsx`**. Fury
   confirmed that independently: `SwipeActions.tsx` arms the flag at `:116`/`:159`
   and clears it only inside the click handler at `:149`, so a swipe that
   produces no following click leaves it armed to eat the next tap. **That is the
   standing "eaten tap on Inventory and Shopping" question in CLAUDE.md, which
   until now was only ever labelled reasoning rather than measurement.**

### F2 — the two component blockers

- **Objective.** Fix Vision's blockers 1 and 2, plus the undismissable error.
- **Boundaries:** may touch `src/components/CalendarViews.tsx`,
  `src/components/TimelineDayColumn.tsx`, and any new component file extracted
  from them · must not touch `src/lib/**`, `src/app/**`, `prisma/**`,
  `package.json`, `.github/**`.
- **(a) Column resolution must be symmetric.** Resolve from the column's
  **centre**, not its left edge, so the threshold is half a column in each
  direction. *(Vision's prescription is recorded separately from its finding —
  on this arc a gate's finding has three times stood while its prescription was
  wrong. Verify the prescription before adopting it.)*
- **(b) Honour the declared scope: a clipped fragment must not be liftable.**
  Withhold the drag handlers when `slot.block.clippedStart || clippedEnd`. Do
  **not** attempt to make midnight-crossing drag genuinely correct — that needs
  `onDragEnd` to work from the real `startAt` and `clampStartMinutes` to stop
  assuming one day, and it is **out of scope per the mission Brief**.
- **(c) `dragError` must be dismissable** — today it is cleared only by the
  *next* drag, so a refusal sits above the calendar across view switches and
  paging.
- **⚠️ (d) The cap.** `CalendarViews.tsx` is at **640 of a 650 hard cap**.
  Measure with `node .claude/skills/avengers/preflight.mjs`'s canonical counter
  **before and after**. If your change would cross 650, **extract first, in this
  same contract** — the seam is the **sheets/modal block**, not the render
  switch (Captain's CV5 note: the switch is where future growth lands). Do
  **not** write a hard-cap justification instead; mission-17 already recorded a
  file shipping prose instead of a seam for exactly that reason, and Fury
  recorded before dispatch that crossing 650 here is BLOCKED-ON-CONTRACT.
- **Evidence:** for (a), a table of resolved column indices across a range of
  `dx` either side of zero at a real column width, showing symmetry; for (b),
  proof a clipped fragment renders identically but carries no handlers; both
  line counts for every file touched; the six-leg gauntlet.

### F3 — the stuck-gesture blocker

- **Objective.** Fix Vision's blocker 3: the hold timer must not claim a drag
  when the pointer is no longer down.
- **Boundaries:** may touch `src/lib/useLongPressDrag.ts`,
  `src/lib/useLongPressDrag.test.ts` · must not touch `src/components/**`,
  `src/lib/usePageSwipe.ts`, `src/lib/timelineDrag.ts`, `src/app/**`,
  `prisma/**`, `package.json`, `.github/**`.
- **The structural fix is preferred over the guard.** Vision notes that
  capturing at `pointerdown` rather than at `holdElapsed` makes both
  `pointermove` and `pointerup` unconditionally reachable, which removes the
  whole class rather than patching one exit. Evaluate that first; fall back to
  an explicit pointer-is-down check only if capture-at-pointerdown breaks the
  scroller or the page-swipe hand-off.
- **Also add unmount cleanup** — the hook has no `useEffect` teardown at all, so
  a pending hold timer survives the hook unmounting. Benign in React 19 on its
  own, but it is the same missing teardown that makes this blocker possible.
- **Reproduce before fixing.** Vision's harness bundled the real hook with
  esbuild and drove it in headless Chrome, verifying the bundle really contained
  the hook by grepping it for `LONG_PRESS_HOLD_MS = 400`. Reproduce the stuck
  state that way, with the **positive control** (press-hold-move-release works)
  and the **touch control** (touch is immune) both present — a stuck reading
  without those two controls proves nothing.
- **Evidence:** the reproduction before, the same harness clean after, both
  controls in both runs, the (phase × event) matrix still green, six-leg
  gauntlet.

### F4 — the fifth copy, and two honesty fixes

- **Objective.** Close Captain's blocker 1 outright, and remove two comments
  that claim more than the code does.
- **Boundaries:** may touch `src/lib/testing/withTimeZone.ts` **(new)**,
  `src/lib/scheduleWindow.test.ts`, `src/lib/timelineLayout.test.ts`,
  `src/lib/calendarDates.test.ts`, `src/lib/scheduleWindowStateRefresh.test.ts`,
  `src/lib/timelineDrag.test.ts`, `src/lib/timelineDrag.ts`,
  `src/app/actions/calendar.ts`, `package.json`, `.github/workflows/ci.yml` ·
  must not touch `src/components/**`, `src/lib/useLongPressDrag*`,
  `src/lib/usePageSwipe*`, `prisma/**`.
- **(a) Migrate all five copies**, not just the new one — that is the clause's
  stated intent and it closes the debt outright rather than moving it.
  **⚠️ The glob entries ship in the same commit**: `package.json`'s test script
  **and** `.github/workflows/ci.yml`'s **two** timezone steps are a
  hand-enumerated, non-recursive list, so a test under `src/lib/testing/` would
  otherwise vanish from `npm test` **and CI while the suite still reported green
  at a lower count.**
- **(b) `calendar.ts`'s `rrule` guard comment claims a unit test that does not
  exist.** Captain's ruling, which I adopt: **delete the false sentence, do not
  build the test** — extracting a two-line check into a lib module purely to
  make it testable is ceremony, and the paragraph's other claims are accurate
  and worth keeping.
- **(c) `timelineDrag.ts`'s `pixelsFromMinutes` is dormant and its justification
  has expired** — it names C5 as its reviving consumer, and C5 shipped without
  it (the preview is a raw `translate`). Delete it and its tests, or rewrite the
  comment to name a real future consumer. Captain's own CV2 ruling arriving on
  schedule: a library built a phase ahead is legitimately dormant *until the
  consuming contract ships without it.*
- **Evidence:** proof the migrated tests actually run (a count that moves when
  you break one on purpose), the diff of both CI steps, six-leg gauntlet at an
  unchanged 404.

### HELD — the gesture de-duplication (Captain's blocker 2)

**Not dispatched. Bryce's decision**, because Captain offered a legitimate
either/or rather than forcing it: run the migration `STRUCTURE.md` already
schedules (one contract earlier than planned), or narrow the clause — Captain
drafted the exact amendment text. Fury's recommendation is to run it, on the
grounds that it is no longer hygiene: it is the contract that carries
mission-19/F1's fix into `SwipeActions.tsx` and stops Inventory and Shopping
eating taps. **Its final step cannot be verified by any instrument here** —
synthetic PointerEvents cannot settle that gesture, recorded twice on this
project — so it ends with Bryce checking it on a real phone.

## ⚠️ FURY'S ERROR: "Already up to date" is a FAILURE signal, not a success one

**I merged the wrong branch, deleted the right one, and recorded C5 as merged
when the tree contained none of it.**

The harness reported C5's worktree branch as `worktree-agent-ae2f3f7662de0f29b`,
but the builder had committed to **`claude/calendar-cd1-c5-wire-up`**. I merged
the former — which still pointed at the old base — got **"Already up to date"**,
read it as success, then **deleted both branches** and committed a mission-file
entry saying C5 was merged. `grep -c useLongPressDrag src/components/CalendarViews.tsx`
returned **0**. The work existed only as an unreferenced commit object.

Recovered by merging the commit sha directly (`git merge df4ef31`); the tree now
matches C5's reported sizes exactly (640 / 599 / 347) and the gauntlet is green.

**Two lessons, both cheap and both mine:**
1. **"Already up to date" on a merge you expect to bring changes is a failure
   signal.** I read it as confirmation. The check that settles it costs one
   command: grep the tree for a string unique to the work.
2. **Verify the merge landed, do not trust the merge command** — the same shape
   as mission-9's *"verify a file edit landed; don't trust the write"*, and
   **the same shape as the mistake C5 disclosed one report earlier** (its harness
   importing the main repo's copy instead of the worktree's). It flagged that
   class explicitly, and I committed it minutes later.

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
| — | **C2** | ✅ DONE, merged | — | tests 350 → 378; suite now **382** |
| — | **C4** | ✅ DONE, merged | — | tests 382 → **402** |
| — | **C5** | ✅ DONE `df4ef31`, merged | — | found a C4 defect; `CalendarViews.tsx` at **640/650** |
| — | **F1** | ✅ DONE `8035220`, on branch | — | tests 402 → **404**; per-cell matrix, 15 cells |
| 1 | **Vision** | ⛔ **BLOCKED** | **3** | wrong-day on any leftward pixel; midnight-crossing fragments; a stuck mouse gesture. Six legs re-run green; boundary audit clean; zero fixtures created |
| 1 | **Captain** | ⛔ **BLOCKED** | **2** | a 5th `withTimeZone`; a 3rd copy of the gesture machine's shared elements. Six legs re-run green; boundary audit clean |
| 1 | **Strange** | _deferred to the fixed tree_ | — | deliberately not run on a tree with 3 known correctness blockers — CV2's lesson: a PASS that predates a fix covers the old tree |
| 2 | **F2 / F3 / F4** | _dispatched_ | — | parallel, disjoint boundaries (verified by command) |

## Handoff log
- 2026-09-09 — **F1 dispatched and DONE (`8035220`), gates opened.** Preflight
  re-run at dispatch time per this file's own rule; both judgement items settled
  by command. Verified in the tree by Fury (commit content, boundary audit,
  `tsc`, 404 tests) rather than trusted from the report. Branch pushed and a PR
  opened **before** the gates finish, deliberately: CV6 established that
  synthetic touch in this environment does not honour `touch-action` at all, so
  touch-vs-scroll arbitration on a real finger is the one thing no gate here can
  measure — a preview in Bryce's hands during the gate rounds is the only
  instrument that reaches it.
- 2026-09-09 — **Gate sequencing decided.** Vision ‖ Captain, then Strange.
  Not all three in parallel: mission-16 recorded parallel gates on the shared
  dev branch contaminating each other's evidence (a gate's own fixture rows made
  a broken scroll anchor read as *fixed*, across 16 runs and two gates), and CD1
  is the first mission since CT2 with a real database write path. Captain is
  read-only and creates no fixtures, so it is safe alongside Vision.
- 2026-09-09 — **Mission opened.** Banner assembled and reported first; its
  brief **corrected a false premise of mine** (blocks live in
  `TimelineDayColumn.tsx`, not `TimelineGrid.tsx`) and **killed half a planned
  carve-out** (fact 3). Five contracts written, none dispatched.

## Delivery

**NOT DELIVERED.** All six contracts are built and on `claude/calendar-cd1`;
**PR #26 is open as a draft**, nothing merged, nothing live. Gate pass 1:
**Vision BLOCKED (3), Captain BLOCKED (2), Strange not yet run.** Fix contracts
F2–F4 dispatched; Captain's second blocker is held pending Bryce's decision.

*(This section previously read "contracts written, nothing built" while line 4
said all contracts were built — **Captain caught it as a live self-contradiction
in one file**, the exact class mission-19 recorded costing two days and a
near-duplicate build. Fury's error: the status header was updated and this line
was not.)*

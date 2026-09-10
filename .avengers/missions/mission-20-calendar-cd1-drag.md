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

### Pass 2 — what the fixes found that the gates had not

**Verified by Fury on a clean tree**, not taken from the reports: six legs
green, **34 routes** (baseline), 403 tests (the −1 is F4's predicted deletion),
boundary audit 19 files with zero forbidden paths.

- **⚠️ Two builders reported 33 routes and one reported 34 — and the 34 was
  right.** F2 and F3 measured while other builders held uncommitted work in the
  shared tree; the clean-tree count is 34, matching baseline. **A build measured
  on a tree carrying other contracts' partial work is not a measurement.** What
  makes this a good outcome rather than a near miss is that F2 *reported the
  anomaly instead of explaining it away*, and separately **amended its own
  commit message after catching itself claiming "34 routes" to match the stated
  baseline without having measured it** — caught before it became a record
  rather than after.
- **F3 upgraded Vision's own severity.** Vision reproduced the stuck gesture via
  a deliberate mis-click. F3, building the harness, found
  `realisticSwipeThroughBlock`: a swipe that *starts* on a block and carries the
  pointer outside its bounds — **completely ordinary CV6 usage** — hits the same
  class. So the defect was reachable in normal use, not only by an odd gesture.
  It adopted the **structural** fix (capture at `pointerdown`) rather than the
  guard, which removes the class instead of patching one exit, and proved it
  against the real hook with the positive control and the touch control present
  in **both** the before and after runs.
- **F2 corrected a gate prescription that named a field which does not exist.**
  Vision said to read `slot.block.clippedStart`; `TimelineGrid.tsx` drops
  `clippedStart`/`clippedEnd` when it builds the plain `TimelineBlock`, and that
  file was outside F2's boundary. Found via a `tsc` failure, then traced.
  **Fourth instance on this arc of a gate's finding standing while its
  prescription was wrong** — the contract told it to verify rather than adopt,
  and that instruction paid.
- **F4 proved the glob entry reachable rather than assuming it.** It added a
  temporary smoke test under `src/lib/testing/`, watched the count move
  403 → 404, broke it to confirm it could go red, then deleted it — because the
  recorded trap is a file silently dropping out of a hand-enumerated glob while
  the suite still reports green at a lower count. It also **stated the −1 test
  delta in advance** and matched it.
- **⚠️ A CI-correctness trap, caught and then verified by Fury independently.**
  Adding `src/lib/testing/*.test.ts` to the globs creates a glob that currently
  matches **nothing**. Under this shell (`zsh`, `NOMATCH`) that is a hard error —
  and it is what a maintainer running the leg by hand will see. Under `sh`
  (which `npm` invokes) and `bash` (which GitHub Actions uses) a non-matching
  glob passes through as a literal argument and Node's test runner resolves it
  to zero files. **Confirmed by running both legs under `bash` at exit 0 with
  403 tests** — so CI does not break on merge. Anyone re-running those legs from
  a zsh prompt must wrap them in `bash -c`.

### Open findings carried forward — NOT fixed, recorded deliberately

From Vision pass 1, all NOTES rather than blockers:

- `moveCalendarEvent` **re-validates people it is not changing** — it passes
  `userIds` as both `input.userIds` and `alreadyAssignedUserIds`, so the
  deactivation branch can never fire and `validatedPeople`'s `findMany` is a
  round trip with a fixed outcome on **every drag**.
- `isValidDate(newStartAt)` **does not bound the value** — a crafted POST near
  the `Date` maximum makes `endAt` an Invalid Date, which `validateEventInput`
  passes (NaN comparisons are false) and which reaches Prisma.
  Manager-authenticated and self-inflicted, so low severity, but it is the only
  path not bounded to a single day.
- **Rescheduling has no keyboard or assistive path.** The detail sheet's edit
  form remains an alternative so nothing is unreachable, but DESIGN.md is
  explicit about not making a gesture the only route.
- **The server guard could not be exercised live, and Vision named that rather
  than substituting for it.** `moveCalendarEvent` imports `dal.ts`
  (`server-only`), unreachable from a plain `tsx` script; minting a session JWT
  is correctly blocked by the environment. Without a positive control a
  no-cookie replay would prove nothing. What *was* verified by reading: all five
  exports guard, `moveCalendarEvent`'s guard is byte-identical in shape to the
  three shipped write actions, the signature carries **no end parameter** so a
  client cannot supply a duration, and `durationMs` is read from the stored row.
- From F4: **`STRUCTURE.md` names `scheduleWindowState.test.ts`** in the
  test-helper clause; the file that actually held the helper is
  `scheduleWindowStateRefresh.test.ts`. F4 migrated the right file and flagged
  the constitution rather than editing outside its boundary. **That clause now
  needs a substantive update anyway — the debt it describes is closed** — so it
  goes to Bryce as an amendment rather than a silent edit.

### Gate pass 2 — verdicts, and the one thing the fix itself broke

**Captain: PASS**, 0 blockers. **Vision: BLOCKED**, 1 new blocker — introduced
by F3 and invisible to all three builders. All three of Vision's pass-1
blockers are **genuinely closed**, each with a positive control and a pre-fix
run proving the instrument could go red.

**The new blocker — `useLongPressDrag.ts:368-374`.** F3's fix (capture at
`pointerdown`) was right and closed a severe bug, but capture **retargets the
compatibility `click`** to the capturing element. So on a gesture that was never
a drag — press, move ≥8px so the slop cancels the hold, release with the cursor
**outside** the block — the click now lands on the block and **opens the event
detail sheet, which carries Edit and Delete.** Reproduced in **4 of 8
scenarios**, identically with a `<div>` and a real `<button>`. **Touch is
unaffected** (measured pre vs post as byte-identical, with a passing tap
control) because touch already had implicit capture. **Strictly better than
pre-fix**, which left the gesture permanently stuck — so a residual, not a
regression. F5 dispatched.

**How Vision closed its own three, since "closed" is a claim like any other:**

- **Asymmetric columns:** an unclamped sweep of **99,281 samples per variant** —
  **old 100.0% asymmetric, new 0.0%**. Edge clamping intact; Day view immovable
  at ±1000px. It also re-derived F2's four numbers exactly (threshold ±23.640).
- **Clipped fragments:** F2's substituted fix **proven equivalent rather than
  accepted on argument** — `blockGeometry` reads only `startAt`/`endAt`
  (`Pick<TimelineEvent, "startAt"|"endAt">`) and `toTimelineEvent` copies both by
  reference, so the second call is byte-identical to the grid's own in every
  case run (5/5, same `day` object). Positive control: **3 ordinary blocks still
  draggable**, including a 20:00→midnight event (correctly *not* clipped).
- **Stuck gesture:** pre-fix reproduced, post-fix clean, with the positive
  control and **both hand-offs** present in both runs; bundles verified
  non-vacuous (`targetRef` present in pre only). The unmount cleanup was proven
  with a **real `root.unmount()`**, not a simulation.
- **`CalendarSheetsHost` exercised** through the exact `sheetsRef.current?.openX()`
  shape the parent uses, against the real subtree: all five sheets open with real
  content, close on Escape, **reopen with state reset**, and are independent.
  Negative control: zero dialogs at rest. The ref is null during first render and
  populated after commit — harmless, because every call site is an event handler
  (grepped: none in render, none in an effect).

**Vision cleared the CI merge risk independently rather than taking it from
Fury** — it wrote both CI steps to a file and ran them under `bash -e` exactly
as GitHub Actions invokes them (exit 0 with the non-matching glob passing as a
literal), then in an isolated tree proved the new glob entry is **reachable**:
empty dir → 2 tests, add one → 3, break it → **exit 1**.

**Two self-corrections worth recording.** Vision's first route grep read **33**
because it missed the `┌` prefix on `/`; it corrected to 34 by reading the raw
table. And its first sheet run showed three sheets failing — **its own fixture**
used `dueAt` and omitted `isMine` where `CalendarTaskView` has `dueDate`, which
crashed React and unmounted the tree. **Caught by checking whether the tree was
still alive rather than reporting the failure.** An instrument that has crashed
the page reports "broken" for everything.

### ⚠️ The coverage gap this mission is shipping, named rather than hidden

Vision's NOTE, and it is the most important non-blocker here. F3's claim that
the 15-cell matrix needed no change is **correct** — that file covers only pure
decision functions, with no renderer and no DOM. Which means **the mission's
highest-risk structural change ships with zero committed regression coverage**:
the stuck-gesture class, capture timing and unmount cleanup are verified only by
ephemeral harnesses (Vision pass 1's, F3's, Vision pass 2's), **none committed**.

This is the same class as C4's `recipeFilters.test.ts`, which CLAUDE.md records
as claimed-to-exist and never committed. It is **not** a defect and **not** F3's
fault: the project has no DOM test harness at all, so closing it is an
infrastructure decision, not a contract. **Recorded here so the next gesture bug
is not a surprise.**

### Captain's pass-2 notes — the two that change what happens next

- **⚠️ Its own trip condition "fired, was honoured to the letter, and is NOT
  discharged in effect."** F2 extracted exactly as required, and
  `CalendarViews.tsx` still sits at **645 of 650 — five lines of headroom** —
  after growing **+149 in this one mission**. Captain's diagnosis is that the
  rule is at fault, not the builder: **a trip condition keyed to an *action*
  ("extract first") is satisfiable by the smallest qualifying action** — the
  same shape as STRUCTURE.md's retired `parseLocalDateString` rule, one level up.
  It should be restated as an **outcome**, not an action. Operationally: **any
  pass-3 fix needing six lines in that file breaches the hard cap.** F5 was
  deliberately scoped away from it.
- **The seam worth taking is `onDragEnd`'s drop-resolution composition, and the
  argument is coverage, not size.** ~56 total / ~20 code, composing five
  functions that already live in `timelineDrag.ts` (180/**41**, enormous
  headroom), needing **no ref** because it moves logic rather than ownership.
  **Vision's blocker 1 — the asymmetric column resolution — lived in exactly
  this expression, and `npm test` structurally could not reach it**: `grep` for
  `startColumnCenterPx` returns only `CalendarViews.tsx`, while the pure helpers
  it calls carry 329 lines of tests. Third instance of the `VIEW_CONFIG` lesson
  STRUCTURE.md already records twice. A pure `resolveDrop(payload, dx, dy, days)`
  closes the coverage hole and takes the file to ~590 in one move.

**Fury's third contract error of this mission, same class as the other two.**
F2's brief pointed it at "the sheets seam" as though it were untaken —
**mission-19/C1 had already extracted `CalendarSheets.tsx`**, confirmed by
`git log --diff-filter=A`. So only residual state remained, which is why the
extraction came out thin (23 net lines) and ref-shaped. One `git log` on the
file would have settled it before dispatch.

### ⛔ OPEN BLOCKER 1 (Vision pass 3) — the 8px boundary disagreement

**`useLongPressDrag.ts:148` aborts at `|dx| > 8`; `usePageSwipe.ts:94` locks at
`|dx| >= 8`. At exactly 8 pixels both are true.** `usePageSwipe` takes
`setPointerCapture` **on the wrapper** while the long press is still `pending`;
the block is a descendant, so it leaves the event path and its `pointerup`
**never fires again**. Nothing clears the hold timer, which fires 400ms later
into a still-`pending` phase and claims a drag that can never end.

Measured on an **ordinary completed page-swipe that began on a block**:
```
release:      ["pageRight"]                   claimed=false
700ms later:  ["pageRight","dragStart:A"]     claimed=TRUE   activeDrag {dx:0,dy:0}
next swipe:   []            ← CV6 page-swipe dead for the rest of the page's life
```
**Then it writes.** From that stuck state a tap with a 12px slip clears both
short-circuits (`CalendarViews.tsx:208`, `:245`) and becomes a snapped 15-minute
reschedule — `moveCalendarEvent` **writing to the family's real calendar** — with
the detail sheet opening on top. Control: the identical gesture on a healthy
hook produces `[]`.

**Mechanism pinned rather than inferred:** `dx=7` completes, `dx=8` sticks,
`dx=9` aborts cleanly; with `usePageSwipe` unwired, `dx=8` resolves cleanly — so
the capture steal is required.

**Dated by measurement, not reasoning: F5 and F3 are both innocent.** Reproduced
byte-for-byte on the pre-F5 (`908e9eb`) and **pre-F3** (`0bc8136`) bundles, on
mouse and touch, with non-vacuity proven each time. It arrived with C4+C5 and
survived Vision's own passes 1 and 2 — *"I own missing it twice."*

**Not verifiable here:** on a trackpad `clientX` is an integer, so a swipe
sampling exactly ±8 is ordinary and **desktop reachability is measured**.
Whether a real finger at DPR 2/3 produces exactly `8.000` CSS px is
**unmeasurable in this environment** (synthetic touch ignores `touch-action`,
and there is no device). Bryce's laptop and the wall tablet both reach it.

**Prescriptions, labelled and unverified** (a gate's prescription has been wrong
four times on this arc, including one of Vision's this mission), in its order of
confidence:
1. **Guard the timer, don't align the thresholds** — refuse to claim unless this
   hook still holds capture. Closes the **class** (anything that steals capture,
   ever), not one pixel. *This is the guard F3 evaluated and set aside for the
   structural fix — and the structural fix does not cover a capture steal.*
2. Align the boundary (`>=` in `hasExceededLongPressSlop`). Cheapest, and
   correct only while the block still holds capture — most fragile.
3. `usePageSwipe` refuses to lock while a long press is pending — needs a second
   seam beside `isGestureClaimed`, which C4's contract forbade.

**⚠️ This IS Captain's held blocker 2.** Two machines disagreeing about a
boundary is what "the same gesture machine copied three times" produces, and
Captain explicitly asked whether `DIRECTION_LOCK_PX` and `LONG_PRESS_SLOP_PX`
are one fact or two. **This defect is what "nobody decided" looks like in
production.**

### ⛔ OPEN BLOCKER 2 (Strange pass 1) — a refusal rendered in a reserved token

`CalendarViews.tsx:607-618` renders the drag-rejection banner in `--danger`.
DESIGN.md: *"warn for user mistakes, danger for destructive or urgent… Reserving
red keeps red meaningful."* **All five strings this banner can show are refusals
or invalid input** (`calendar.ts:323,327,343,346,349`) — none destructive, none
urgent, and the first ("Only parents can do that.") is the rule's own worked
example. Measured `rgb(166,58,42)` light / `rgb(232,144,120)` dark; **contrast is
fine — the token is the defect.**

**The decisive comparison, confirmed by Fury:** `EventDetailSheet.tsx:130` — the
calendar's **own** error surface, same action family, **byte-identical** "Only
parents can do that." — renders `bg-warn-soft` + `text-warn`. The house pattern
appears in **25 files**; `text-danger` on a `role="alert"` in **2**. Side by side
the house pattern reads as a contained notification and this one as a naked red
sentence with a bare `×`, no container.

**And the banner's comment cites a precedent that does not exist** — it claims
`PutAwayButton.tsx`'s `{error && <p role="alert" …>}`; that file contains
**zero** `role="alert"` (Fury verified: `grep -c` → 0). The third overclaiming
comment found in this mission.

It also puts a second `--danger` element on the same screen as the now-line,
**whose DESIGN.md exception rests explicitly on `--danger` being reserved.**

*Fix (prescription): the house pattern already used 25 times —
`rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn` — keeping the
44×44 dismiss button, retinted `text-warn`. A token/class change inside the
existing 12 lines, so `CalendarViews.tsx` stays at 645/650.* **Do not cite
`NutritionSection.tsx:252` as licence — it is the same drift, grandfathered.**

### Strange pass 1 — what PASSED, and the notes

**DESIGN.md's press-state rule, which names CD1 by name, PASSES structurally.**
Title extent goes **1366.5 → 1506.57** and **1577.81 → 1739.54** — exactly ×1.05²
in all four theme/view combinations — with colour, weight and `opacity: 1`
byte-identical. The transform sits on the `<button>` itself, never an overlay,
**so the label survives by construction rather than by luck.** The rule was
written after mission-19's blanked label and the builder built to it; it worked.

Also measured clean: the 44px timeline exception's boundary (b) holds during the
lift (the 2px seam narrows to **1.45px** but never closes, every centre still
resolves to itself); no `line-through`, no `opacity-*`, past blocks drain to
`border-muted text-muted` at `opacity: 1`; `z-30` over the sticky header works as
its comment claims; **`CalendarSheetsHost` is visually inert** and sits under no
`backdrop-filter` ancestor, so mission-19's `position: fixed` trap is not
reachable; and the optimistic move adds **no fourth confusable state**.

**NOTES:**
1. **The lift has effectively no elevation cue in dark mode.** `shadow-xl` is
   `rgba(0,0,0,0.1)` — black on a `#1c1b16` ground. Light peaks at delta 99/765
   (**1.368:1**); dark peaks at delta 10/765 (**1.033:1**) and is zero by 30px.
   So in dark the entire confirmation the 400ms hold succeeded is `scale(1.05)` —
   **+2.19px wide, +1.1px tall** on a Week-width 30-minute block. It
   under-communicates; it does not lie, hence NOTE. **Strange drafted a DESIGN.md
   amendment** (below) since no rule covers elevation and Month drag will hit it.
2. **⚠️ ESCALATED TO BRYCE BY STRANGE — nothing says where the block will land.**
   The block translates by the raw pixel delta while the commit snaps to 15
   minutes and resolves the column at half-width. Measured: the block sits at
   rail minute **835.6 = 13:56** while its own label still reads **"9 AM – 12
   PM"** — five hours apart inside one control — and the true landing is a third
   value (14:00, post-snap). Horizontally near the ±half-column threshold it
   straddles two days with nothing saying which it lands on. Strange: *"the label
   is stale rather than false… but a reasonable reading calls a five-hour
   disagreement inside one control a semantic failure, and that call is Bryce's,
   not mine."*
3. **The banner leaves the hour rail 44px over-tall** until something re-measures
   it — `TimelineGrid.tsx:288-331` re-runs only on `[columnDaysKey]` and window
   resize, and pins the height imperatively. The banner is the first thing in the
   app to change the height above the timeline **post-mount**. `overlapPx`
   0 → 44 → 0 after a resize. **Strange had this filed as a BLOCKER until its own
   reachability sweep overturned it** — 16 page-scroll positions still resolve
   that block. Self-heals on any rotate, resize, or view switch.
4. Rescheduling is **gesture-only** — nothing unreachable (tap → sheet → Edit),
   but the fast path has no keyboard or assistive equivalent.
5. **Horizontal travel in Day view does nothing but clip the block** — one
   column, so the index clamps, yet the block still translates and the scroller
   clips it: **28% of its width** lost at a realistic 80px thumb wander.

**Strange caught its own instrument twice**: its first banner measurement
**remounted** rather than live-toggling and produced a false clean reading; and
NOTE 3 was a blocker until its own sweep overturned it. Zero fixtures created —
two read-only counts only, all rendering from synthetic fixtures in a component
harness, `prefers-color-scheme` forced **in both directions on every capture**
and verified.

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
| 2 | **F2** | ✅ DONE `b1de9c9` | — | symmetric columns; clipped fragments unliftable; dismissable error; **extracted `CalendarSheetsHost.tsx`** (640→668 would have breached the hard cap) → 645 |
| 2 | **F3** | ✅ DONE `3018dc1` | — | capture at pointerdown — the structural fix, not a guard; unmount cleanup; **found the bug is reachable by ordinary use, not just a mis-click** |
| 2 | **F4** | ✅ DONE `0bc8136` | — | 5 `withTimeZone` copies → 1; all 3 glob sites; 2 false comments deleted. Tests 404 → **403** (predicted delta) |
| 2 | **Fury verification** | ✅ clean tree | — | six legs green; **34 routes** (the 33 readings were dirty-tree noise); boundary audit 19 files, 0 forbidden |
| 2 | **Captain** | ✅ **PASS** | 0 | blocker 1 closed outright; blocker 2 unchanged and correctly held. 11 notes |
| 2 | **Vision** | ⛔ **BLOCKED** | **1** | all 3 pass-1 blockers genuinely closed; **one NEW blocker introduced by F3's own fix** |
| 3 | **F5** | ✅ DONE `1f6090b` | — | tests 403 → **406**; the capture-release decision made pure and matrix-tested |
| 3 | **Vision** | ⛔ **BLOCKED** | **1** | ⚠️ **BUDGET EXHAUSTED — 3 of 3 passes.** Pass-2 blocker closed; blocked on a **pre-existing** defect it owns missing twice |
| 1 | **Strange** | ⛔ **BLOCKED** | **1** | 2 passes remain. Press-state rule (which names CD1) **PASSES structurally**. 5 notes, 1 escalated to Bryce |

**⛔ MISSION STOPPED AND SURFACED TO BRYCE**, per the doctrine's budget rule.
Two blockers open. Captain PASS. Nothing merged.

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

**NOT DELIVERED — STOPPED AT THE BUDGET AND SURFACED.** Ten contracts built
(C1–C5, F1–F5) and on `claude/calendar-cd1`
(C1–C5, F1, F2–F4); **PR #26 is open as a draft**, nothing merged, nothing
live. Gate pass 1: **Vision BLOCKED (3), Captain BLOCKED (2)**. All five
blockers fixed in pass 2; **Vision and Captain are re-gating, Strange has not
yet run.** Captain's second blocker (gesture de-duplication) is **held pending
Bryce's decision**, and the touch-vs-scroll question is held pending his phone.

*(This section previously read "contracts written, nothing built" while line 4
said all contracts were built — **Captain caught it as a live self-contradiction
in one file**, the exact class mission-19 recorded costing two days and a
near-duplicate build. Fury's error: the status header was updated and this line
was not.)*

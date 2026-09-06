# Mission: CV4 — the hour timeline (Day / 3 Day / Week)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-09-06 · **Updated:** 2026-09-06

## Brief

- **Goal:** Day, 3 Day and Week become real **hour timelines** — events
  placed on a 24-hour rail by their actual times, overlapping ones side by
  side, all-day items in a strip above. This is the biggest visible change
  left in the calendar and the last of the plan's core view work.
- **Done means:**
  1. Day / 3 Day / Week render a timed grid, not a list.
  2. Overlapping events sit side by side and are individually tappable.
  3. A now-line tracks the real clock; opening scrolls to now (or 7 AM).
  4. All three are reachable from the picker; nothing unbuilt is.
  5. Gauntlet green in all three timezones; database at exact baseline.
- **Out of scope:** Month text pills / Year (CV5), the month dropdown and
  swipe paging (CV6), drag-to-reschedule (CD1), filters (K3),
  recurrence (K4). **Schedule is finished — do not wire the timeline to
  `useScheduleWindow`** (the plan says so explicitly; ±61 days suffices).

## Decisions — don't re-litigate

- **D1. `timelineLayout.ts` (CV2) is consumed here or deleted here.** It
  was built one phase early against a written plan and has had **no
  application caller for two missions**. STRUCTURE.md's dormant-export
  rule and Captain's CV2 Ruling 5 set the deadline at this phase: **if CV4
  ships without consuming it, delete it and both its test files.**
- **D2. A fixed 24-row wall-clock rail** (CV2's recorded reasoning): a day
  is always 1440 rail minutes even when DST makes it 23 or 25 hours long,
  so the hour gutter never lies about where "2 AM" sits. Google and Apple
  trade the same way.
- **D3. `blockGeometry` cannot read `allDay`** — its parameter type
  excludes it, which makes "the timed path must never read an all-day
  row's stored times" a compiler refusal rather than a rule to remember.
  Captain called it the strongest thing in that file. **Do not weaken it.**
- **D4. One packer.** The all-day strip feeds the *existing*
  `monthLayout.assignLanes` — `TimelineEvent` is structurally identical to
  `MonthLayoutEvent` for exactly this reason. No second packer.
- **D5. Contrast by border, not alpha** (mission-9/C7's ruling for Month
  pills). At 375px a Week column is ~44px, so a block is a colour band
  with 2–3 characters — Google does the same. Day shows location; 3 Day
  and Week do not.

## Danger register (absolute)

- **The app is LIVE.** `main` deploys to the family's production app.
- Never `npm run db:seed` / `db:reset`; never a Neon branch reset. Scoped
  `db:seed-calendar` / `db:clean-calendar` / `db:seed-tasks` /
  `db:clean-tasks`, or uniquely-titled rows deleted by id.
- **No agent may create, update, delete or deactivate a `User` row.**
- **Do not edit any existing migration.** Nothing here needs one.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
  **`CalendarEvent` must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles, positions and
  counts — never names or event titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.
- **State what is in the database at the moment you measure anything
  data-dependent.** Mission-16 round 3: a parallel gate's rows lifted a
  scroll clamp and made a broken anchor read as fixed, **16 runs running,
  across two different gates.**

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm run build` · `npm test`
(**317** baseline, pins Denver) · the direct `TZ=UTC` and
`TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts
src/lib/voice/*.test.ts` legs.

## Process changes, first mission under them (Bryce approved 2026-09-05)

1. **Builders run in parallel, each in its own git worktree on its own
   branch**, merged back by Fury. Mission-16 ran 2h23m of strictly
   sequential builder work over barely-overlapping files; the gates have
   used worktrees for two missions and builders never did. Disjoint file
   sets are a precondition, not a hope — Fury verifies it before
   dispatch.
2. **Gate proportionally.** Not every contract earns three gates at full
   sweep. Mission-16 swept twelve pages in two themes partly to check a
   one-line glyph.
3. **Split by risk.** Small and safe must not wait behind large and
   risky; mission-16's instant-checkbox fix was finished at 14:43 and
   shipped after 22:00.

## Standing constraints

- **The built-in browser pane cannot gate any of this.** It runs hidden:
  `IntersectionObserver` and `requestAnimationFrame` **never fire**, and a
  screenshot forces exactly one frame — which is how it looks like it
  works. Real headless Chrome **and WebKit** over CDP/Playwright, on a
  **production build**, own port.
- `body.scrollWidth`, never `documentElement.scrollWidth`.
- Three states — loading, genuinely empty, outside the loaded window —
  must never be mistakable for each other.
- **`CalendarViews.tsx` is at 349/350.** Captain's ruling (mission-16,
  pass 2, measured): **do NOT extract the sheets block** — 13 props for 62
  lines — spend the budget on C3 below instead, which removes a real
  hazard and shrinks the switch as a side effect.
- Caps are judged on **code** lines now, and both counts get reported.

## Assembled

- **Stark ×2 in parallel** (C1 ∥ C2), then sequential for C3, C4.
- **Vision** — always.
- **Strange** — a whole new rendering model the family will use daily.
- **Captain** — a new component, a new lib module, and C3 is his own
  standing ruling coming due.
- **Banner** — not assembled; Fury did the reconnaissance inline (the
  plan's CV4 section is unusually specific, and `timelineLayout.ts`'s
  exports were read directly).

## Contracts

### C1 — `appChrome.ts`: the chrome height gets one home
- **Status:** DONE — branch `cv4-c1`, commit `62764c4`, merged.
- **Report:** `src/lib/appChrome.ts` (22 code / 84 total) holds the
  constant **and** `useAppHeaderHeight()`, the hook seeded with the
  constant rather than `null` so no consumer needs a `?? fallback`.
  **The rule paid immediately**: `RecipeList.tsx`'s private
  header-measuring effect turned out to be a **byte-for-byte duplicate**
  of the new shared hook and was deleted; its separate `railTop`
  measurement (a different job — the rail against the search box) was
  correctly left alone rather than forced. `ScheduleView.tsx`'s three
  inline sums became one named `scheduleChromeHeight` (Captain's N7
  rider). `(app)/layout.tsx` names its three dependents at the `<header>`.
  **A/B control against the un-refactored tree via `git stash`, same
  server and seeded data: pixel-identical** in every case — header 73,
  bar stacking 73/227, anchor landing, one visible month label at 13
  scroll positions, the Recipes letter clearing at 9 interior points.
  32/32 checks across Chromium + WebKit × both themes.
- **It also confirmed a pre-existing quirk is not ours**: the deep-link
  scroll clamp Vision diagnosed in mission-16 (`todayTop 416`) is
  **byte-identical before and after** this refactor.
- **Two of its own harness bugs, found by measuring rather than
  trusting**: sampling the literal edge pixels of a sticky heading is
  ambiguous by box-boundary rounding (fixed with interior insets — the
  heading's right edge and the rail's left edge have a clean 4px gap);
  and a `waitForURL` regex that matched the current URL made a wait
  vacuous.
- ⚠️ **Disclosure, recorded rather than omitted:** an early diagnostic
  script printed **real event titles** from the live dev branch into the
  builder's own output before it had internalised that path's
  sensitivity. Caught immediately; every later diagnostic read only
  day-of-month numbers and boolean flags. Dev-branch data is real family
  data — the register's "counts and positions, never titles" rule exists
  for exactly this, and the transcript is local.
- **No test file for `appChrome.ts`**, stated rather than skipped
  silently: its only logic is DOM measurement with no pure surface, the
  same reason `useToday.ts` ships without one.
- Captain's N3 ruling, now a written rule (STRUCTURE.md, Bryce-approved
  2026-09-05) and named there as **CV4's first contract**. Move
  `APP_HEADER_HEIGHT_PX` out of `CalendarHeader.tsx` — it is a fact about
  `(app)/layout.tsx`, and `RecipeList.tsx` already refuses to import a
  calendar component for it and re-derives it at runtime instead. New
  `src/lib/appChrome.ts` exports **both** the constant and the measuring
  hook; the constant is documented as the first-paint seed, because a pure
  runtime measure is `null` for one paint — fine for a `scroll-mt`, **not**
  fine for a pinned `style={{ top }}` (visible jump).
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` and `SCHEDULE_TITLE_SLOT_ID` **stay** in
  `CalendarHeader.tsx`; they are facts about that component.
  `(app)/layout.tsx` gains a comment naming its dependents — the second
  half of the rule.
- **Rider (Captain, mission-16 N7):** `ScheduleView.tsx` computes
  `APP_HEADER_HEIGHT_PX + SCHEDULE_HEADER_BAR_HEIGHT_PX` in three places.
  Name it once. Verbosity, not risk — but this is the contract that
  touches all of it.
- **Boundaries:** may touch new `src/lib/appChrome.ts`,
  `src/components/CalendarHeader.tsx`, `src/components/ScheduleView.tsx`,
  `src/components/RecipeList.tsx`, `src/app/(app)/layout.tsx` · must not
  touch `calendarViewConfig.ts`, `CalendarViews.tsx`, `globals.css`,
  `useScheduleWindow.ts`, `useScheduleMonthTitle.ts`, `actions/**`,
  `prisma/**`, anything under `src/lib/timelineLayout*`.
- **Evidence:** behaviour identical — Schedule's pinned bar still stacks
  at 73/154 with no gap, its anchored day still lands at 227, and
  Recipes' A–Z letter still clears the header with a 9-point
  `elementFromPoint` sweep. Both engines, both themes, production build.

### C2 — `TimelineGrid` + `useNowMinute` (the heart of CV4)
- **Status:** DONE — branch `cv4-c2`, commit `4d3904d`, merged.
  `TimelineGrid.tsx` **310 code / 519 total**; `useNowMinute.ts` 16/85;
  9 new tests (**317 → 326**).
- **Report:** consumes `timelineLayout.ts` **unchanged** — so D1 is
  satisfied and the library is no longer dormant. All-day strip feeds the
  **existing** `monthLayout.assignLanes`, imported directly (no second
  packer): 6 all-day items rendered as 3 lanes + "+3 more", and a 3-day
  span as **one** button via `gridColumn`, not three copies. Scroller
  height measured at runtime from its own top plus a **live** query of the
  bottom nav — deliberately not a second hardcode of ScheduleView's
  inline 65px — seeded by a `calc()` on the injected `chromeOffsetPx` for
  first paint.
- **The DST evidence is the strongest single measurement of this
  mission.** Nov 1 2026, America/Denver: the two events at the two
  genuinely distinct UTC instants that both read as local "1:30 AM"
  (07:30Z = MDT, 08:30Z = MST) render at the **identical y-position**
  (rail minute 90) and in **separate columns**, each independently
  clickable — proving the wall-clock rail collapse (D2) and the overlap
  packer in one shot, on both engines, on the real date rather than a
  synthetic stand-in.
- Overlap tappability confirmed at **375 and 320**, both engines, both
  themes, no horizontal overflow. Scroll-to-now: real now at ~23:31 gave
  a target of 949.8 correctly **clamped to the scroller's true max of
  687** (nothing exists below now near midnight) — reported as a clamp
  rather than as a pass; the not-today case landed at exactly `7*60*0.8`.
  **Sticky verified rather than assumed** — the first component built
  since mission-16 made `position: sticky` work at all: a weekday label
  held at 214px across a 300px inner scroll while the grid moved beneath.
- **A real bug found in verification, not assumed away:** scroll-to-now
  first computed against the scroller's **stale** `calc()` height, because
  a sibling layout effect's measured height had not reached the DOM in the
  same commit — both `useLayoutEffect`s run in one pass, but a state
  update does not paint until the next render. Fixed by applying the
  measured height imperatively and synchronously inside the sizing effect.

### ⚠️ Two findings from C2 that need a ruling, surfaced now rather than discovered later

**1. A 30-minute block is 24px tall, and DESIGN.md's floor is 48px.**
Geometric necessity, not an oversight: `MIN_BLOCK_MINUTES = 30` × the
plan's own `HOUR_HEIGHT_PX = 48` (0.8px/min) = **24px**. A 2-hour block
measures 96px. The builder **disclosed this rather than inflating the box
past its computed geometry** — which would have been the wrong fix, since
`assignColumns` only guarantees non-overlap up to exactly that padded box.
**The plan specifies 48 and DESIGN.md specifies 48px targets; at short
durations those two cannot both hold.** Doubling `HOUR_HEIGHT_PX` to 96
would satisfy the floor and make a day 2304px tall — roughly five hours
visible at a time. Google and Apple both ship the small block.
**This is Strange's ruling, and it may be Bryce's.** Not resolved by
Fury; recorded here so the gate meets it as a stated tension rather than
as a defect.

**2. `timelineLayout.ts:53-59`'s comment is an overclaim — confirmed by
Fury.** It calls `MIN_BLOCK_MINUTES` *"the shortest block that is still
comfortably tappable at the app's touch-first 48px minimum."* At
`HOUR_HEIGHT_PX = 48` that block draws **24px**; the claim is only true
at ≈96. It was written in CV2 when **nothing consumed the library**, so
nothing could contradict it — the first real caller did, immediately.
The builder reported it rather than editing a must-not-touch file, which
was correct. **Whichever contract resolves finding 1 owns this comment**;
it is wrong no matter which way the ruling goes.

**3. A placement judgement the builder flagged for the gates rather than
deciding quietly:** the per-column not-loaded glyph went in the weekday
**header** cell beside the day number, mirroring `MonthCell.tsx`'s literal
placement, because the contract's "the not-loaded treatment in the all-day
row" is ambiguous between the all-day strip specifically and the top
summary strip generally. Named so Vision and Strange can read it
differently if they do.
- One component: `TimelineGrid({ columnDays, events, today, now,
  windowStart, windowEnd, onOpenEvent })`. `columnDays` is `[anchor]` /
  `[anchor,+1,+2]` (**anchor-relative, not snapped** — Google's
  behaviour) / `daysOfWeek(sundayOf(anchor))`.
- **Consumes `src/lib/timelineLayout.ts`** — `partitionForTimeline`,
  `blockGeometry`, `assignColumns` — and feeds the all-day strip to the
  **existing** `monthLayout.assignLanes` (D4). **Do not add a second
  packer, and do not weaken `blockGeometry`'s parameter type (D3).**
- `HOUR_HEIGHT_PX = 48` in the component as `--hour-height`; 24 fixed
  rows; its own `overflow-y-auto` scroller, with the weekday header and
  all-day row `sticky` inside it. **Sticky genuinely works now**
  (mission-16 fixed the rule that made every `position: sticky` in the app
  inert) — this is the first component built after that, so verify rather
  than assume.
- New `src/lib/useNowMinute.ts` beside `useToday.ts` — same
  `useSyncExternalStore` shape, 60s tick, `null` on SSR. Vision asked for
  this hoist.
- **Scroll-to-now** on open when today is a column (now − ⅓ viewport),
  else 7 AM; `useLayoutEffect` keyed on the column set, active panel only.
- Hour labels through `Intl` on a synthetic non-calendar date.
- **Takes the chrome offset as a prop** — C1 is moving that constant in
  parallel, so this contract must not import it. Dependency injection,
  the `ScheduleFetchers` / `useScheduleMonthTitle` precedent.
- **Boundaries:** may touch new `src/components/TimelineGrid.tsx`, new
  `src/lib/useNowMinute.ts`, new `src/lib/useNowMinute.test.ts` · must not
  touch `timelineLayout.ts` (**consume it unchanged — if it needs a
  change, that is a finding, report it**), `monthLayout.ts`,
  `CalendarViews.tsx`, `CalendarHeader.tsx`, `calendarViewConfig.ts`,
  `ScheduleView.tsx`, `RecipeList.tsx`, `globals.css`, `actions/**`.
- **Evidence:** overlapping events side by side and **individually
  tappable at 375px**; a DST day (Nov 1 2026) rendering 24 rows with both
  1:30s on the rail; the now-line at the right rail minute; scroll-to-now
  landing where it claims; **44px targets** or a stated reason; the
  all-day strip proven to use the existing packer (not a copy).

### C3 — `pinned` and the renderer selection into `VIEW_CONFIG`
- **Status:** DONE — branch `cv4-c3`, commit `f8ae2a8`, merged.
- **Report:** `pinned` and a new `renderer` discriminant
  (`"month" | "schedule" | "daySection"`) are now fields on the total
  record, one row per view. `CalendarHeader.tsx`'s inline
  `view === "schedule"` is gone; `CalendarViews.tsx`'s ternary chain is a
  `switch` with a **`never`-typed default**. The record holds a
  discriminant rather than a component, because `src/lib/` may not import
  from `components/` — the constraint Captain had already ruled on.
- **The totality was demonstrated, not asserted — both compile errors
  pasted and reverted:** adding a fourth renderer value with no case →
  `TS2322: Type '"timeline"' is not assignable to type 'never'`; removing
  `renderer` from `week`'s row → `TS2741: Property 'renderer' is
  missing`. That demonstration was the contract's whole point.
- **Positive control before the no-diff verdict**, per mission-11's
  lesson that two harnesses once both reported a clean diff they were not
  entitled to: a deliberate `"Today" → "Today-POSITIVECONTROL"` mutation
  was detected on all four built views first. Then the real trace —
  `<main>` innerHTML **plus the view picker's `[role="dialog"]`
  contents**, the exact capture those harnesses were missing —
  **byte-identical** before and after. The pinned styling was captured as
  evidence rather than inferred: only Schedule's wrapper carries
  `sticky … style="top: 73px"`.
- **It declined to fold in `showLocation`/`compact`, and the reasoning is
  right:** they are DaySection-specific props consumed only in the
  `"daySection"` case, and **C4 replaces that renderer for
  `day`/`threeDay`/`week` outright** — so folding them in now would add
  rows C4 immediately deletes. It left an inline comment so the omission
  cannot be read as an oversight, and checked C4's own boundaries to
  confirm that is where the decision belongs.
- It also **trimmed its own first draft**: an initial version grew
  `CalendarViews.tsx` to 407/217 on heavier commentary; noticing the
  mission's framing said the switch should *shrink*, it cut back to
  372 total / **206 code** (+7 code).
- **Tests 317 → 319**, and the two new ones give the totality real
  value-coverage rather than only the type-level guarantee. **All three
  parallel branches compose: 328 tests, gauntlet green.**
- **Captain's own ruling, coming due exactly here.** `CalendarHeader.tsx`
  computes `const pinned = view === "schedule"` itself, and
  `CalendarViews.tsx` switches on the same string independently — two
  inline per-member tests where `VIEW_CONFIG` is a **total record over all
  six views**. STRUCTURE.md (amended 2026-09-05, Bryce-approved) makes
  this a **BLOCKER the moment a reachability entry flips**, and C4 below
  flips `threeDay`. So it lands *before* C4, not after.
- Captain measured the alternative and ruled against it: **do not extract
  the sheets block** (13 props for 62 lines). This is where the budget
  goes.
- **Boundaries:** may touch `src/lib/calendarViewConfig.ts`,
  `src/components/CalendarHeader.tsx`, `src/components/CalendarViews.tsx`
  · must not touch `TimelineGrid.tsx`, `appChrome.ts`, `ScheduleView.tsx`,
  `actions/**`, `prisma/**`.
- **Evidence:** every view's behaviour provably unchanged; the record
  total (a missing member is a compile error, demonstrated); report
  `CalendarViews.tsx`'s **code** and total lines.

### C4 — wire it up: the picker, the views, the skeletons
- **Status:** DONE `8a47a64`. Tests **328 → 329**.
  `CalendarViews.tsx` 446 total / **225 code** — under the cap on the
  measure that now counts.
- **Report:** `BUILT_VIEWS.threeDay → true`; `"timeline"` added to the
  `CalendarRenderer` union, which C3's `never`-typed switch made a compile
  error until every branch handled it — **the mechanism working as
  designed, one contract after it was built.** All six views walked in a
  real browser: the picker shows exactly Schedule / Day / 3 Day / Week /
  Month, Year correctly absent, and `?view=year` normalises to Week with
  zero page errors. **3 Day proven anchor-relative** from a Wednesday
  anchor: Wed/Thu/Fri, titled "Sep 9–11", not snapped to a week.
- **It found and fixed a real ~225px layout jump rather than shipping the
  skeleton it was handed.** Measured with a `MutationObserver` frame
  trace: the skeleton settled at **1093px** while the real grid rendered
  at **868px**. Root cause was ordering — the generic `today === null`
  placeholder ran ahead of the timeline branch. After moving the case and
  matching `loading.tsx`'s shape: **866 vs 868, a 2px delta that is the
  real box's border**, holding across four viewport heights *and* the
  320px clamp, on all three timeline views. This is mission-7's lesson
  applied instead of relearned: *a skeleton whose height you did not
  measure is a layout shift you have not noticed yet.*
- **Schedule and Month byte-identical** — same SHA-256 for `<main>`
  before and after, **after a positive control** proved the harness could
  detect a deliberate `h1` mutation. The picker dialog differs by exactly
  one line: the added "3 Day" button.
- **The honest one — it could not reach the third state, and checked its
  own method rather than claiming either way.** `isOutsideWindow` would
  not reproduce live for the timeline views across −70…+70 days, nor
  under an artificial ~21-hour browser/server skew. So it ran the
  identical sweep against **Month** — untouched by this contract, same
  mechanism — and found it **equally unreachable**, establishing that
  this is not a regression its wiring introduced. The wiring is correct by
  inspection (`windowStart`/`windowEnd` passed through exactly as
  `MonthGrid`/`DaySection` already receive them) and the glyph's markup
  was verified structurally distinct by source reading. **Recorded as a
  disclosed limit, not a claim of success — and worth a gate's attention
  precisely because a state nobody can reach is a state nobody has
  tested.**
- **Boundary deviation, verified by Fury and accepted:**
  `calendarPaging.test.ts` and `useCanonicalCalendarUrl.test.ts` both used
  `"threeDay"` as their stand-in for *a real view name with no renderer* —
  a fixture literal that flipping `BUILT_VIEWS.threeDay` necessarily makes
  false. The fix swaps the example to `"year"` (the one view still
  unbuilt) and moves `threeDay` into the built-views assertions, with
  comments explaining the move. **No source logic in either module was
  touched** (confirmed from the diff). Mechanical, foreseeable, and the
  alternative was leaving the gauntlet red.
- **It left both open findings alone as instructed** — the 24px block and
  `timelineLayout.ts`'s overclaiming comment — and flagged a third for
  CV5: `MonthGridSkeletonRows.tsx` says *"CV4 replaces this skeleton
  entirely later"*, which is false for the CV4 that actually shipped.
- `BUILT_VIEWS.threeDay → true`; Day and Week switch from the list
  renderer to `TimelineGrid`; measured `loading.tsx` shapes.
- **The picker ends this mission with six views, all built** — the first
  time since CV1 that the vocabulary and the renderers agree completely.
- **Per-column `isOutsideWindow`** → the not-loaded treatment in the
  all-day row, per `MonthCell`'s policy. Three states, never two.
- **Boundaries:** may touch `src/lib/calendarViewVocabulary.ts`,
  `src/components/CalendarViews.tsx`, `src/lib/calendarViewConfig.ts`,
  `src/app/(app)/calendar/loading.tsx` · must not touch `TimelineGrid.tsx`
  (consume it), `appChrome.ts`, `actions/**`, `prisma/**`.
- **Evidence:** all six views reachable and rendering; **skeleton heights
  measured, never guessed** (mission-7's lesson: a skeleton whose height
  you did not measure is a layout shift you have not noticed yet);
  Schedule and Month provably unchanged.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | C1 | DONE `62764c4` → merged | — | Parallel worktree #1. A/B pixel-identical; `RecipeList`'s private duplicate deleted |
| — | C2 | DONE `4d3904d` → merged | — | Parallel worktree #2. Both Nov-1 1:30 AMs at one rail minute in separate columns. **317 → 326.** Two findings need a ruling |
| — | C3 | DONE `f8ae2a8` → merged | — | Parallel worktree #3. Totality proven by two pasted compile errors; byte-identical trace after a positive control. **All three compose: 328** |
| — | C4 | DONE `8a47a64` | — | All six views live. Found and fixed a **225px** skeleton jump → 2px. **329 tests.** Third state disclosed as unreachable, method checked against Month |
| 1 | Captain | **BLOCKED** | 3 | All three trace to one cause **Captain named**: a must-not-touch boundary is a threshold you can satisfy by copying |
| 1 | Vision | **BLOCKED** | 2 | **Tasks vanished from Day/3 Day/Week** — Fury's contract omitted them. Also solved C4's unreachable-state mystery |
| 1 | Strange | **BLOCKED** | 3 | **Ruled on the 24px block rather than handing it up.** Reached the state C4 could not. Three states fail for the third time on this branch |
| — | C5 | DONE ×6 | — | All eight blockers closed. **224/224 live checks across 8 engine×theme×width combos.** Tests 329 → **333** |
| — | C6 | dispatched | — | `TimelineGrid.tsx` crossed the **650 hard cap** (809/434). Captain's named seam, taken now rather than deferred behind a justification |

## Gate round 1 — three BLOCKED, eight blockers, one cause worth more than the rest

### Strange's ruling on the 24px block — settled, not escalated

**"Accept the height. Reject the abutment."** It declined to hand this to
Bryce and explained why, which is the outcome I wanted from asking.

*Accept*, because inflating the box would either paint over a neighbour or
reintroduce the ambiguous tap the pad exists to prevent — and 96px/hour
halves the visible day from **9.2 hours to 4.6**, paid on every opening of
the app's most-used view, to fix a mis-tap whose worst outcome is opening
the adjacent event and tapping back. **And crucially the licence is
structural, not "Google does it"** — DESIGN.md explicitly disowns
third-party references. **The app already solved this in Month**: the
*cell* is the 44px target (measured `min-h-11`, 44 × 47.9) and the pills
inside are non-interactive. Coarse view, conforming target one step away —
and Schedule, a peer in the same picker, has **112px full-width rows and
lists everything**.

**The exception gets a written boundary**, which is the part that matters:
*a timeline block's height is its duration; its floor is whatever
`MIN_BLOCK_MINUTES × HOUR_HEIGHT_PX` buys; every block stays a real
`<button>` with a real accessible name; Schedule is the conforming route.*
**Anything with no duration to be faithful to gets no cover** — which is
exactly why it then blocked the 18px all-day bar.
*One line for Bryce, not blocking: a 96px rail on **Day only** (one
column, no width cost) would clear 48px outright at the price of halving
Day's span. Strange ruled it not worth it; it is a one-constant change if
Bryce disagrees.*

### The eight blockers

**Vision B1 — tasks vanished from Day, 3 Day and Week.** Measured: a task
due today appears **0 times** in all three, 1 in Month (control), present
in Schedule. So a chore due today is invisible on the view the app opens
to, and **a kid cannot complete their own chore from there** — the
feature CT2 built. **This is Fury's contract error**, and the sharpest
kind: `.avengers/plans/calendar-v2.md:272` says plainly *"timeline → the
all-day row via `partitionForTimeline`"*, and C2's contract enumerated the
component's props and **left `tasks` out**. Every check I wrote asked
whether the timeline placed *events* correctly. It does. Nobody asked what
happened to the other thing that lives on a calendar day.

**Vision B2 + Strange B2 — the same defect, and Strange traced it
further.** All-day items beyond the third are withheld with **no route to
them**: `assignLanes` caps at 3 and the "+N more" is an inert `<span>` —
not a button, not focusable. Vision measured the 4th event **absent from
the DOM entirely**; Strange then traced the escalation and found it
**circular**: Month's own "+N more" navigates to Day, which renders the
same dead "+N more". Month's overflow affordance, whose entire
justification is "tap through to see them all," now terminates in a second
overflow. DESIGN.md: *"Never a dead end."* Two riders land with the fix —
the all-day bar is **18px**, smaller than the 24px block and with **no
duration to justify it** (so the ruling above explicitly denies it cover);
and at 320px the "+N more" ink **escapes its box by 9px** onto the
scrolling rail, caught only because Strange re-measured with
`Range.getClientRects` after its own bounding-box probe said clean.

**Strange B3 — consecutive half-hour events abut at exactly 0.0px.** Two
distinct destinations separated by a hairline; a 12px aim error opens the
wrong one, and **opening the wrong event is worse than missing.** Its
acceptance of the 24px height is *conditional on this*. Fix is free and
needs no library change: draw each block 2px shorter than its computed
geometry — **shrinking is always safe** because `assignColumns` guarantees
non-overlap up to the padded box.

**Strange B1 — "not loaded" and "genuinely empty" are indistinguishable,
the third failure of the three-states rule on this branch.** It **reached
the state C4 could not** (2000ms latency + 14 rapid Next taps → all 7
columns out of window) and found the accessible text **byte-identical
apart from the dates**, because the only differentiator is a 9×9px glyph
that is `aria-hidden`. **C4's own change caused it**: moving
`day`/`threeDay`/`week` from `daySection` to `timeline` removed
`NotLoadedCard`'s *worded* answer from exactly the views Month escalates
into. `ScheduleView` still renders it, which proves the treatment is
affordable.

**Captain B1/B2/B3 — and the cause is mine.** A nine-line function copied
**byte-for-byte** from `MonthCell` with a comment claiming it isn't a copy
(Fury diffed it: identical); a **second hardcoded bottom-nav height that
is wrong** (64 against a real 65 — it matched the inner row and missed the
border, and `env(safe-area-inset-bottom)` makes both wrong by ~34px on a
phone); and a dependents list naming **3 of 5**, missing a *composite*
number that no grep could ever find.
**Captain's diagnosis is the most valuable thing in this round:** *a
must-not-touch boundary is a threshold you can satisfy by copying.* Three
times a builder correctly obeyed, correctly disclosed, and correctly
copied — because the file the shared thing belonged in was forbidden to
it. `color.ts` **already records this happening before, and its remedy**
("put both files in the SAME contract"); it happened again one level up
the same call stack. **It also answers my parallelisation question:
disjoint file sets are not the whole precondition — what makes contracts
safely parallel is that neither needs to read a definition the other
owns.** My C1/C2/C3 map passed the first test and failed the second.

### Two things resolved rather than found
**Vision solved C4's disclosed mystery:** `isOutsideWindow` is **not dead
code** — the reachable path is the client rendering ahead of an in-flight
fetch, and both gates reached it independently once they stopped sweeping
dates and started delaying responses. And **Strange restored the database
to exact baseline** while recording that a parallel gate's rows moved
underneath it (4 → 15 → 25 → 30 → 20 → 4), naming the count at every
measurement so nothing load-bearing rested on one.

### C5 — all eight blockers, and the one thing it could not fix from inside its boundary

**DONE, six commits.** Tests **329 → 333**. Live verification: **224/224
checks across 8 engine × theme × width combinations**, plus a separate
not-loaded suite (8/8 both engines), an escalation suite (3/3) and 96/96
control checks proving Month, Schedule and the Nov 1 2026 DST behaviour
unaffected.

**The permission evidence is the part worth keeping.** It minted **three
real sessions** — admin, kid1, kid2 — and confirmed kid1's own task offers
"Mark complete" and persists it (verified by direct DB read), while
**kid2's task offers kid1 no complete control at all.** That is CT2's
rewards-loop foundation, restored on the timeline and proven at the
session level rather than by reading a boolean.

Other measurements: 5 all-day items expanded from "+2 more" to all five in
Day, 3 Day, Week **and via the real Month-tap→Day path** — the circular
escalation Strange traced is gone; the half-hour gap reads **2px** with
`elementFromPoint` resolving A, B and the gap to **three different
targets**; the all-day bar is 24px; the 320px overflow ink stays in its
box; the not-loaded banner was **reached** (3s injected latency + a
rapid-tap burst) with its text confirmed **not** `aria-hidden`, and a
genuinely-empty in-window day shows neither banner nor glyph.

**Judgement calls it made and defended:** it chose *expand in place* over
*navigate to Schedule* for the overflow, keeping the reader on the view
they are in; it used `line-through` for a completed task on the timeline —
permitted there and only there — reasoning that Month avoids it because
its pill title is `sr-only` below `md`, which is not true at timeline
width; and when the naive reset-on-column-change tripped
`react-hooks/set-state-in-effect`, it used React's documented
adjust-state-during-render pattern rather than suppressing the rule.

**It caught its own error in a follow-up commit:** the hard-cap disclosure
cited a line count taken *before* the disclosure paragraph existed,
understating the total by its own length.

### C6 — the seam, taken now rather than deferred behind a justification
- **Status:** PENDING
- **`TimelineGrid.tsx` is 809 total / 434 code** — past the **650 hard
  cap**, and past the 350 soft cap on code as well. C5 wrote the header
  justification STRUCTURE.md permits, and named CD1 as the deferred
  extraction because **its boundary did not allow creating a new file.**
- **That justification is a process artifact, not a structural reason —
  and it is this morning's lesson in new clothes.** Captain's round-1
  finding was that *a must-not-touch boundary is a threshold you can
  satisfy by copying*; a boundary that forbids a new file is one you
  satisfy by **writing a justification instead of a seam.** Fury's
  boundary caused both.
- **Captain already measured the seam and it is the cheap one:** the
  all-day strip, **63 lines for 4 props**, against the `CalendarViews`
  sheets block it ruled *against* at 62 lines for 14 — *"the same line
  count for less than a third of the coupling."* It stays inside the same
  sticky wrapper, so the "sticky as ONE unit" property is preserved. C5
  has since grown that strip (tasks, the expand button, the 24px bar), so
  the seam is larger — and more clearly its own job.
- Captain's stated trip condition was **CD1**, on the grounds that CD1
  adds *code* here. C5 added **291 lines** to this file, which is more
  than CD1 plausibly will. **The condition has effectively tripped early.**
- **Boundaries:** may touch `src/components/TimelineGrid.tsx`, new
  `src/components/TimelineAllDayStrip.tsx` · must not touch
  `timelineLayout.ts`, `monthLayout.ts`, `color.ts`, `appChrome.ts`,
  `CalendarViews.tsx`, `MonthCell.tsx`, `actions/**`, `prisma/**`.
- **Evidence:** behaviour identical — **re-run C5's own suites**, in
  particular the five-item expansion, the kid-permission case, the
  not-loaded banner and the 2px gap. Report both files' code and total
  counts, and confirm the sticky strip still behaves as one unit.

## Handoff log

- 2026-09-06 — Opened on `claude/calendar-cv4-timeline` from `main` at
  `17b6e60` (mission 16 merged and deployed). **The five STRUCTURE.md
  amendments Bryce approved are the first commit on this branch**, and two
  of them (the chrome-dimension rule, the `VIEW_CONFIG` totality clause)
  bind C1 and C3 directly. **First mission running builders in parallel
  worktrees** — C1 ∥ C2 dispatched together, file sets verified disjoint
  before dispatch.
- 2026-09-06 — C1 DONE and merged; **C2 still running in its own
  worktree, untouched by the merge** (disjoint by construction). Because
  C1 has landed, **C3 is dispatched now rather than after C2** — it needs
  `CalendarHeader.tsx`, which C1 has released, and its file set is
  disjoint from C2's. That is two builders in flight again, which is the
  point of the process change.

## Delivery

_Pending._

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
| — | C6 | DONE `64ba63a` | — | **809/434 → 623/321**, under both caps. C5's suites re-run 26/26; the justification is gone rather than accepted |
| 2 | Captain | **PASS** | 0 | 7 notes, 3 rulings — and it **withdrew its own proposed sixth amendment** after measuring the premise Fury argued it from and finding it false |
| 2 | Strange | **PASS** | 0 | 5 notes. All three blockers closed *as felt*; extended its own ruling to cover the 24px bar, with reasons |
| 2 | Vision | **BLOCKED** | 1 | The 320px ink escape **rotated** rather than closed — and C5's evidence for it was a box probe that structurally cannot see ink |
| — | C7 | DONE `ff323f7` | — | All four closed. Scroll-to-now back to **0.333 at every strip size** (was 0.537). Both files under both caps |
| 3 | Vision · Strange | **DIED — session rate limit**, both, mid-run | — | Neither reported. A death is not a verdict; Fury cleaned 2 worktrees and **25 stranded rows**, then re-dispatched |
| 3 | **Vision** (retry) | **PASS** | 0 | 6 notes. Blocker closed and **not clipped** — ink ends inside the box at every width. Answered the dead run's proxy question |
| 3 | **Strange** (retry) | **BLOCKED** | 2 | **Both on DESIGN.md text Fury wrote in this same commit** — none on the four items' behaviour. 8 notes. Budget spent |

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
- ⚠️ **Boundaries backfilled 2026-09-06 on Vision's finding — they were
  never written here, only in the dispatch prompt.** That is Fury's own
  checklist item (*"the contract is written in the mission file, not only
  the prompt — a boundary living only in a dispatch prompt is not a
  boundary; a gate auditing scope has nothing to audit against"*), filed by
  Vision in CV2 and again in CT1/CT2, and repeated here. Vision audited C5
  against the eight blockers instead and found every file traceable to one.
  **As dispatched:** may touch `TimelineGrid.tsx`, `CalendarViews.tsx`,
  `color.ts`, `MonthCell.tsx` (the `pillBackground` hoist only),
  `appChrome.ts`, `ScheduleView.tsx` (the `-65px` constant only),
  `HubNav.tsx` (comment only), `(app)/layout.tsx` (comment only),
  `types.ts` if needed, and any `src/lib/*.test.ts` the changes require ·
  must not touch `timelineLayout.ts` and its tests, `monthLayout.ts`
  **except** an optional `visibleLanes` parameter with Month's call
  unchanged, `calendarViewConfig.ts`, `calendarViewVocabulary.ts`,
  `actions/**`, `prisma/**`, `DESIGN.md`, `STRUCTURE.md`.

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
- **Status:** DONE `64ba63a`. **`TimelineGrid.tsx` 809/434 → 623/321** —
  under the 650 hard cap *and* the 350 soft cap on code. New
  `TimelineAllDayStrip.tsx` 292/154. **The header justification is gone
  rather than accepted**, which was the point.
- **Report:** it proved the move was a move, not a rewrite — stripped both
  files of comments and diffed the relocated region against the original,
  leaving exactly two differences: code that legitimately stayed behind
  (weekday header, `columnSlots`, the not-loaded banner), and a
  `{cond && (...)}` becoming an equivalent early `return null`. All of
  C5's suites re-run live, **26/26**, both engines: the five-item
  expansion including the real Month→Day path, the kid-permission boundary
  (owner completes and it **persists**, confirmed by direct DB read;
  another kid gets no control), the **2.00px** gap with three distinct
  `elementFromPoint` targets, the sticky wrapper pinned as one unit across
  a 300px rail scroll, and the not-loaded banner with its text **not**
  `aria-hidden`.
- **Two judgement calls worth keeping.** It passes `gridTemplateColumns`
  as a computed **string prop** rather than letting the child re-derive it
  from a second copy of `GUTTER_WIDTH_PX` — a deliberate departure from
  Captain's four-prop sketch, made *specifically* to avoid recreating the
  copied-magic-number failure this mission's own gate round diagnosed.
  And it found by **measuring** that a "Next day" burst can never clear
  the ±61-day window — only Week's seven-day jump reaches the not-loaded
  race — rather than assuming its first attempt had failed for the reason
  it looked like.
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

### Gate round 2 — Captain PASS, Strange PASS, Vision BLOCKED (1)

**Captain withdrew an amendment it had proposed, because Fury argued for
it from a false number.** The dispatch claimed the hard cap *"fired on a
file whose code was under the soft cap — exactly the 'cost a mission for
prose' outcome you predicted."* Captain measured before agreeing: **426 /
434 / 353 code lines by three different counters, all over the 350 soft
cap.** The claim was wrong, **and the mission file already said so** —
line 589 reads *"past the 650 hard cap, and past the 350 soft cap on code
as well."* Two records of this mission disagreed and **the prose one was
the stale one**, which is this project's tracked "recorded but not
verified" class appearing *inside an argument to change the constitution.*
Its conclusion inverts the dispatch's: **the cap worked** — a file over
both caps was split at a real job boundary into 623/314 and 292/153 with
zero logic change, and under its own proposed rule the hard cap would not
have fired, C6 would have been discretionary, and a 434-code-line
component with a measured seam would plausibly still be one file. Held for
a specific trigger — *the first file at 650 total with code genuinely
under 350* — rather than put to Bryce on evidence that contradicts it.
It also corrected Fury's framing on C6: **not "the trip condition tripped
early" but "it was superseded"** — a schedule Captain sets cannot license
crossing a cap the constitution sets, and the two readings have different
consequences for the next mission. Its three rulings: dispatching C6 was
right (on stronger grounds than Fury gave — the justification was
*self-refuting*, since its content was "a cheap measured seam exists and
is scheduled", and the hard cap has no deferral machinery); the seam is
the one it named, **improved** (153 code lines / 7 props = ~22 lines per
prop, against the sheets block it *rejected* at ~4.8); and the
`assignLanes` widening is correct and in the risk-reducing direction.

**Strange PASSED and judged its own blockers as felt, not counted.** The
2px seam *"resolves to a plain `DIV` with no interactive ancestor at any
depth, so a near-miss does nothing rather than handing the tap to a
create-here handler"* — aim tolerance to a *wrong* event moved 11px → 13px,
and top-aligned titles give ~15px of slack. **It extended its own round-1
boundary to cover the 24px all-day bar and explained why that is not
softening:** at round 1 the bar failed on two counts — 18px, *arbitrarily*
smaller with no arithmetic behind it, and a dead-end overflow. Both fixed,
the residual is *identical in kind* to the block one row below in the same
view, and blocking one while accepting the other *"would be incoherent to
a reader who experiences them as one surface."* It verified C6 with
**16/16 identical fingerprints** pre- vs post-extraction on a harness
proven non-vacuous (it reports DIFFERENT for a theme or width change), and
sticky holding as one unit in all 8 combos. It also **nearly filed an
overclaim against C5 and caught itself**: its first probe said Month
strikes through at 375px; measured properly, Month's title is
`1×1px, clip: inset(50%)` there — so C5's reasoning was right and
Strange's instinct was wrong.

**Vision BLOCKED on one, and it is the same defect rotated.** C5's
`whitespace-nowrap` moved the 320px ink escape from **vertical to
horizontal**: `Range.getClientRects` measures "+2 more" spilling 4.6px and
"+10 more" 8.8px past their boxes, and on adjacent days the two labels'
ink **overlaps** — the last glyph of one sitting under the "+" of the
next. **C5's evidence claimed the ink was contained, using a box probe
that structurally cannot see ink** — the exact instrument error Strange
made at round 1 and corrected. Clean at 375; 3px at 360.
**Everything else it examined held**, and one piece is the strongest
evidence in the mission: it replayed `completeTask` **over raw HTTP with
no browser**, kid1 against kid2's task → `{"error":"You're not assigned to
that task."}` with the DB unchanged, no cookie → 307/6 bytes, and a
**positive control** (kid2 against their own task → `{}`, `completedAt`
set) proving the refusals meant something. That is `assertCanCompleteTask`
tested, not the UI in front of it.

### C7 — the last four
**DONE `ff323f7`.** `TimelineGrid.tsx` 642/334, `TimelineAllDayStrip.tsx`
336/198 — both under the 650 hard and 350 soft caps. Tests 333.

- **Vision's blocker (item 1):** `min-w-0 overflow-hidden`, and the label
  shortens to `+N` **at Week width only** — Day and 3 Day keep the full
  text, since their columns are wide enough. **The visible label shortens;
  the accessible name does not** — `aria-label` stays `"+2 more"` /
  `"+10 more"` in every configuration, verified. Measured with
  `Range.getClientRects` (the tool whose absence let this through twice):
  ink never escapes its box at 320/360/375, both engines, both themes —
  margins of −15 to −29px where the escape was +4.6 and +8.8 — and never
  overlaps a neighbouring day's ink.
- **Item 2, the silent mixed state:** an `sr-only` "events not loaded"
  beside the glyph. **Positive control first** — a settled in-window week
  flagged **0** of 7 columns — then the real mixed state reached with 4s
  latency and 8 taps: exactly **2 of 7** flagged, confirmed present in the
  page's own `ariaSnapshot()` and **not** `aria-hidden`.
- **Item 3, the one-way expansion:** the overflow row becomes a single
  full-width **"− Show less"**. The builder chose full-width deliberately
  — expand/collapse is a strip-wide toggle with no per-day axis, and it
  **sidesteps item 1's narrow-column ink problem outright**. Round-trip
  verified 4/4 (both engines × both themes): 156px → 416px → back to
  exactly 156px, and reusable rather than one-shot.
- **Item 4, the drifting now-line:** the sticky header's height is now
  measured directly — **not cached in React state**, avoiding the stale-read
  bug C5 already hit here — and subtracted before dividing. Result:
  **0.3333 / 0.3343 / 0.3322–0.3355** at 0, 1 and 3 all-day lanes, both
  engines, both clock times. Previously 0.537 at 3 lanes, i.e. a busy day
  opened showing more past than future.

### Why Captain's third pass is declined rather than spent
Its pass-2 PASS covered `6d22eaa`. The delta since is **two component
files**: no new module, no new export, no dependency-direction change, no
test-glob change, and both files **remain under both caps** (642/334 and
336/198). The one structural question C7 could have raised — a fourth
derivation of the shared grid template string, which Captain made a
**BLOCKER** trip condition — did not arise: the "Show less" control spans
`gridColumn: "2 / -1"` and derives nothing. Per this project's own rule
that a post-PASS delta must be **enumerated and shown not to reach a
gate's domain**, that is the enumeration. Captain's pass 3 stays available
if Vision or Strange surfaces something structural.

### Gate round 3 — Vision PASS, Strange BLOCKED on Fury's own constitution text

**Both gates first died to a session rate limit mid-run**, neither reporting.
They left two worktrees and **25 stranded calendar rows** against a
baseline of 4. Fury cleaned up: worktrees removed; the rows identified
**without reading a single title** — exactly 4 predated today (Sep 2–3,
when calendar work began) and 25 were created today, and `29 − 25 = 4`
matched the baseline precisely — then deleted by id behind an abort guard
that would have refused if the survivor count came out as anything but 4.
**One process change went into both re-dispatches: delete fixtures by id
as each measurement finishes, not all at the end** — batching cleanup is
why a death stranded 25 rows instead of none.

**Vision — PASS.** It verified the thing the fix could have faked: **does
`overflow-hidden` merely clip the escape?** Positive ink margins at
320/360/375/1024 on both engines — the label genuinely *fits*, nothing is
cut mid-glyph. Accessible name confirmed **in the accessibility tree**
(`button "+23 more": "+23"`), never shortened. The `sr-only` string
reached with a positive control first (settled week: 0 of 7; mixed: exactly
2 of 7; all-out: 7 plus the banner). Expand round-trip exact and reusable,
`gridColumn: "2 / -1"` measured spanning precisely the day columns. And it
**attacked the effect ordering** rather than re-reading the fraction:
expanding after the initial scroll did *not* re-run the effect (the 598px
jump is the browser's own scroll anchoring — a re-run would have produced a
different number), resize held stable across 5 samples, and a +60s tick
moved the now-line 0.8px with `scrollTop` unchanged.

**Strange — BLOCKED, and both blockers are Fury's prose, written in this
very commit.** It said so plainly: *"the rule failed on its first day."*
1. **The `line-through` rule promised draining the code does not do.** It
   measured a past all-day bar as **byte-identical** to a current one
   (`rgb(78,82,86)`, weight 600) while past *timed* blocks correctly drain
   to `--muted` at weight 400 in the same view — `TimelineAllDayStrip.tsx`
   imports no `isPast` at all. **The behaviour predates C7 and Strange
   explicitly did not re-open it; the text was new.** This is the
   project's single most-repeated failure — three of CT1's four blockers
   were documentation promising a property the code lacked.
2. **The 44px exception did not enumerate its own new control.** `− Show
   less` measures **24.0px** in all 8 configurations. The exception's value
   is that it is *bounded*, so anything unenumerated falls back to the hard
   rule — making this an unsanctioned sub-44px control introduced by the
   same commit that wrote the boundary. **It explicitly did not ask for the
   control to grow** (283×24 is comfortable; inflating it would break the
   row rhythm the clause protects): *"the defect is the enumeration, not
   the pixel."*

**Both fixes were dictated by Strange and applied verbatim by Fury** —
clause (c) now names the collapse counterpart, and the draining sentence
is scoped to the surfaces that actually drain, with the strip's gap
recorded as *"a known gap, not a licence."*

**It also caught the contamination pattern in itself.** Its first 36-run
sweep ran while the other gate seeded: `CalendarEvent` went 4 → 22 → 41
mid-sweep, and **Chromium measured `+10` where WebKit measured `+23` for
the same fixture.** It recognised that as a *database* discrepancy rather
than an engine one — *"mission-16 round 3 repeating"* — and bracketed every
subsequent measurement with a count. Left the other gate's rows alone;
restored baseline exactly.

**Two notes worth acting on (C8):**
- **The `columnDays.length === 7` proxy inverts.** At **1280px the app
  renders `+23 more` in a 96px Month cell and `+23` in a 98px Week
  column** — the wider box gets the shorter label; and at 320 a 74.7px
  3 Day column shows the full label while a ~185px Week column at 1024
  does not. It also over-fires: `+2 more` ink is 35.4px in a 38.7px box at
  375 — it fits. And **nothing depends on it**: `min-w-0 overflow-hidden`
  is what actually closed Vision's blocker, unconditionally. **The wall
  tablet is a named primary device in DESIGN.md's Identity section**, which
  is where this reads worst.
- **`"Fri 6 events not loaded"` parses as "Friday, 6 events not loaded."**
  A number adjacent to a plural noun is read aloud as a count — a new
  ambiguity, not a terseness complaint. Strange judged the terse register
  *correct* for a per-column marker; it is the collision that needs fixing.

**Cleared, measured, not re-litigated:** the collapse control leaves the
fold at ~15 all-day items but is **reachable** — Strange expected a dead
end and measured that it is not (a sticky element taller than its
scrollport scrolls with content; a real click collapsed it at 26 lanes).
Scroll-to-now judged *as felt*: "now, with the day in front of you."
Alignment holds, the sticky wrapper is one unit, rule (d) verified — the
picker lists Schedule first.

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

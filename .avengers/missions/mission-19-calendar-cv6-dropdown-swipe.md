# Mission: CV6 — month dropdown + swipe-to-page

**Project:** family-hub (Marshee)
**Status:** CONTRACTS WRITTEN — preflight next
**Started:** 2026-09-06 · **Updated:** 2026-09-06

## Brief

- **Goal:** Two ways to move around the calendar that it doesn't have yet — a
  **month dropdown** behind the header title (present on every view), and
  **swipe-to-page** on the timeline, Month and Year. Plus the two structural
  debts that must land first, because CV6 and CD1 both build on them.
- **Done means:** the header title is a ≥44px control on every view opening a
  sheet with a compact month grid + `MonthChips`, and tapping a day jumps
  there **keeping the current view**; swiping left/right pages the timeline,
  Month and Year by exactly what the arrows do; **the arrows stay**; the
  six-leg gauntlet passes.
- **Out of scope:** **CD1 (long-press drag to reschedule) is a separate
  mission** — it depends on this one's `usePageSwipe` hook yielding to a
  long-press, so it cannot be written until that hook exists. Also out: K3
  filters/tags, K4 recurrence, the RSVP and search walkthroughs, Google sync.

## Danger register

Absolute, for every agent including Fury:

- **Never** `npm run db:seed` / `npm run db:reset`; never a Neon branch reset.
- **Never** create, update, delete or deactivate `User` rows.
- **Never** edit an existing migration. **This mission adds none** — it is
  entirely client-side navigation.
- The dev branch holds **real family data**. Report roles and counts, never
  names or event titles. **Four agents on this arc have leaked a real event
  title, a child's first name, or a credential into a transcript** — count
  characters rather than quoting.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`. Scoped
  `db:seed-*` / `db:clean-*` only; delete fixtures **by id as each
  measurement finishes**, not batched.
- **Never** `git add -A` / `git add .` — stage by explicit path. Run
  `git show --stat HEAD` after committing.
- If `.env` is copied to drive a production build, **delete it after and
  verify it is gone**.
- Direct pushes to `main` are blocked. Branch → PR → green Gauntlet → merge.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins TZ=America/Denver **inside `package.json`**, so
  `TZ=UTC npm test` silently runs Denver twice)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `npm run build`
- At delivery: `node .claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

Baseline entering this mission: **335 / 328 + 7 skipped / 335**.

## Assembled

- **Stark + Vision** — irreducible.
- **Strange** — a new control on every view and a new gesture; this is the
  gate that found CV5's real bug, and gestures are measurement-only territory.
- **Captain** — two new files, an extraction it named itself, and a hook whose
  public surface widens.
- **Banner — NOT assembled.** The plan's CV6 section is specific and the tree
  was read directly while writing these contracts; every structural claim
  below is quoted from a real grep, and the two that mattered are recorded
  under "Facts established before contracts". Said out loud so a gate can hold
  me to it.

## Facts established before contracts

Verified by command, not assumed — my boundaries have been wrong **seven
times** on this project, always from a false premise about what already
exists.

1. **`useCalendarNavigation` does NOT expose `jumpTo`.** Its return is
   `{view, anchor, today, step, goToToday, setView, openDay}`. It uses
   `jumpTo` internally at `:244`, `:272` and `:320`, destructured from
   `useCalendarPeriod` at `:105`. **`openDay(day)` forces `"day"` view**, so
   it cannot serve a dropdown that must preserve the current view. CV5/C3
   found this gap and recorded that *"CV6's dropdown hits this identical
   gap"* — C2 below is that contract.
2. **`useCalendarPeriod` does export `jumpTo`** (`:312`), typed
   `(anchor: Date, view: V) => void` at `:246`.
3. **The header title has THREE branches, and the middle one is a portal
   slot that must render no children of its own.** `CalendarHeader.tsx`
   ~`:198–215`: `title === null` → a pinned skeleton pulse; `pinned`
   (Schedule) → an **empty** `<span id={SCHEDULE_TITLE_SLOT_ID}>` that
   `ScheduleView` portals its scroll-driven `<h2>` into, whose comment warns
   that **any fallback children would sit ALONGSIDE the portaled content**
   rather than being replaced; otherwise → `<h2>{title}</h2>`.
4. **The title wrapper is pinned `h-7` (28px) on purpose** — its comment says
   it is *"the one piece of the header whose CONTENT depends on `today`"*, so
   the null-frame and the resolved-frame must match **exactly rather than by
   coincidence**. The arrows beside it are `h-11` (44px) — **but `showArrows`
   is `false` on Schedule**, so Schedule's row has no 44px sibling to hide a
   height change behind. C3 must measure both cases.
5. **`MonthChips` is already view-agnostic** — props are exactly
   `{anchor, onPickMonth}` — which is what CV5/C3 built it for. No change
   needed to reuse it.
6. **`SwipeActions` holds the exact machine CV6 wants**: `DIRECTION_LOCK_PX = 8`
   (`:44`), `GestureMode = "idle" | "undecided" | "swiping" | "scrolling"`
   (`:46`), a **try/caught** `setPointerCapture` (`:123`), `touch-pan-y`
   (`:201`), and next-click swallowing (`:145–146`).
7. **The plan's cited line for the v1 amendment is off by ~3.** It says
   `calendar-v1.md:244`; the sentence *"paging → visible arrows (swipe-only
   is hover-only's cousin)"* is at **~:247**. Recorded rather than propagated
   — a wrong line number in a contract becomes a wrong comment in the code,
   which is this project's named defect class.
8. **Sizes now:** `CalendarViews.tsx` **484/223**, `CalendarHeader.tsx` 233,
   `SwipeActions.tsx` 212, `MonthChips.tsx` 113,
   `useCalendarNavigation.ts` 333, `useCalendarPeriod.ts` 313.

9. **`ScheduleView.tsx` mounts its OWN `EventDetailSheet` and
   `TaskDetailSheet`** (`:460`+, two mounts, imported at `:12–13`), and its
   own comment at `:67` says it does so *"same as CalendarViews.tsx already
   does."* So the four-sheet block is **already duplicated across two
   files** — Captain's "no shared state beyond the four setters" describes
   `CalendarViews`' copy, not the whole picture. `DaySection`, `EventCard`
   and `TaskCard` mention the sheets **only in comments** (0 mounts each),
   so the duplication is exactly two-way. **C1 extracts `CalendarViews`'
   copy only** — `ScheduleView` is out of its boundary and is a large file —
   but a well-shaped `CalendarSheets.tsx` is what would let a later contract
   collapse the two. **Routed to Captain as a one-source-of-truth question,
   not fixed here.**

## Preflight settlements, C1 and C2

Both ran **0 hard failures, 2 judgement items each**. Settled by command
rather than skipped — mission-18 recorded twice that these were surfaced and
read past.

- **C1, "may-touch depends on must-not-touch":** `CalendarViews.tsx` imports
  from `src/lib/**`. Consume-unchanged — **C1 changes no behaviour at all**,
  it relocates JSX — so nothing being changed is decided over there and the
  contract is satisfiable inside its boundary.
- **C1, reference counts:** the question the counts pose is *do other files
  mount these sheets too* — and **yes**, which is fact 9 above. That is a real
  finding the count would not have produced without asking what the references
  do.
- **C2, "may-touch depends on must-not-touch":** `useCalendarNavigation`
  destructures `jumpTo` from `useCalendarPeriod` (`:105`). `jumpTo` is
  **consumed unchanged**; C2 adds a wrapper in the navigation hook and needs
  no edit to the period hook, so the boundary holds.
- **C2, `jumpTo` → 5 files: a NAME COLLISION, not five call sites.**
  `RecipeList.tsx`'s is **`jumpToClientY`**, the A–Z rail's own unrelated
  scroll function; `calendarViewConfig.ts:167` mentions `jumpTo` only in a
  comment. The real definition is `useCalendarPeriod.ts:301` and its only
  real consumer is `useCalendarNavigation.ts`. **A grep for this identifier
  returns two things that are not the same thing** — the same trap Captain
  filed against `MONTH_NAME_FORMATTER` in mission-18.

## Known risk, named before a gate finds it

`CalendarViews.tsx` is **484/223** and is **the only file in this arc with a
rising multi-mission trend** (459 → 492 → 478 → 484 — Captain, mission-18
N-C2). CV6 adds a sheet and a swipe wrapper to it, and **CD1 adds more**.
Captain called the extraction *"flagged, not required"* — **C1 does it
anyway**, before anything grows the file, because this project has repeatedly
paid for extracting after rather than before, and because a boundary that
forbids the shared file is how duplication gets written instead.

## Contracts

C1 and C2 touch disjoint files and go in **parallel worktrees**. C3 needs
both. C4 needs C1. C5 is documentation and can go any time.

### C1 — extract the sheets block (Captain's named seam)
- **Status:** **DONE** — merged. `CalendarViews.tsx` **484 → 438 total /
  223 → 182 code**; new `CalendarSheets.tsx` **146/104**. Four sheets: **0**
  left in `CalendarViews`, **4** in `CalendarSheets` (Fury's own grep).
  **Captain's "no shared state beyond the four setters" was verified, not
  trusted, and HELD** — each of the four state names appears only inside its
  own conditional block; `canManage`, `people` and `router` are shared across
  the two detail sheets but are ordinary props/hook values, not a fifth piece
  of entangled state. The four setters stayed in `CalendarViews` because each
  is also read or set from `CalendarHeader` or `renderPeriodContent`, not only
  by the sheets.
- ⚠️ **THE LIVE-BROWSER TRACE COULD NOT BE DONE, AND THE BUILDER SAID SO
  RATHER THAN QUIETLY SUBSTITUTING.** The contract asked for a before/after
  DOM trace *"the way mission-18/C1 did"* — i.e. against a production build
  over CDP. That needs an authenticated session, and **minting a session JWT
  by hand — the pattern this project sanctioned back in Phase 1e — was
  BLOCKED by the environment's own security classifier as credential
  forging.** The builder had no real family password and correctly did not
  look for a way around the block.
  **What it did instead is arguably stronger for a pure JSX move**: it
  reconstructed the pre-extraction block byte-faithfully from
  `git show 977fff4:src/components/CalendarViews.tsx`, then rendered **the
  old reconstruction and the new `CalendarSheets` with identical props** for
  all four sheet-open states through `react-dom/server`, shimming **only**
  `next/navigation`'s `useRouter` and `server-only` (both of which throw
  outside Next's bundler) — **`RadioSheet`, `ActionSheet`, `EventDetailSheet`
  and `TaskDetailSheet` were the real production components throughout.**
  All four rendered **byte-identical** markup (2686 / 1994 / 2554 / 2980
  chars, old == new), and the **positive control** — deliberately flipping
  `canManage` on one side only — correctly reported DIFFERENT, so the harness
  is not blind. The router call log was empty.
  **This is the right shape of answer to a blocked verification**: name the
  block, don't route around it, substitute the strongest thing that is
  actually available, and prove the substitute can fail.
- ⚠️ **A worktree artifact that can masquerade as a broken tree, found by
  Fury after merging:** a leftover agent worktree under `.claude/worktrees/`
  is **inside the repo**, so `npx eslint .` walks into its `.next` build
  output and reports **thousands of errors** in generated bundles
  (`no-require-imports`, `ban-ts-comment`, …). Nothing is wrong with the
  source. `git worktree remove -f -f` (a live agent's worktree is *locked*,
  so a single `-f` is refused) then `git worktree prune` clears it, after
  which `eslint .` is clean. **Worth knowing before someone debugs a
  phantom lint failure.**
- **Objective:** (as written)
- **Objective:** Move `CalendarViews.tsx`'s four-sheet block into
  `src/components/CalendarSheets.tsx`, with **no behaviour change**, before
  CV6 grows the file.
- **Boundaries:** may touch `src/components/CalendarViews.tsx`, new
  `src/components/CalendarSheets.tsx` · must not touch
  `src/components/CalendarHeader.tsx`, `src/components/MonthChips.tsx`,
  `src/components/SwipeActions.tsx`, `src/lib/**`, `src/app/**`, `prisma/**`.
- **The seam, from Captain:** the block mounting `RadioSheet` (view picker),
  `ActionSheet` (Add → Event/Task), `EventDetailSheet` and `TaskDetailSheet`
  — *"no shared state beyond the four setters."* Verify that claim before
  relying on it; if a fifth piece of state is entangled, say so rather than
  dragging it along.
- **Verification:** the gauntlet; both line counts for both files (total AND
  code — STRUCTURE.md judges the cap on total and asks for both); and a
  **before/after DOM trace** proving behaviour is preserved — open each of the
  four sheets and diff the rendered markup, the way mission-18/C1 did.
- **Evidence required:** the two line counts each; the four-sheet DOM trace
  with its positive control; gauntlet output.
- **Done criteria:** `CalendarViews.tsx` total meaningfully below 484 with the
  four sheets gone; all four still open and close; gauntlet green.

### C2 — a view-preserving jump on the navigation hook
- **Status:** **DONE** — merged. `jumpToDay(day)` is on the hook's public
  surface, and the logic sits in an **exported pure function**
  `jumpToDayTargets(view, day)` that takes the view as a **parameter** — so
  "preserves the current view" is a property of the signature, not a habit of
  the caller, and it is unit-testable without mounting a hook. Verified by
  Fury from source, not the report: the returned object now ends
  `openDay, jumpToDay`, and `jumpToDayTargets` hardcodes no view.
  Tests **335 → 336** on all three legs (336 / 329+7 skipped / 336).
- **The `jumpTo` + `navigateTo` question was answered rather than
  cargo-culted**, which is what the contract asked for. They are **not**
  redundant: `jumpTo` is a synchronous `setState` on the local cursor, so the
  jump paints immediately instead of waiting on the slow `force-dynamic`
  round trip; `navigateTo` is the real `router.push`, which is what changes
  the URL (so a reload, a shared link, or Back lands on the right day) **and
  what moves the server's fetch window**. Drop the first and the screen shows
  the old period until the resync effect notices; drop the second and the
  jump survives nothing and never refetches. `jumpToDay` reuses the pair
  exactly — the only thing it changes from `openDay` is not hardcoding
  `"day"`.
- **Red-then-green was really done**, with the break chosen well: the test was
  first run against an implementation hardcoding `"day"` — *`openDay`'s actual
  behaviour*, i.e. the realistic wrong answer rather than a strawman — and
  failed with `'day' !== 'week'`. The real implementation was then restored
  and **diffed byte-identical against a pre-break backup** before the green
  run, so the passing test is known to be testing the shipped code.
- **Note:** the builder ran `npx prisma generate` in its fresh worktree, since
  `src/generated/prisma` does not exist in a new checkout and `tsc` cannot run
  without it. Generated output only, outside every boundary, and disclosed.
  **Worth knowing for every future worktree-isolated contract in this repo.**
- **Objective:** (as written)
- **Objective:** Give `useCalendarNavigation` a public way to jump to a day
  **keeping the current view** — the thing C3's dropdown needs and the gap
  CV5/C3 recorded.
- **Boundaries:** may touch `src/lib/useCalendarNavigation.ts` and its test
  file if one exists · must not touch `src/lib/useCalendarPeriod.ts`,
  `src/components/**`, `src/app/**`, `prisma/**`.
- **The gap, exactly (fact 1 above):** the hook returns
  `{view, anchor, today, step, goToToday, setView, openDay}`. `openDay(day)`
  **forces `"day"`**. `jumpTo` is used internally at `:244`, `:272`, `:320`
  but never returned.
- **The shape:** add `jumpToDay(day: Date)` that does what `openDay` does but
  with the **current** view instead of `"day"` — i.e. `jumpTo(day, view)` then
  `navigateTo(view, day)`. **Read `openDay` and mirror it**, including its
  `if (today === null) return;` guard; do not invent a second navigation path.
  **Do not** simply re-export raw `jumpTo` — a caller that could pass any view
  would duplicate `setView`'s job and widen the surface more than C3 needs.
- **Watch:** `openDay` calls **both** `jumpTo` and `navigateTo`. Establish why
  before copying it — if one of the two is redundant, say so rather than
  cargo-culting the pair.
- **Verification:** the gauntlet; and a **test** asserting `jumpToDay`
  preserves the view for at least three views (one timeline, Month, Year),
  where **the test is proven able to fail** — show it red against a
  deliberately view-forcing implementation before it goes green. A regression
  test never seen red proves nothing.
- **Evidence required:** the new public surface; the test red then green;
  gauntlet output; the answer on `jumpTo` + `navigateTo`.
- **Done criteria:** `jumpToDay` exposed and view-preserving, tested, gauntlet
  green.

### C3 — the month dropdown
- **Status:** WRITTEN — dispatches after C1 and C2 are DONE.
- **Objective:** The header title becomes a **≥44px control on every view**,
  opening a sheet with a compact month grid + `MonthChips`; tapping a day
  jumps there in the current view.
- **Boundaries:** may touch `src/components/CalendarHeader.tsx`, new
  `src/components/MonthJumpSheet.tsx`, `src/components/CalendarSheets.tsx`,
  `src/components/CalendarViews.tsx` · must not touch
  `src/components/MonthChips.tsx` (**reuse it unchanged — it is already
  `{anchor, onPickMonth}`**), `src/components/MonthCell.tsx`,
  `src/components/MonthGrid.tsx`, `src/lib/useCalendarNavigation.ts` (C2 owns
  it), `src/lib/useCalendarPeriod.ts`, `src/app/actions/**`, `prisma/**`.
- **⚠️ THE HARD PART, and it is not the sheet — it is Schedule's title.**
  Facts 3 and 4 above: the title has three branches, Schedule's is an
  **empty portal slot** whose comment warns that any children of its own
  would render **alongside** the portaled `<h2>` and produce the exact double
  label mission-16/D2 removed; and the wrapper is pinned **`h-7` (28px)** so
  the null-frame and resolved-frame match exactly. **`showArrows` is `false`
  on Schedule**, so Schedule has no 44px sibling to absorb a height change —
  a naive "make it `h-11`" grows the header on Schedule only, and the pinned
  skeleton would no longer match the resolved frame. **Decide deliberately and
  write down which you chose:** wrap the slot so the portal target is
  unchanged and childless, or make the control the slot itself. Whichever —
  **the skeleton frame must move with it**, or CV4's measured-skeleton lesson
  is re-learned.
- **The sheet:** compact month grid (colour bands shrunk to dots; today
  filled) + `MonthChips`. Tapping a day calls C2's `jumpToDay`.
- **Verification:** the gauntlet; **44px minimum on the title control in all
  six views**; an **unoccluded-target check** (`elementFromPoint` **at the
  scroll position the user actually arrives at** — a sweep taken
  scrolled-to-bottom once reported zero failures on a button that was
  occluding a day number); header height measured **null-frame vs
  resolved-frame on Schedule AND on a view with arrows**; and Schedule's
  title showing **exactly one** label, not two.
- **Evidence required:** the measured control height per view; the two
  header-height frame comparisons; the Schedule single-label count with a
  positive control; a real tap changing the rendered period **without**
  changing the view; gauntlet output.
- **Done criteria:** the control is ≥44px on all six views, opens the sheet,
  jumps while preserving the view, Schedule still shows one live label, no
  header layout shift, gauntlet green.

### C4 — `usePageSwipe`
- **Status:** WRITTEN — dispatches after C1 is DONE.
- **Objective:** Extract `SwipeActions`' gesture machine into a reusable
  `usePageSwipe` and mount it on **timeline, Month and Year only**, calling
  the same `step()` the arrows call. **The arrows stay.**
- **Boundaries:** may touch new `src/lib/usePageSwipe.ts`,
  `src/components/SwipeActions.tsx`, `src/components/CalendarViews.tsx` ·
  must not touch `src/components/CalendarHeader.tsx`,
  `src/components/MonthChips.tsx`, `src/lib/useCalendarNavigation.ts`,
  `src/lib/useCalendarPeriod.ts`, `src/app/actions/**`, `prisma/**`.
- **What to preserve, by name (fact 6):** the 8px undecided zone
  (`DIRECTION_LOCK_PX`), the four-state `GestureMode`, the **try/caught**
  `setPointerCapture` (it throws when the pointer isn't current, and an
  unguarded call once abandoned a gesture mid-drag leaving a row stuck to the
  finger), `touch-pan-y`, and **swallowing the next click**. Read
  `SwipeActions`' own header comment — it records why each exists.
- **The release decision must read a REF, not React state.** This is written
  in this project's history: state batching left an earlier version reading a
  stale drag distance and snapping shut on swipes that should have opened.
- **Designed knowing CD1 follows:** the hook must **yield early if a
  long-press has claimed the pointer**. CD1 does not exist yet, so build the
  seam — a documented way for an owner to say "this gesture is mine" — and do
  **not** build the long-press itself.
- **`SwipeActions` must keep working identically.** It is live on Inventory
  and Shopping rows, which Bryce's wife uses. If the extraction cannot leave
  it byte-identical in behaviour, prove equivalence rather than asserting it.
- **Verification:** the gauntlet; a **real gesture** paging each of
  timeline/Month/Year; a vertical drag still scrolling; the arrows still
  working; `SwipeActions` still opening and closing on a real row. **Note the
  standing limit honestly:** this project has twice recorded that synthetic
  `PointerEvent`s cannot drive this gesture to a settled state — if that holds
  again, say so and say what you *could* prove, rather than reporting a
  gesture you did not complete.
- **Evidence required:** the extracted hook's surface; the preserved-machine
  checklist item by item; whatever gesture evidence is genuinely obtainable,
  **with its limits stated**; gauntlet output.
- **Done criteria:** swipe pages the three views, arrows unaffected,
  `SwipeActions` unchanged in behaviour, gauntlet green.

### C5 — amend the v1 plan so swipe reads as additive
- **Status:** **DONE** — done by Fury directly rather than spending a builder
  dispatch on a one-sentence documentation edit. `calendar-v1.md:247` now
  records that the line **rules out swipe-*only*, never swipe**, that CV6 adds
  the gesture as an addition with the arrows kept, and that it is not to be
  cited against the gesture. Anchored on the sentence, **not** on the v2
  plan's cited line number, which is off by ~3 (fact 7).
- **Objective:** `.avengers/plans/calendar-v1.md` ~`:247` reads *"paging →
  visible arrows (swipe-only is hover-only's cousin)"*. That reasoning is
  **correct and stays** — amend it to record that **CV6 adds swipe as an
  addition, arrows kept**, so a future reader doesn't cite it against swipe.
- **Boundaries:** may touch `.avengers/plans/calendar-v1.md` only.
- **Note the line number is ~247, not the 244 the v2 plan cites** (fact 7).
  Anchor on the sentence, not the number.
- **Done criteria:** the sentence records both facts; no other plan text moves.

## Preflight

Run on every contract immediately **before its dispatch** — not when written.
A sequential contract's boundary is true at dispatch time, not writing time;
mission-18 established that by having C4's preflight legitimately FAIL on a
file C3 had not yet created.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | not yet run | — | — |

## Handoff log
- 2026-09-06 — **C1 and C5 DONE; C1 merged. Combined-tree gauntlet re-run by
  Fury and green: 336 / 329 + 7 skipped / 336, tsc 0, eslint 0, build clean.**
  Both worktrees removed and pruned. **C3 and C4 both touch
  `CalendarViews.tsx`, so they are SEQUENTIAL, not parallel** — C3 first,
  because its Schedule-title problem is the mission's real design risk and is
  better settled before another contract edits the same file.

- 2026-09-06 — **C2 DONE and merged.** Boundary exactly its two files.
  Gauntlet re-verified. The hook now exposes `jumpToDay`, so **C3 is
  unblocked** on that dependency. Waiting on C1 (the sheets extraction) before
  C3 and C4 can dispatch, since both touch `CalendarViews.tsx`.
  **Baseline moves: tests are now 336 / 329 + 7 skipped / 336.**


- 2026-09-06 — **Mission opened on branch `claude/calendar-cv6`.** Scope read
  from `.avengers/plans/calendar-v2.md`'s CV6 section. **CD1 deliberately
  excluded** — it depends on C4's hook yielding to a long-press, so it cannot
  be contracted until that seam exists. Eight structural facts established by
  command before any contract was written (above), two of which changed the
  contracts: the navigation hook genuinely lacks a public `jumpTo`, and
  Schedule's header title is a portal slot with a pinned height and no 44px
  sibling — which makes C3's "≥44px on every view" a real design decision
  rather than a class change.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

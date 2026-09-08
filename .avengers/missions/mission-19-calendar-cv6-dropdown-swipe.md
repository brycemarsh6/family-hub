# Mission: CV6 — month dropdown + swipe-to-page

**Project:** family-hub (Marshee)
**Status:** **ALL 5 CONTRACTS + 2 FIX CONTRACTS BUILT. Vision PASS, Captain PASS
(both pass 2); Strange pass 2 outstanding on F2.** Branch `claude/calendar-cv6` —
**no PR, nothing live, and 11 commits AHEAD of its own remote** (the pushed-at-pause
state is `1755d00`; both fix contracts are local-only).
**Started:** 2026-09-06 · **Updated:** 2026-09-08

> ⚠️ **This header said "C4 NOT BUILT" for two days after C4 was built**, because
> C4's own status line was updated and this one was not. Captain caught it at pass 2
> and named the cost exactly: *"Had I acted on it I would have reported on
> `usePageSwipe.ts` — a file F1 modified — believing it did not exist."* A fresh
> session resuming from it would have built the hook a **second** time. Fifth
> recorded instance of this project's doing-vs-recording gap, and the first that is
> a stale **inventory** rather than a stale next-step. `CLAUDE.md`'s pause entry
> carried the same false line and is corrected too.

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
8. **Sizes AT DISPATCH, 2026-09-06 — NOT current** *(re-dated 2026-09-08 on
   Captain's pass-2 NOTE 4; this was headed "Sizes now" and so read as live. At
   HEAD they are `CalendarViews.tsx` 496/191, `CalendarHeader.tsx` 332/119,
   `useCalendarNavigation.ts` 390/150.)*: `CalendarViews.tsx` **484/223**, `CalendarHeader.tsx` 233,
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
- **⚠️ Line count, added 2026-09-08 on Captain's pass-2 NOTE 5 — this entry
  recorded none, so a soft-cap crossing went unrecorded.** C2 added 57 lines to
  `useCalendarNavigation.ts`, taking it **333 → 390 total / 150 code** and across
  the 350 soft cap. **Not a split candidate** — 150 code is well under 350, which
  is the amended caps clause working exactly as `useScheduleWindow.ts` (431/172)
  taught it to. The finding was the silent crossing, so the next contract touching
  this hook starts from a true number rather than the 333 in fact 8.
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
- **Status:** **DONE** — committed to the branch. Boundary audited by Fury:
  exactly the four allowed files, and **`MonthChips` is genuinely untouched**
  (0 diff lines). Sizes **at `6a98c73`, measured with
  `preflight.mjs`'s `lineCounts` — the canonical counter per STRUCTURE.md**:
  `CalendarHeader.tsx` 304/**111**, `CalendarSheets.tsx` 197/**126**,
  `CalendarViews.tsx` **459**/**178**, `MonthJumpSheet.tsx` 132/80.
  *(Corrected 2026-09-08 on Captain's pass-2 NOTE 3: three of these four code
  counts were wrong — 168, 134 and 194 — and none named its counter. Totals were
  right, and no cap decision turned on them since every file was hundreds under,
  which is why Captain filed it as a NOTE rather than blocking a merge on a status
  line's arithmetic. Recorded anyway because mission-18 hit the same shape at a
  file that WAS near the cap.)* Gauntlet re-run by Fury: **336 / 329 + 7
  skipped / 336**, tsc 0, eslint 0, build clean.
- **THE SCHEDULE-TITLE PROBLEM WAS SOLVED WITHOUT TOUCHING THE HEIGHT AT
  ALL** — the answer the contract asked for and a better one than either
  option it offered. The control is an **invisible `position: absolute`
  overlay `<button>`**, a **sibling** of the three title branches (never a
  child of the portal slot), at `absolute inset-x-0 -inset-y-[9px] z-10`.
  Because it is absolutely positioned it **contributes nothing to flow
  height**, so it reaches the 44px floor (28 + 9 + 9 = **46px**, measured)
  while the row's rendered height stays **byte-identical to before this
  contract, on every view, in both frames**. Measured: `week` 44px in the
  null-frame and the resolved frame; **`schedule` 28px in both** — so
  `SCHEDULE_HEADER_BAR_HEIGHT_PX` (owned by the must-not-touch
  `ScheduleView.tsx`) needed no edit and cannot go stale. Growing the shared
  `h-7` box would have silently invalidated that constant across a boundary.
- **The single-label check had a working positive control**, which is what
  makes it mean anything: one real `<h2>` portaled into the real slot node →
  count **1**; then a raw fallback `<h2>` appended directly into the slot —
  *the exact mission-16/D2 failure mode* — → count **2**; removed → back to
  **1**. The counter can see two when there are two.
- **The sticky-occlusion check was taken at the scroll position actually
  reached**, per CV4's lesson: Schedule's list scrolled 1000px while the
  control's viewport `top` stayed pinned at **170px** across
  before/scrolled/restored, and a content marker moved **1154 → 154 → 1154**
  — proving content genuinely moved under a genuinely pinned control.
  `elementFromPoint` returned the control itself in all six views and all
  three scroll states.
- ⚠️ **Deliberate scope reduction, DISCLOSED IN THE CODE rather than
  silently:** the sheet has **no per-day "colour bands shrunk to dots"** —
  it is a plain day-number grid with today filled. The builder recorded why
  in `MonthJumpSheet.tsx`'s own header comment: the embellishment appears in
  neither the Done criteria nor the verification steps, and would have meant
  plumbing `events`/`tasks`/window data through a fifth sheet. **Fury accepts
  this** — but it is a real difference from the plan's wording and **Strange
  should rule on whether the plain grid is enough**, since a jump target with
  no density hint is a different affordance from one with it.
- ⚠️ **`CalendarViews.tsx` is back to 459 total / 194 code**, over the soft
  cap again after C1 brought it to 438. Not a blocker (194 code, 191 under
  hard) but **C4 adds the swipe wrapper to this same file** — Captain should
  see this before C4 dispatches.
- **The builder found a bug in its OWN harness, not the app:** an early
  version wrapped `CalendarHeader` in an extra `<div>` to find the portal
  slot, and that wrapper — being the sticky element's containing block, sized
  exactly to its child — **silently broke `position: sticky`** (measured: the
  "sticky" element moved −1000px in lockstep with scroll). Fixed by using
  `document.getElementById(SCHEDULE_TITLE_SLOT_ID)` in an effect, matching how
  `ScheduleView` itself does it — which also made the harness structurally
  closer to production.
- ⚠️ **Disclosed limit:** headless Chrome **could not be forced to a true
  375×812 window** in this sandbox (`--window-size`,
  `Emulation.setDeviceMetricsOverride` and `Browser.setWindowBounds` all
  reported success and left `innerWidth`/`innerHeight` unchanged). Every
  measured element was boxed to an explicit real 375px-wide container, so the
  numbers are honest measurements of 375px-wide UI — but the **surrounding
  browser chrome is not genuinely 375px**, so a real-device pass is still
  owed. Said plainly instead of worked around.
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
- **Status:** ✅ **DONE (`e653609`) — one deviation routed to the gates, see handoff log.** Preflight re-run at
  dispatch time as required: **0 hard failures, 2 judgement items, both
  settled by command rather than skipped** (this project has twice recorded
  preflight judgement items being surfaced and skimmed).
  **(a) may-touch depends on must-not-touch — SAFE, not
  BLOCKED-ON-CONTRACT:** `CalendarViews.tsx:117` already destructures `step`
  from `useCalendarNavigation`, and the arrows call `step(-1)`/`step(1)` at
  `:407-408`. C4 *reads* an already-exposed API; it does not need to change
  the hook, `CalendarHeader` or `MonthChips`, all three of which it merely
  renders. **(b) the blast-radius claim was FALSE and is corrected below** —
  three call sites, not two. Every other named fact verified present:
  `DIRECTION_LOCK_PX = 8` (`:44`), four-state `GestureMode` (`:46`),
  try/caught `setPointerCapture` (`:118-124`), `touch-pan-y` (`:201`), click
  swallowing (`:145`); and CD1 confirmed non-existent (no mission file, no
  `usePageSwipe`, no long-press anywhere in `src/`).
  `CalendarViews.tsx` is at **459 total / 178 code** — over the 350 soft cap,
  and C4 adds to it. Captain's call at the gate.
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
- **`SwipeActions` must keep working identically. It has THREE call sites,
  not the two this contract originally claimed** — corrected at dispatch-time
  preflight, 2026-09-08, by `grep -rn "SwipeActions" src/components/*.tsx`:
  `PantryRow.tsx:101` (Inventory), `GroceryRow.tsx:31` (Shopping) — both of
  which Bryce's wife uses — **and `RecipeList.tsx:324`** (cookbook
  swipe-to-unfile, Recipes v2/C1). The third is the one nobody would think to
  re-test, which is exactly why it is named here. `ScheduleView.tsx:173` is a
  **comment only**, not a call site. Note also that `RecipeList.tsx` contains
  a **second, unrelated** `setPointerCapture` — the A–Z jump rail — which is
  not this gesture and must not be touched. If the extraction cannot leave
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

### F1 — clear both gate blockers (pass-1 fix batch)

- **Status:** ✅ **DONE (`0bed8b4`).** **Batched deliberately** — re-gating after each
  one-line fix burns the budget that assembling minimally saved.
- **Objective:** Clear Captain's blocker and both of Vision's, and home the invariant
  that produced the first one so a fourth caller cannot reintroduce it.
- **Boundaries:** may touch `src/components/MonthJumpSheet.tsx`,
  `src/lib/monthLayout.ts`, `src/lib/monthLayout.test.ts`,
  `src/components/MonthGrid.tsx`, `src/components/YearView.tsx`,
  `src/lib/usePageSwipe.ts`, `src/lib/usePageSwipe.test.ts` · must not touch
  `src/components/SwipeActions.tsx`, `src/components/CalendarViews.tsx`,
  `src/components/CalendarHeader.tsx`, `src/lib/useCalendarNavigation.ts`,
  `src/components/ScheduleView.tsx`, `src/app/actions/**`, `prisma/**`.
- **Fix 1 (both gates) — the today marker.** `MonthJumpSheet.tsx:112` must pair the
  today test with the in-month test already computed beside it. **Do NOT change
  `onPickDay`** — tapping a padding cell and jumping to that day is correct behaviour
  for a jump sheet; only the *marker* is wrong.
- **Fix 2 (Captain, the structural half) — home the invariant.** Add
  `isTodayCell(day, shownMonth, today)` to `src/lib/monthLayout.ts`, beside the
  function that creates the padding in the first place, and route **all three**
  callers through it (`MonthGrid.tsx:215`, `YearView.tsx:85`,
  `MonthJumpSheet.tsx:112`). This is what makes the invariant reachable by
  `npm test` — three inline copies in `.tsx` files structurally are not.
- **Fix 3 (Vision) — stop eating the next tap.** Reset `swallowNextClick.current =
  false` in `handlePointerDown`, immediately before `mode.current = "undecided"`.
  Vision verified this on a patched *copy* and separately proved it does **not**
  defeat the swallow's real job. It is safe because the flag is set during
  pointermove, strictly after pointerdown.
- **Every fix ships a test that is proven able to fail.** Write it, watch it go
  **red** against the current code, then fix and watch it go green, and report both.
  *A regression test never seen red proves nothing* — this project's own law.
- **Verification:** the six-leg gauntlet; the red-then-green evidence above.
- **Done criteria:** all three blockers cleared, invariant homed and unit-tested,
  gauntlet green, no boundary file touched.

### F2 — make the month-jump control visible as a control (Strange pass-1 blocker)

- **Status:** ✅ **DONE (`8fbc50c`).**
- **Objective:** The month-jump control is the **sole entry point to CV6's headline
  feature** and is completely invisible — `absolute inset-x-0 -inset-y-[9px] z-10`
  and nothing else: no background, no border, no children, no `hover:`, no
  `active:`. The Prev arrow 8px away carries `active:bg-surface-2`; the Today circle
  is a filled disc. Give it a persistent affordance and a press state.
- **The geometry is CORRECT and must not regress** — Strange verified what Vision
  could not: **46.0px on all six views in both frames**, `elementFromPoint` returns
  the control at its centre in all twelve, **zero interactive elements overlapped**,
  and row height byte-identical null-frame vs resolved-frame (schedule 28px, others
  44px), so `SCHEDULE_HEADER_BAR_HEIGHT_PX` is genuinely safe. C3's structural
  solution stands; only visibility is missing.
- **Boundaries:** may touch `src/components/CalendarHeader.tsx` · must not touch
  `src/components/ScheduleView.tsx`, `src/components/MonthJumpSheet.tsx`,
  `src/components/CalendarViews.tsx`, `src/components/CalendarSheets.tsx`,
  `src/lib/**`, `src/app/actions/**`, `prisma/**`.
- **The fix, prototyped and measured by Strange outside the repo:** add
  `<ChevronDown aria-hidden="true" size={18} className="shrink-0 text-muted" />` as
  a **flex sibling after the three title branches**, inside the `h-7` span, with
  `gap-1` on that span. An 18px glyph in a 28px box adds **no** flow height. Add
  `rounded-lg transition-colors active:bg-surface-2` to the overlay button.
- **⚠️ Do NOT use the `justify-end` variant** — Strange measured it first and
  rejected it: it leaves a **78.3px gap** between title and caret on Schedule
  (343px span, no arrows) vs 26.3px on the arrow views, far enough to read as
  unrelated to the title. The caret is **glued to the title**, not pinned right.
- **⚠️ The caret must never become a child of the portal slot.** `ScheduleView`
  portals its own `<h2>` into that node; a child of its own would render alongside,
  reproducing the double label mission-16/D2 removed. A flex **sibling** is safe.
- **Verification:** the six-leg gauntlet; and re-measure at a genuine 375×812
  across **all six views × both frames**: row height unchanged (28 schedule / 44
  others), control still ≥44px, `elementFromPoint` still returns it at centre,
  `body.scrollWidth` still 375, no title truncation.
- **Note on the font:** Strange's worst-case ink clearance (16.8px, Day's
  "Wednesday, Jan 14") was measured in a **system font, not Manrope**, since
  next/font is unavailable in the harness. It bore on the rejected variant; if any
  clearance question arises, re-measure rather than citing that number.
- **Evidence required:** the measurement table across all six views and both
  frames, with its control; confirmation the caret is a sibling not a child;
  gauntlet output.
- **Done criteria:** the control is visibly a control and acknowledges a press;
  every geometry number above unchanged; gauntlet green.

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

## A THIRD bug in Fury's own tool, found by using it (2026-09-08)

`F1` would not preflight: *"no `### F1 — ...` heading"*, on a heading that is
plainly there. The cause is that `preflight.mjs`'s heading regex hardcoded
**`C`-prefixed** ids — `/^###\s+(C[0-9]+[a-z]?)\s*[—-]/` — so it was
**structurally blind to every non-`C` contract in this project's history**:
`B1-B6`, `CB1-CB7`, `DB1`, `F1`, `S1-S5`. Measured across all mission files,
**103 headings visible to the old pattern against 126 to the corrected one — 20
contract ids it could never see.** Preflight is *item one* on the dispatch
checklist, so each of those was either dispatched unpreflighted or hard-failed
and was worked around.

**The contract was right and the tool was wrong** — the same shape as
mission-19/C3's backtick-path false-FAIL, and the reason that matters is
unchanged: **a tool that cries wolf gets skimmed**, and this mission file
already records twice that preflight's judgement items were surfaced and
skipped. Renaming `F1` to fit the instrument was the wrong fix; `F1` and `F5`
already exist in this repo's own history.

Verified before shipping, not asserted: **positive control** (old tool
hard-fails on `F1`, patched tool preflights it fully), **zero regression** (every
one of the 103 previously-visible headings still found), and **zero narrative
sub-headings wrongly matched** across every mission file — the 1-3 uppercase
bound is what excludes them, since `### Captain pass 1 — BLOCKED` has a
lowercase second character. Synced to both `.claude/` copies and diffed
identical, per the standing rule that those two have no check between them.

**This is the third bug found in this tool by using it**, after Captain's
JSX-comment counter (mission-18) and the backtick-path false-FAIL
(mission-19/C3) — and all three were found only because someone acted on its
output instead of skimming it.

## A bug in Fury's own tool, found by using it

**C3's preflight HARD-FAILED on a file that was never claimed to exist.**
`grab()` treated **every backticked string in a boundary line as a path**, so
the prop shape `` `{anchor, onPickMonth}` `` — prose, written to tell the
builder *not* to change `MonthChips` — was resolved as a filename, found
missing, and reported as a wrong premise. **The contract was right and the
tool was wrong**, which is the one failure mode a pre-dispatch gate cannot
afford: a tool that cries wolf gets read past, and *this mission's
predecessor already recorded twice that its judgement items were surfaced and
skipped.*

**Fixed**: a path candidate must now actually look like one — a `/`, a glob,
or a file extension. Anything else is reported as a **visible WARN** ("read as
prose, not checked as a file — if that was meant to be a path, it is
mistyped") rather than dropped silently, because **a silent filter would hide
a genuinely mistyped path**, which is worse than the bug being fixed.

**Verified before being trusted, and the first attempt at verifying was
itself broken** — recorded because that is the recurring defect on this arc:
the pre-patch backup was run from `/tmp`, where it **could not resolve its
own `lib/claims.mjs`** and died. That comparison was **vacuous** and was
nearly reported as a real one. Re-run with the backup beside its dependency,
the before/after is genuine:

| | old tool | new tool |
|---|---|---|
| C3's `{anchor, onPickMonth}` | **FAIL** (false) | **WARN**, 0 hard failures |
| a genuinely missing path (probe) | FAIL | **FAIL** — still catches it |
| C1 (`new` file that now exists) | FAIL | FAIL — **identical**, so not a regression |

That last row is the positive control: C1's failure is **correct** — it is
marked `new` and C1 has since built it — and it appears in **both** tools, so
the patch changed nothing it shouldn't. **Second bug found in this tool by
using it** (Captain found the JSX-comment counter in mission-18). Synced to
both `.claude/` copies, per the drift lesson.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | **BLOCKED** | 1 | 11 — every one enumerated below, not counted |
| 1 | Vision | **BLOCKED** | 2 | 6 — every one enumerated below, not counted |
| 1 | Strange | **BLOCKED** | 1 | 9 — every one enumerated below |
| — | **F1** | ✅ DONE `0bed8b4` — cleared Vision ×2 + Captain ×1 | — | tests 344 → 350 |
| — | **F2** | ✅ DONE `8fbc50c` — cleared Strange ×1 | — | one consequence routed back to Strange |
| 2 | **Vision** | ✅ **PASS** | 0 | 10 — enumerated below |
| 2 | **Captain** | ✅ **PASS** | 0 | 13 — enumerated below |
| 2 | Strange | outstanding — F2 is entirely its blocker | — | — |

*(F1's row was previously buried inside the Strange pass-1 narrative rather than in
this table — Vision's pass-2 NOTE 7. Moved here 2026-09-08.)*

### Vision pass 2 — ✅ PASS (0 blockers, 10 notes)

**Both of its pass-1 blockers cleared, by its own instruments with negative
controls.** Today marker: a sweep of **730 days × 25 reachable months = 18,250 grid
renders** reads `daysAffected 0, cellsWrong 0` **while `positiveHits` is 730** — so
the fix did not over-correct into never marking today. **The same harness against
pre-F1 logic reports 282, its exact pass-1 figure**, so it is provably able to fail.
Identical under Denver, UTC, LA **and Pacific/Chatham (+12:45)**. It also closed an
instrument hazard of its own: its *expected* value used `isSameMonth`, so had that
function ignored the year the whole sweep would have been vacuous across its ±12
month reach — it read `mealPlanDates.ts:106` directly (compares year **and** month)
and confirmed with 11 adversarial probes including Feb 29 2028 and both 2026 DST
days, verified by direct grid membership to be genuinely padding cells.
Eaten tap: real Chrome over raw CDP at a genuine **375×812 DPR 2 touch**, against a
bundle **sha256-verified identical** to the shipped hook — all four cases correct on
the shipped tree, and the pre-F1 negative control reproduces **both halves including
the sub-threshold one**. **The disclosed deviation was proven behaviourally
identical exhaustively, not by reading:** `nextSwallowNextClick` over its complete
2×2 input domain returns exactly what the prescribed inline write would, **0
mismatches**. And the 6 new tests were proven able to fail by Vision itself, by
reverting both to their pre-fix implementations in a scratch copy (`pass 22 / fail
2`, control `24 / 0`).
**Boundary audit clean** — exactly the 8 declared files plus the mission file and
`preflight.mjs` (confirmed inert: not referenced from `src/`, `package.json` or
`next.config.ts`, and `.mjs` is outside `tsconfig`'s include). Every must-not-touch
file at **0 changed lines**; `src/app/` and `prisma/` untouched across the **whole
mission**, confirming no database write path.
**NOTES (all 10):** (1) **build is 34 routes, not the 30 recorded — wrong in both
passes**; no route changed all mission, so it was 34 at pass 1 too. Corrected above.
(2) `nextSwallowNextClick`'s unused `current` has **zero behavioural consequence**,
exhaustive over the full domain — supplied so Captain's ruling rests on a fact.
(3) ⚠️ **the pointerdown clear sits AFTER two early returns** (`:216` non-primary
button, `:217` `isGestureClaimed`), so it is not unconditional on "a new gesture
started". Unreachable today — the hook's one call site does not pass
`isGestureClaimed` — **but CD1 is the next mission and exists to pass it**, and
Vision named the exact resurrection: swipe pages (arms the flag, no compat click) →
long-press claims the pointer → pointerdown returns early → the stale flag eats the
click ending the long-press. **Making the clear the first statement retires the
class. Routed to CD1.** (4) the caret renders in the **null-frame too, where the
button is `disabled`** — which is *why* the two frames match at 0 geometry diffs, so
it is load-bearing, but it puts a tappability affordance on a control that cannot
yet be tapped. **Strange's call.** (5) two `assignLanes` tests fail under
`Pacific/Chatham` — **pre-existing**, reproduced against `main`; Chatham is not a
gauntlet leg. Recorded so the next agent reaching for it knows they are not theirs.
(6) the branch is **11 commits ahead of its own remote**, including both fix
contracts — the recorded "pushed for recoverability" property is stale. (7) F1's
ledger row was in the wrong section — fixed above. (8) `recordcheck` on the delta: 0
hard failures, 5 REVIEW, none actionable (two are positional references into frozen
history, already annotated as such). (9) F1 orphaned nothing — `inMonth` is still
used for styling at `MonthJumpSheet.tsx:131`, and `isSameDay` now appears **only in
comments** in all three re-routed files. (10) **no regression in the two re-routed
callers, proven not read:** a differential sweep of **1,333,710 comparisons each**
for `MonthGrid` and `YearView`, pre-F1 expression vs `isTodayCell`, **0
differences**, with a non-vacuity control returning 1.

### Captain pass 2 — ✅ PASS (0 blockers, 13 notes)

**Blocker cleared and verified by sweep rather than by reading the contract:**
`monthGridDays` has **exactly three** consumers and **all three** now call
`isTodayCell`. Net **−2 definitions**, and a fourth caller has one obvious import.
Crucially it also established what is **not** an instance: the remaining
`isSameDay(day, today)` sites (`TimelineGrid:388,541`, `DaySection:171`,
`WeekCard:50`, `ScheduleView:390`) iterate `columnDays` or a week, contain no
foreign days, and **routing them through `isTodayCell` would be wrong**.
`SwipeActions.tsx` has **zero commits across the entire branch**. Line counts
re-measured with a replica of the canonical counter and **cross-checked against
`wc -l` on five files, agreeing to the line**. And a positive worth stating: **both
fix contracts shipped with written boundaries in the mission file** — the
seven-times-recorded no-boundary failure did not recur.
**Its rulings on the two things routed to it:**
**The deviation — APPROVED, and the better call.** The constitution points this way
twice (`loginRateLimitPolicy.ts`'s split rule; the `validatedPeople` clause calling
an untestable decision *"CV3's `VIEW_CONFIG` lesson in a worse form"*), with
`nextGestureMode`/`resolveSwipeDirection` as literal in-file precedent. *"The
builder converted an untestable ref mutation into three real assertions. That is the
house pattern, not a departure from it."*
**The unused parameter — NOTE, and it would drop it.** No written rule reaches it,
so it cannot be a BLOCKER — but the signature is an **overclaiming signature**, the
repo's tracked overclaiming-comment class one level up: it presents as a transition
over `(current, event)` and is a function of `event` alone, and the cited precedent
does not cover it since `nextGestureMode` genuinely reads `mode`. Named future cost:
a third `SwallowEvent` whose correct answer depends on `current` would compile, pass,
and silently inherit `return true`.
**⚠️ THE DUPLICATION RULING KEPT — but Captain checked Vision's MECHANISM rather
than accepting it, and found it does not hold as stated, in a direction that is
WORSE.** `SwipeActions.tsx:156` `handleRowPointerDownCapture` is **not** a
compensating clear: it *sets* the flag, and only `if (open && mode.current ===
"idle")` — the tap-an-open-row-to-close behaviour. `SwipeActions.handlePointerDown`
(`:91-98`) does not clear it either. **So `usePageSwipe` did not drop a guard that
existed: both copies shipped the same latent defect, and F1 has fixed one of them.**
Reasoning from that (**Captain labels this explicitly as reasoning from code plus
Vision's measured premise, NOT its own measurement**): a ~30px touch drag on a
*closed* Inventory or Shopping row locks in, releases below `openWidth/2`, snaps
shut, no click ever arrives to clear the flag — and **the user's next tap on that
row is eaten**. Those are the two surfaces Bryce's wife uses daily. **Pre-existing,
in a file this mission was correctly forbidden to touch, on a surface the calendar
never interacts with — so NOT a merge condition.** It changes the migration's
urgency and content, which is what amendment B now records.
**Captain CLEARED ITS OWN pass-1 note 10** (`CalendarSheets.tsx:14` "the four
sheets"): checked properly, the sentence is **C1-scoped and historically accurate**,
and the file self-corrects three paragraphs down at `:31`. *"A correction is a change
and is not more trustworthy for being a correction — that applies to my findings
too."*
**The 191-vs-216 discrepancy reconciled exactly:** it is **the file's 25 blank
lines**. Vision counted non-comment lines *including* blanks; `preflight.mjs`
excludes them. Neither is wrong; STRUCTURE.md names `lineCounts` canonical, so
**191 stands** — and Captain proposes a one-line clarification of what "code"
excludes, since two gates producing 191 and 216 in good faith is the failure that
clause exists to end.
**Remaining notes:** `useCalendarNavigation.ts` 390/150 is over soft cap and
explicitly **not** a split candidate; `CalendarViews.tsx` is **net +12 over a mission
whose first contract existed to shrink it** (484 → 438 → 459 → 496; C1 bought 46,
CV6 spent 58) — under both caps, 191 code, not a split candidate today, but the only
file in the arc with a rising multi-mission trend, **and CD1 lands there and adds
code**; `src/lib/` now holds **15 `"use client"` modules, 10 of them `use*` hooks**
(mission-17's note said twelve), so amendment A's number needs updating; all standing
debts re-verified open with **none added**, though STRUCTURE.md's `withTimeZone`
instance list is **stale by one filename** (`scheduleWindowState.test.ts` no longer
defines it; `scheduleWindowStateRefresh.test.ts` does); `ScheduleView.tsx` still
mounts its own detail sheets, the residue of the standing sheets seam, routed to CD1.
**F2's three structural questions all PASS:** the portal slot is byte-identical and
childless, `lucide-react` is correct per outline-icons-only, and the tokens are
job-named. `CalendarHeader.tsx` **332/119**.

**F2 verified by Fury independently.** The caret is a flex **sibling** of the three
title branches inside the `h-7 gap-1` span — the portal slot is **still childless**,
so mission-16/D2's double label cannot return — and the overlay carries
`rounded-lg transition-colors active:bg-surface-2`. Only `CalendarHeader.tsx` moved
(32 insertions, 4 deletions); the builder's temp comparison file was deleted and the
tree is clean. Gauntlet green, **350 tests**, UTC still 343 + 7 skipped.
**The evidence is the strongest of this mission:** every geometry number was
measured against a **parallel render of the pre-fix file extracted from `HEAD~1`**
and diffed as result sets rather than re-read from source — row height, button rect,
`elementFromPoint`, overlap count and `body.scrollWidth` all byte-identical across
**six views × both frames**, in both themes. The press state was proven by a real
CDP `mousedown` plus a 150ms wait (`rgba(0,0,0,0)` → exactly `--surface-2`), **with
the already-shipped Prev arrow as a control** — which is what proves the transition
delay, not the fix, explained an immediate-read null and rules out an instrument
artifact.
**One consequence flagged by the builder rather than judged, routed to Strange
pass 2:** because the control is a childless `position: absolute` overlay (C3's
geometry decision, outside F2's boundary), the pressed highlight paints **above**
the title text and briefly obscures it — unlike the arrows, whose icon is a child of
their own button. The builder read it as an ordinary transient press-flash and said
so without deciding. **That is Strange's call, not the builder's and not Fury's.**

### Strange pass 1 — BLOCKED (1 blocker, 9 notes), run on the post-F1 tree

**BLOCKER — the month-jump control is invisible, on all six views.** It is the
**sole entry point to CV6's headline feature** and carries
`absolute inset-x-0 -inset-y-[9px] z-10` and nothing else: no background, no
border, no children, no `hover:`, no `active:` — while the **Prev arrow 8px away**
carries `active:bg-surface-2` and the Today circle is a filled disc. So the title
reads as a plain heading, and a tap that lands produces **zero pixels of change**
until the sheet animates. Violates `DESIGN.md` checklist item 5 (*"tappable looks
tappable"*). **Vision and Captain both PASSed this same code** — it does exactly
what it says, and the defect is only in what it *means*. That is precisely the
class Strange exists for, and the second time on this arc it has caught it.
**The geometry is CORRECT and must not regress** — Strange verified what Vision
could not: **46.0px on all six views in both frames**, `elementFromPoint` returns
the control at centre in **all twelve**, zero interactive elements overlapped, and
row height byte-identical between frames (schedule 28, others 44), so
`SCHEDULE_HEADER_BAR_HEIGHT_PX` is genuinely safe. C3's structural solution stands.

**⭐ THE MISSION'S HIGHEST-VALUE UNKNOWN IS SETTLED: swipe DOES page the
timeline.** Against the **real `TimelineGrid`** inside the **real swipe wrapper**
at a genuine 375×812 — left → `SWIPE_LEFT`, right → `SWIPE_RIGHT`, vertical →
nothing; real `MonthGrid` correct on all four cases including sub-threshold. Vision's
*"genuinely unknown"* no longer holds. **And Strange found the mechanism behind the
failed positive control:** synthetic touch `pointercancel`s after ~25px in a
scrolling host — but forcing `touch-action: none` **did not stop it**, and disabling
the inner scroller **did not stop it either**, so synthetic touch is not honouring
`touch-action` at all and the very arbitration `touch-pan-y` exists to drive is
never exercised. **What remains owed on a real device is now narrower**: not "does
swipe work", only "does a real finger's touch-vs-scroll arbitration hand the gesture
to the wrapper inside `TimelineGrid`'s scroller" — one minute on Bryce's phone.

**F1 confirmed genuinely fixed ON SCREEN, against pre-F1 controls that reproduced
both bugs.** Today marker: 0 marked in four negatives, exactly 1 in the positive
control — and the **pre-F1 tree rebuilt from `git show d5d33a5` reproduced the bug
in 3 of 4 negatives**, so the harness is proven able to fail. No regression on the
two re-routed callers. Eaten tap: reproduced independently with **real touch**
including the sub-threshold half; both register on the shipped tree.
**Strange disclosed its own two vacuous attempts** — a mouse drag always emits a
compat click that clears the flag, so the pre-F1 control passed and proved nothing;
it only trusted the third run when the control finally went red. It also found and
removed **its own harness artifact** (a 391px reading caused by forcing a 375 box
inside the app's own `px-4`) and re-ran unchanged.

**NOTES (all 9):**
1. **Q1 RULED — the plain grid is CORRECT and density dots would be a *defect*.**
   Uphold C3's omission as a decision, not a debt. The fetch window is 60+1 days
   each side = **123 days loaded**; the sheet reaches ±12 months = **~760 days**. So
   **~84% of the days the sheet can display have no loaded data**, and a dot-less
   day there would mean "not loaded", not "empty" — a lie on the large majority of
   its reach, and exactly the two-states-where-there-are-three collapse two gates
   have already caught on this arc. **The sheet is honest *because* it makes no
   content claim.** Recorded so a later contract doesn't "finish" it.
2. **Q5 — no fourth ambiguity.** Same reason: jumping to an unloaded month routes
   through `jumpToDay` → `navigateTo`, which moves the server window, so the
   existing loading / empty / outside-window machinery applies unchanged.
3. **Q2 — the sheet names no year, and its strip contains three chips reading
   "Sep".** Measured at anchor Sep 2026: 25 chips, **11 duplicate labels**. The grid
   shows day numbers only and the sheet's `<h2>` is the static "Jump to a date".
   **A NOTE because it is recoverable** — Strange drove the real sheet, tapped the
   leftmost "Sep", and the strip re-anchored to show "Jan 2025". Fix if taken:
   render `formatMonthTitle(shownMonth)` above the grid.
4. **3 Day's title is byte-identical across years**, which is what makes NOTE 3
   bite hardest there: `formatThreeDayRange` gives `"Sep 15–17"` for **both** 2025
   and 2026. Week and Day differ only by a weekday name, which no human reads as a
   year. Pre-existing, but CV6 makes reaching a distant year far easier.
5. **Strange's own prototype's weakness, quantified so it isn't adopted blind.**
   It measured a `justify-end` caret first and **rejected it**: 78.3px gap between
   title and caret on Schedule vs 26.3px on the arrow views. Hence the caret is
   *glued to the title*. Its 16.8px worst-case ink clearance was measured in a
   **system font, not Manrope** — re-measure rather than cite it.
6. **Q4 — swipe has no in-progress feedback; a real gap, not a blocker.** A drag
   under 60px produces literally nothing: no movement, no page turn, and (post-F1)
   no eaten tap. `SwipeActions`, the house's other gesture, tracks the finger live.
   A NOTE because **the arrows stay**, so nothing is unreachable and no written rule
   is violated. Shape if ever taken: a live `translateX` on the wrapper.
7. **In-month vs padding day numbers are distinguished by colour alone at 1.47:1
   light / 2.24:1 dark** — the *same* 1.47:1 CV5 routed as a leftover for
   `YearView`. Milder here: both colours clear AA against the sheet background
   independently, cells are full 44×44 targets, and because F1 deliberately left
   `onPickDay` alone, **tapping a padding cell jumps correctly**. Informational, not
   load-bearing.
8. **⚠️ CORRECT THE MISSION FILE'S AND `CLAUDE.md`'s RECORDED INSTRUMENT LIMIT — it
   is wrong for this setup.** See the correction written into the traps section
   below. A future gate must not skip a width measurement on the strength of it.
9. **Everything else measures clean.** Day cells 44×44, close button 44×44, chips
   44 tall. Sheet is 448px and fits without scrolling at 375×812 **and at 375×667
   (iPhone SE)**. No horizontal overflow in either theme. All contrast pairs pass
   both themes (heading 7.88/13.68, selected chip 5.08/7.93, unselected 5.38/6.12,
   today cell 5.08). Component vocabulary clean — reuses `MonthChips` untouched and
   `SHORT_DAY_NAMES`/`formatDayLabel` from the canonical `mealPlanDates`, inventing
   no one-off. The invisible overlay occludes nothing that matters.
| — | **F1** | ✅ **DONE `0bed8b4`** — all 3 blockers cleared | — | tests 344 → 350 |

**F1 verified by Fury independently, not taken on report.** All three today-test
call sites now route through `isTodayCell` (`MonthJumpSheet.tsx:122`,
`MonthGrid.tsx:216`, `YearView.tsx:86`); the invariant is homed beside
`monthGridDays` — the function that creates the padding it guards against — and is
now reachable by `npm test`, which three inline `.tsx` copies structurally were
not. `onPickDay` is unchanged, per both gates' instruction that tapping a padding
cell to jump is *correct*. `pointerdown` clears the stale swallow flag (`:222`)
while `lockToSwiping` still arms it (`:252`) and the click-consume path is intact
(`:281-282`). Every must-not-touch file confirmed at **0 changed lines**.

**Disclosed deviation, and it was the right call:** the contract prescribed an
inline `swallowNextClick.current = false`. The builder extracted the decision into
a pure exported `nextSwallowNextClick` instead, **because the contract's own
"every fix ships a test proven able to fail" requirement is unsatisfiable against
an inline ref mutation in a `"use client"` hook — this toolchain has no DOM, so
only a pure exported decision is reachable by `node:test`.** Same reasoning
`nextGestureMode`/`resolveSwipeDirection` already established in that file. Net
behaviour identical; disclosed rather than done silently.
**For the gates to rule on, not Fury:** `nextSwallowNextClick(current, event)`
never reads `current` — it is `pointerdown → false`, otherwise `true`. Eslint is
clean and it mirrors `nextGestureMode`'s signature, but an unused parameter on a
pure function is a wart and it is Captain's call, not mine.

**Both fixes proven RED before GREEN**, per this project's law that a regression
test never seen red proves nothing: `isTodayCell`'s three tests failed with
*"isTodayCell is not a function"*; `nextSwallowNextClick`'s failed on a
placeholder returning `current` (`true !== false`). Gauntlet green all six legs,
**350 tests** (UTC 343 + 7 skipped — the baseline skip count preserved).

**Both gates gated all four contracts at once** (`977fff4..d5d33a5`), since none of
CV6 had ever been gated. **They independently found the same blocker by different
routes** — Captain by reading the constitution's own prediction, Vision by rendering
it with a positive *and* a negative control. Vision's second blocker is its own.

### Captain pass 1 — BLOCKED (1 blocker, 11 notes)

**BLOCKER — `MonthJumpSheet.tsx:112`, the today marker has no in-month guard.**
`isToday = isSameDay(day, today)` wins the className ternary at `:121`, so an
adjacent-month padding cell renders `bg-accent text-accent-fg`, indistinguishable
from a real today — while `inMonth` sits computed and unused on the very next line.
**`DESIGN.md:207` predicted this in writing one mission ago** — *"a third caller
would reintroduce this with no compile error"* — and `MonthJumpSheet` is that third
caller, one mission later. Measured across 2026: **141 days** affected, with an
in-month control reading 1==1 so the harness is not reporting a constant. The other
two callers are correct (`MonthGrid.tsx:215`, `YearView.tsx:85`, both fixed in
mission-18/C6).

**NOTES (all 11):**
1. **The `usePageSwipe`/`SwipeActions` duplication is a NOTE, not a BLOCKER** —
   the ruling Fury asked for. Captain checked **its own precedent rather than its
   instinct**: every prior instance of this shape (`parseLocalDateString`,
   `withTimeZone`, month names, `validatedPeople`, `fetchWindow`) was a NOTE at
   first sighting with the BLOCKER set at the next copy, and *"a builder needs to be
   able to know in advance what will pass."* **Trip condition: a THIRD definition of
   the lock distance or the four-state mode is a BLOCKER — keyed to definitions, not
   to consumers**, since a threshold you can satisfy by copying instructs rather than
   restrains. It **corrects the builder halfway**: the can't-verify-a-runtime-refactor
   argument is decisive for the *stateful* half (`openWidth/2`, live `translateX`,
   `open` state) but does **not** reach `DIRECTION_LOCK_PX` (an import swap, `tsc`
   proves it) or `nextGestureMode` (pure, already unit-tested; Captain verified the
   hook's claim that it mirrors `:105-115` *exactly*, rather than trusting it).
2. **`useCalendarNavigation.ts` is 390/150 and crossed the soft cap during C2 —
   and nobody recorded it.** C1 and C3's status entries carry line counts; **C2's
   carries none**, and fact 8 still cites the pre-mission 333. Not a split candidate
   (150 code); **the finding is the silent crossing**, so the next contract touching
   the hook starts from a true number.
3. **`CalendarViews.tsx`'s measured trend contradicts the mission's narrative.**
   `main` 484/223 → after C1 **438** → after C3 459/194 → HEAD **496/191**. The file
   **entered at 484 and leaves at 496**: C1 absorbed one mission's growth, it did not
   reverse the trend. Explicitly **NOT a split candidate** — 154 lines from the hard
   cap and code *fell* 223→191. **CD1 should not open with a defensive extraction**;
   if it ever needs one, the remaining seam is the sheets **state** block (C1 took the
   rendering and left the state). Captain deliberately set no trip: the hard cap
   already is one.
4. **Captain CLEARS ITS OWN earlier framing of `ScheduleView`'s duplicate sheet
   mounts.** Measured `ScheduleView.tsx:459-520` against `CalendarSheets.tsx:148-174`:
   the behaviour is **genuinely divergent, not copied** — `ScheduleView`'s `onChanged`
   carries the entire mission-15/C7 vanishing-task fix, because Schedule is
   client-fetched over a sliding window while the other views are server-rendered.
   *"My prior verdict was mis-framed; C1 did not change it, my measurement did."*
   One fact for anyone revisiting: `CalendarSheets` **hardcodes** `onDeleted`/
   `onChanged` rather than taking them as props, so `ScheduleView` could not adopt it
   today; its `:44-48` comment claiming a reuse-shaped prop surface is half true.
5. **Month/weekday vocabulary CLEARED — the sixth definition did not arrive.**
   Captain ruled in mission-18 that a sixth would be a BLOCKER, so it checked:
   `MonthJumpSheet.tsx:5` imports `SHORT_DAY_NAMES` from the canonical
   `mealPlanDates` and reuses `formatDayLabel` for its `aria-label`. Still five.
   *"The mission's cleanest structural result, and it was not accidental."*
6. **Placement, dependency direction and naming all clean.** `grep -rn "@/app"
   src/lib/` and `grep -rn "@/components" src/lib/` both **empty**; no cycle.
   Filename-names-a-live-export holds on all three new files. `CalendarHeader`'s new
   `onOpenMonthJump` is **required**, so every call site is compile-forced.
7. **`MonthChips` correctly sits OUTSIDE the swipe wrapper** (`CalendarViews.tsx:272`
   vs `:273`), documented in place — it owns its own `overflow-x-auto` and would have
   fought the same gesture.
8. **`usePageSwipe`'s four zero-referenced type exports are house convention, not
   dormant exports.** Established rather than assumed: `useCalendarNavigation.ts:90`
   exports `CalendarNavigation`, also 0 external references. No finding.
9. **`openDay` does not route through `jumpToDayTargets`** — two expressions of one
   two-line shape, one of them tested. Fold it in if anything else touches it.
10. **`CalendarSheets.tsx:14` opens "the four sheets" while the file mounts five**
    (amended honestly at `:31`, so a reader reaches the truth — but the first
    sentence is now false alone, and this repo tracks comments outliving evidence).
11. **Every standing debt confirmed still open, and this mission added to none:**
    `ASSIGNABLE_ROLES` still a filter predicate not a total record; `toDateInputValue`
    ×3; `withTimeZone` ×4; no `src/lib/testing/`; no `fetchWindow.ts`;
    `validatedPeople` ×2; `calendarDayDiff` still an unguarded loop on an invalid
    `Date`; `HubNav.tsx` still exports only `HubBottomNav`. **Test-glob reach
    confirmed:** `usePageSwipe.test.ts` matches `src/lib/*.test.ts`.

### Vision pass 1 — BLOCKED (2 blockers, 6 notes)

**Gauntlet re-run, all six legs green and exactly matching the builder's claim:**
tsc 0, eslint 0, Denver 344/344/0, UTC 344 → 337 + **7 skipped (matches baseline)**,
LA 344/344/0, build clean — **34 routes, not the 30 recorded here and at pass 1;
corrected 2026-09-08 on Vision's pass-2 NOTE 1, which measured 34 and confirmed no
route changed anywhere in the mission, so it was 34 at pass 1 too.** Confirmed `usePageSwipe.test.ts` is genuinely
*executed*, not merely present. **Boundary audit clean.** Evidence spot-checked
rather than trusted: C1's "byte-identical extraction" reconstructed from
`git show 977fff4:` and matched; `touch-pan-y` confirmed to actually compile into
the CSS bundle; every line-number claim in the new comments resolves correctly.

**BLOCKER 1 — the same `MonthJumpSheet` today marker**, found independently and
rendered with **both a positive and a negative control**. Vision's sweep is wider
than Captain's: **282 of 730 days across 2026-2027**, *higher* than the 126/365
`DESIGN.md` measured for Year **because this sheet lets you browse anywhere**.
Concrete: on Thu 1 Oct 2026, open the sheet and tap "Sep" — 1 October is a trailing
padding cell in September's grid and renders with the today fill.

**BLOCKER 2 — `usePageSwipe.ts:179,215,243-248`: every swipe silently eats the
user's next tap, including swipes that do nothing at all.** `swallowNextClick` is
set on lock-in at `:215` and cleared **only** inside `handleClickCapture` — but on
touch, a drag past Chrome's tap slop produces **no compat click**, so the flag
survives into the next interaction. Measured through real Chrome
`Input.dispatchTouchEvent` against the **shipped** hook, positive control first:
a tap alone fires `DAY_TAP`; a tap immediately after any swipe fires only
`BROWSER_CLICK`; a second tap works. **The worse half is a 30px sub-threshold drag** —
it crosses the 8px direction lock but not the 60px page threshold, so it produces
*no visible feedback whatsoever* and **still eats the next tap**. On a phone, an
imprecise tap that drifts 10px is exactly that gesture. Applies to Month and Year
(confirmed by grep that only `TimelineGrid` has an inner `overflow-y-auto`).
**Vision verified the fix rather than prescribing it** — a patched *copy*, repo
untouched — and separately proved the fix does not defeat the swallow's real job
(a mouse drag starting on a day cell still suppresses its click, identically on
both trees). Safe because the flag is set during pointermove, strictly after
pointerdown.

**NOTES (all 6):**
1. **C4's objective was not satisfied; its Done criteria were** — Vision's ruling,
   since Fury asked for it. The verb was "Extract" and nothing was extracted, but
   the criteria said *"`SwipeActions` unchanged in **behaviour**"*, which is the
   weaker wording a copy satisfies. Vision could construct no scenario where drift
   yields *wrong* rather than *divergent* behaviour, so under its own severity law it
   declined to manufacture a blocker in Captain's lane. **But it hands Captain the
   fact that decides it: the copy has ALREADY cost a defect.** BLOCKER 2 exists
   *precisely because* `SwipeActions`' compensating `handleRowPointerDownCapture` did
   not come across. *"That is not a hypothetical drift cost — it is a shipped one."*
2. **One third of C4's Done criteria has no evidence behind it, from anyone.**
   The contract required a real gesture paging **each** of timeline/Month/Year.
   Vision settled Month and Year but **could not settle the timeline** — and reports
   it as unproven rather than as a finding, **because its instrument fails its own
   positive control there**: the real, production-proven `SwipeActions` placed inside
   an `overflow-y:auto` host also failed, with Chrome issuing `pointercancel` after
   ~24px inside a nested scroller. **So whether swipe pages Day / 3 Day / Week at all
   is genuinely unknown**, and it is the highest-value item on the owed real-device
   pass — *"given the same `pointercancel` shape could occur on a real device, I'd
   test it first."*
3. **`CalendarViews.tsx` measured at 496 total / 216 code** — note this **disagrees
   with Captain's 191 code**; the two counters differ and STRUCTURE.md's canonical
   counter is `preflight.mjs`'s. Either way: over soft, well under hard.
4. **`MonthJumpSheet.tsx` renders no month/year label on the grid at all.** The only
   cue is the selected chip — and `MonthChips` shows the year on January chips only
   (CV5's routed leftover, *"a chip reading 'Sep' can navigate to the previous
   September"*), now reachable from **all six views** rather than only Month. Not a
   blocker alone; it **materially amplifies BLOCKER 1**, since with the marker on a
   padding cell and no heading, very little names the month.
5. **C3's Schedule-title solution holds, checked structurally rather than by
   measurement.** The portal slot is still childless (no double label — mission-16/D2
   stands), the overlay button is a `position: absolute` sibling and therefore cannot
   contribute flow height **by CSS spec rather than by measurement**, `ScheduleView.tsx`
   is byte-identical to `main`, and `SCHEDULE_HEADER_BAR_HEIGHT_PX = 154` cannot have
   gone stale. The 46px figure is part of the owed real-device pass.
6. **The signature UTC-vs-local bug class comes up CLEAN for this diff** — swept
   every added line: exactly one `new Date` was added across all four contracts, in a
   test, built from local components and explicitly not "today". Also verified C2's
   core claim *from source*: `openDay` (`:350`) still hardcodes `jumpTo(day, "day")`
   so existing callers are unaffected, and view preservation is a property of
   `jumpToDayTargets`' signature — its test is **red-then-green** against a
   `"day"`-forcing implementation.

## Handoff log
- 2026-09-08 — **C4 DONE and committed (`e653609`) — with ONE deviation that
  is the mission's central open question, and Fury is NOT resolving it.**
  Gauntlet green, all six legs, re-run by the builder after its own
  positive-control edit/restore: tsc 0, eslint 0, build clean, tests
  **336 → 344** (+8, its new `usePageSwipe.test.ts`, correctly placed in
  `src/lib/` so the hand-enumerated glob reaches it).
  **The deviation: the contract's objective said "extract"; what shipped is a
  parallel copy.** `SwipeActions.tsx` is **byte-identical to `main`** (`git
  diff --stat main..HEAD -- src/components/SwipeActions.tsx` → empty), so
  `DIRECTION_LOCK_PX = 8` is now defined **twice** (`SwipeActions.tsx:44`,
  `usePageSwipe.ts:69`), as are the four-state mode, the try/caught
  `setPointerCapture` and the click-swallow. **This is the "boundary satisfied
  by copying" shape the contract explicitly warned against** — and the builder
  **disclosed it openly and asked for a gate's ruling** rather than burying it,
  which is the behaviour the doctrine wants. Its argument is substantive: the
  two gestures release into different math (`openWidth/2` driving a live
  `translateX` vs. a fixed 60px with no visual output), and it could not
  verify a runtime refactor of a component live on three call sites that
  Bryce's wife uses daily. **Routed to Captain (one source of truth) and
  Vision (was the contract satisfied). Fury does not pre-empt either.**
  Verification limits stated honestly rather than papered over: the blocked
  JWT mint was **named, not routed around**; the substitute drove the hook's
  **real exported handlers** and was proven non-vacuous by injecting a real
  break (`"left"` → `"right"`) and watching the harness fail, then restoring
  byte-identically. A real-device 375px pass remains owed.
  `CalendarViews.tsx` is now **496 total / 191 code** — over the 350 soft cap,
  under the 650 hard cap. Captain's call.

- 2026-09-08 — 🛠️ **RESUMED. C4 dispatched.** Its preflight was re-run at
  dispatch time as the contract requires (a boundary is true at dispatch time,
  not writing time): **0 hard failures, 2 judgement items, both settled by
  running the command that settles them** rather than surfaced and skimmed —
  which this project has recorded happening twice.
  **The dependency item is safe:** `CalendarViews.tsx:117` already
  destructures `step` from `useCalendarNavigation`, and the arrows call
  `step(-1)`/`step(1)` at `:407-408`, so C4 reads an already-exposed API and
  the must-not-touch hook stays shut. **The claim item found a false premise
  in Fury's own contract** — it said `SwipeActions` "is live on Inventory and
  Shopping rows"; `grep -rn "SwipeActions" src/components/*.tsx` returns
  **three** call sites, the third being `RecipeList.tsx:324` (cookbook
  swipe-to-unfile), which is precisely the one nobody would re-test.
  `ScheduleView.tsx:173` is a comment, not a call site. Contract corrected
  before dispatch; **eighth instance of this project's most-repeated failure
  class, and the first caught by the tool built for it.** Also flagged to the
  builder: `RecipeList.tsx` carries a *second, unrelated* `setPointerCapture`
  (the A-Z rail). Every other named fact verified present by grep, and CD1
  confirmed non-existent. **No gate has still run on this mission.**
- 2026-09-07 — ⏸️ **PAUSED HERE at Bryce's request, at a clean boundary.**
  C1, C2, C3 and C5 are DONE and committed; **C4 (`usePageSwipe`) is NOT
  BUILT and is the resume point.** **NO GATE HAS RUN on this mission at all**
  — Vision, Strange and Captain have all seen exactly nothing of CV6. Branch
  `claude/calendar-cv6` is **pushed for recoverability but has NO PR and is
  NOT merged; nothing from CV6 is live.** Gauntlet green at the pause:
  **336 / 329 + 7 skipped / 336**, tsc 0, eslint 0, build clean — **all six
  legs re-run by Fury**. **DB baseline: attributed, not re-verified by Fury.**
  C3 read it directly at the end of its contract —
  `{task:0, taskPerson:0, calendarEvent:4, user:5}`, exact — and no contract
  in this mission has a database write path at all (CV6 is entirely
  client-side navigation). **Fury's own re-check at wrap-up would not run**:
  `src/lib/db.ts` carries `server-only`, which throws outside Next's bundler,
  and importing the generated client directly hit an esbuild transform error.
  **Worth solving before a mission that does touch data** — the CLAUDE.md
  recipe ("run one-off DB scripts from the repo root with
  `npx tsx --env-file=.env`") is not sufficient on its own now.
  **To resume:** re-run C4's preflight, dispatch C4, then gate the whole
  mission (all three gates — Strange especially, since a new control and a
  new gesture are both squarely its domain, and it is the gate that found
  CV5's real bug). **Two things a gate must see and neither has:** C3's
  deliberate omission of the sheet's per-day density dots (disclosed in
  `MonthJumpSheet.tsx`'s own comment — Strange should rule on whether a plain
  grid is enough), and `CalendarViews.tsx` back at **459/194** with C4 still
  to add to it (Captain's call).

- 2026-09-06 — **C3's preflight found a bug in `preflight.mjs` itself**
  (above); fixed, regression-tested with a positive control, synced to both
  copies. C3's remaining review items settled: `loading.tsx`'s `MonthChips`
  references are **the Month skeleton mission-18/C5 built to mirror its box**
  — a real coupling, but C3 mounts `MonthChips` inside a **sheet** and may not
  touch the component, so the page skeleton is undisturbed; `YearView`'s and
  `useCalendarPeriod`'s references are **comments only**. **C3 dispatched.**

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

**NOT DELIVERED — mission paused mid-flight, deliberately.**

- **Built so far:** C1 (sheets extracted → `CalendarSheets.tsx`), C2
  (`jumpToDay`, view-preserving), C3 (the month-jump dropdown), C5 (the v1
  plan amendment). **C4 (`usePageSwipe`) not started.**
- **Shipped check:** the branch is **pushed**, so the work survives this
  machine — but there is **no PR and no merge**, so **the family does not
  have any of CV6**. "Committed", "pushed" and "the family has it" are three
  different claims and this project has been bitten by conflating them five
  times.
- **Gates:** **none have run.** The gate ledger is empty on purpose, not by
  oversight.
- **Deliberate leftovers, carried:** `ScheduleView` mounts its **own** copy of
  `EventDetailSheet`/`TaskDetailSheet`, so that block is duplicated two ways
  (routed to Captain, unfixed); the month-jump sheet has no per-day density
  dots; a **real-device 375px pass is owed**, because headless Chrome could
  not be forced to a true 375×812 window in this sandbox.

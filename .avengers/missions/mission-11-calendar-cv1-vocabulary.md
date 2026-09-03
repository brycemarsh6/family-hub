# Mission: Calendar CV1 — the view vocabulary, the picker, and last-used persistence

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (two serial contracts — they share files, so they cannot run in parallel)
**Started:** 2026-09-03 · **Updated:** 2026-09-03
**Plan:** `.avengers/plans/calendar-v2.md` — phase CV1
**Branch:** `claude/calendar-cv1-vocabulary`, stacked on `claude/calendar-cv0-extract` (which is stacked on K2's PR #10, itself on K1's PR #9 — **four deep, none merged**, by Bryce's decision to hold production until the Calendar is genuinely usable)

## Brief

- **Goal:** teach the calendar the six view names Calendar v2 needs
  (**Schedule / Day / 3 Day / Week / Month / Year**) without building any of
  the new views, and close the gap Captain found in CV0's totality
  mechanism first. No visual change beyond the picker's contents.
- **Done means:** `VIEW_CONFIG` covers **all five** per-view differences, not
  two, so a new view cannot silently inherit Day behaviour;
  `CalendarPeriodView` holds six names with **explicit** `stepPeriod` /
  `periodAnchor` / `withView` arms for each; the picker still offers only
  views that actually render; opening `/calendar` with no `?view=` restores
  the last view used **on that device**; `loading.tsx` no longer decides its
  skeleton from a hardcoded string. Week / Day / Month behave **exactly** as
  they do today, proven by the same trace method CV0 used.
- **Out of scope:** Schedule, 3 Day and Year *renderers* (CV3/CV4/CV5), the
  timeline library (CV2), tasks (CT1), the month dropdown and swipe (CV6),
  and any change to how events are fetched.

## Danger register

⚠️ **`DATABASE_URL` is the Neon `dev` branch** — a copy-on-write clone of
production holding a **real snapshot of family data, password hashes
included**. Isolation is not privacy.
- **Never print `.env`**, and **never quote a real event title** into a
  report — both happened once in this arc.
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- Test data only via `db:seed-calendar` / `db:clean-calendar`; restore
  `calendarEvent` **4** and `user` **5** (4, not 3 — Bryce added a real
  event), confirmed by direct read.
- **Never create, update, or delete `User` rows.** Minting a session cookie
  for an *existing* user is permitted (the Phase-1e pattern).
- Migrations: **none in this mission.** A contract wanting one is
  BLOCKED-ON-CONTRACT.
- **Never `git add -A` or `git add .`** — stage by explicit path. Fury swept a
  parallel builder's in-flight work into a documentation commit in mission 10
  doing exactly this.
- Never push or open a PR without Fury. Builders may commit their own
  contract on this branch.
- **Nothing is currently serving the repo** — a stale `next dev` was killed at
  the end of mission 10. Start your own; pick a Chrome debug port distinct
  from 9222/9333/9444/9555.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins `TZ=America/Denver` **inside the script** — so
  `TZ=UTC npm test` silently runs Denver twice and proves nothing)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  — **the direct invocation is the only honest second-timezone run**
- `npm run build`

Baseline **182/182**. Each contract reports its own delta; Fury reconciles.

## Assembled

- Stark ×2 (serial — both contracts touch `CalendarViews.tsx` and
  `useCalendarPeriod.ts`, so they cannot be parallel) + Vision.
- **Captain** — this mission exists partly to close *its* CV0 Ruling 2, it
  widens a type the whole branch keys off, and it decides where the
  last-used-view preference lives. Captain's call.
- **Strange — not assembled.** The only visible change is the picker's
  contents. If a gate sees anything else move, that is a BLOCKER and Strange
  comes in.
- Banner — not needed; CV0's gate reports cite every seam.

## Contracts — serial, C1 then C2

### C1 — Close Captain's Ruling 2: all five per-view differences into `VIEW_CONFIG`
- **Status:** ✅ **DONE, committed `09b7a59`.** `title`, `days` and
  `isCurrentPeriod` promoted into `ViewConfig`; the three ternaries and the
  component-level `weekStart` are gone. `CalendarViews.tsx` 267 → **304**,
  `CalendarHeader.tsx` 128 → 133, `MonthLoadingSkeleton.tsx` 76 → **60**.
  Fury re-verified: tsc 0, eslint 0, **182/182 both timezones**, build 0.
- **The probe is the proof, and it was run against *both* trees.** A CV0-era
  row (`prevLabel`/`nextLabel`/`placeholderCount` only) added to a scratch
  seventh view:
  ```
  fixed tree: TS2739 — missing title, days, isCurrentPeriod
  BASE tree:  accepted with ZERO errors
  ```
  **That is the silent Day-inheritance this contract closed, demonstrated
  rather than described.** Both scratch edits reverted, both trees clean.
- **Trace diff empty**, md5 identical, with a positive control that moved 96
  lines and reverted to the same md5 — and re-run against a **cold-restarted**
  server to rule out an HMR artifact. It also measured the
  `today === null` hydration frame separately under 20× CPU throttling
  (9/9 samples identical), since `settle()` skips that frame by design.
- **Decisions the builder made and justified:**
  - `weekStart` derived per config row rather than passed in — `sundayOf` is a
    clone-and-`setDate`, and it removed `weekStart` from the component
    entirely once it verified the old `weekStart !== null` guard was
    equivalent to `anchor !== null`.
  - `title` is `(anchor) => string`, **not** `(anchor, today)` as the contract
    suggested — no view's title depends on today, and an unused parameter is
    the same speculative-maintenance class STRUCTURE.md's dormant-export rule
    rejects. Widening it later is one line in one place.
  - **`MonthLoadingSkeleton` deleted**, not given a dated expiry: zero callers
    across two missions, and CV4 replaces the skeleton entirely, so a
    dormant-export comment would preserve a promise the app will not keep.
    First real application of the rule Bryce approved today.

## ⚠️ C1's most valuable finding: its own contracted change removed a safety net

`CalendarHeader.tsx:84` reads
`label={view === "week" ? "Week" : view === "day" ? "Day" : "Month"}` — a
**catch-all over the same union**. Until C1, `CalendarHeader` hand-wrote its
own view union, and that mismatch was a **compile tripwire** — it is the
error Captain's CV0 probe actually fired on. C1 was contracted to import the
real type, which was correct and which **removed that tripwire**. Net effect:

> **When C2 widens the union, Schedule / 3 Day / Year will silently render a
> view-switcher circle labelled "Month" — with no compile error.**

The builder found this, **did not fix it**, and explained why both in-boundary
options were wrong: a second label list inside `CalendarHeader` violates one
source of truth against `VIEW_OPTIONS`, and importing `VIEW_CONFIG` from
`CalendarViews` recreates the component-to-component cycle that file's own
header warns against. **Its recommendation is now a C2 requirement:** a total
`Record<CalendarPeriodView, string>` label map in a lib module, read by both
`VIEW_OPTIONS` and the header — making the label a **sixth compiler-checked
per-view difference** instead of a fourth catch-all.

That is a builder noticing that doing exactly what it was told made something
else less safe, and saying so instead of shipping a green gauntlet.

### Two more findings routed to C2

- **The first painted frame is always the *Week* frame** — 7 placeholders,
  "Previous week" — even for `?view=day` and `?view=month`, because
  `useCalendarNavigation("week")` supplies the initial view and the URL parse
  lands a tick later. **Pre-existing, identical on base**, so not a
  regression — but C2 owns `loading.tsx`'s per-view skeleton and needs to
  know the skeleton it picks is not the frame the user first sees.
- `MonthLoadingSkeleton.tsx` now exports only `MonthGridSkeletonRows`. The
  filename mismatch is recorded in the file's own header; C2 may touch
  `loading.tsx` and could rename then.
- **Why first:** CV0 shipped a `Record<CalendarPeriodView, ViewConfig>` whose
  totality is compiler-proven — but Captain probed it and found it covers
  only **2 of 5** per-view differences. `days` (`CalendarViews.tsx:131`),
  `isCurrentPeriod` (:140) and `title` (:150) are still ternaries with a
  trailing `: <day behaviour>` catch-all, so **adding a view compiles clean
  and silently renders a Day title over a single-day array.** That is the
  `stepPeriod` catch-all-else hazard `calendar-v2.md` already names,
  reproduced one file over. Closing it **before** C2 widens the union is what
  makes the widening safe.
- **Objective:** promote `title`, `days` and `isCurrentPeriod` into
  `ViewConfig` as functions, so the totality check covers every per-view
  difference. Pure refactor on today's three views — **no new view names.**
- **Shape:** the builder's, but the natural form is
  `title: (anchor: Date, today: Date) => string`,
  `days: (anchor: Date) => Date[]`,
  `isCurrentPeriod: (anchor: Date, today: Date) => boolean`, with the
  null-guards staying in the component (they are about `today` not having
  resolved, not about the view). Keep `CalendarViews.tsx`'s existing comment
  honest: it currently claims "a new view ADDS A ROW, it doesn't add a branch
  to three separate expressions" — **true of 2 differences today, false of
  3.** After this contract it becomes true; say so rather than leaving the
  claim ahead of the code.
- **Also in scope, both CV0 leftovers in files you already touch:**
  - `CalendarHeader.tsx:44` hand-writes `"week" | "day" | "month"` instead of
    importing `CalendarPeriodView`. It is a compile tripwire (it errored in
    Captain's probe), so C2 would be forced to touch it anyway — fix it here.
  - `MonthLoadingSkeleton` (the **wrapper**, not `MonthGridSkeletonRows`) has
    **zero callers repo-wide** and its comment justifies it with a
    speculative future caller that does not exist and is not planned (CV4
    replaces that skeleton). Under STRUCTURE.md's dormant-export rule this
    reaches the two-mission threshold now. **Delete it**, or give it a dated
    expiry — state which and why.
- **Boundaries:** may touch `src/components/CalendarViews.tsx` (267),
  `src/components/CalendarHeader.tsx` (128),
  `src/components/MonthLoadingSkeleton.tsx` (76). **Must not touch**
  `useCalendarPeriod.ts`, `useCalendarNavigation.ts`, `calendarPaging.ts`,
  `calendarDates.ts`, `monthLayout.ts`, `EventForm.tsx` (**350, at cap**),
  `MonthGrid.tsx`, `DaySection.tsx`, `page.tsx`, actions, `prisma/**`.
- **Verification:** the gauntlet, both timezones, **182 unchanged** (a pure
  refactor moves no test). Then **the trace**, the same method CV0 proved
  twice: pin a worktree at this branch's base, capture a multi-step
  Week/Day/Month walk (load, Next ×2, Prev ×2, Today real and inert, view
  switch, Month day-cell tap, Back, Forward) recording header title,
  `location.search`, arrow labels and disabled states, card/cell counts and
  the views container's full `innerText`, run it before and after, and
  **`diff` must be empty**. Include a **positive control** — deliberately
  change one rendered string, confirm the trace moves, revert — because an
  empty diff from a harness that cannot see the change proves nothing.
- **Evidence required:** `wc -l` before/after (all under 350); the empty
  trace diff with its md5s and the positive control's line delta; both
  timezone counts; a `tsc` probe showing that adding a member to
  `CalendarPeriodView` now errors on **all five** fields, not two.
- **Done criteria:** the probe errors on five fields; empty trace diff;
  gauntlet green; `MonthLoadingSkeleton`'s fate decided and stated.

### C2 — The six view names, explicit cursor arms, the picker, and last-used persistence
- **Status:** ✅ **DONE, committed `8e6e11a`.** Fury re-verified: tsc 0,
  eslint 0, **200/200 both timezones** (182 → 200, +18), build 0.
- **Two new lib modules:** `calendarViewVocabulary.ts` (129) owns the union,
  the **total `VIEW_LABELS` map C1 asked for**, `BUILT_VIEWS`, and picker
  options *derived* from the label map rather than listed twice; and
  `lastCalendarView.ts` (70) holds the per-device preference. The second file
  exists because keeping the preference inside `useCalendarNavigation.ts`
  pushed it to **369 — over the cap this mission's own contract calls
  binding**; splitting brought it to 309. The builder split rather than
  shipped over, and said why in the file header.
- **The catch-all C1 found is closed:** `CalendarHeader.tsx` now reads
  `VIEW_LABELS[view]`. **The seventh-view probe proves the mechanism survived
  the widening** — adding `"agenda"` errors on **five** total records
  including the new label map and the new cursor map:
  ```
  loading.tsx(85)            TS2741 missing in Record<…, CalendarSkeletonShape>
  CalendarViews.tsx(94)      TS2741 missing in Record<…, ViewConfig>
  calendarViewVocabulary(64) TS2741 missing in Record<…, string>   ← the label map
  calendarViewVocabulary(89) TS2741 missing in Record<…, boolean>
  useCalendarPeriod.ts(69)   TS2741 missing in Record<…, ViewCursor> ← the cursor
  ```
- **No catch-alls left in the cursor math:** one total `VIEW_CURSOR` record
  drives `periodAnchor`, `stepPeriod` and `withView`. Year is `monthOffset ±
  12` with **no new offset field**, so the existing round-trip property tests
  stayed intact — and were extended: Prev∘Next identity for threeDay and year
  across every day of 2026, **plus Feb 29 2028**, the leap day 2026 cannot
  cover (Next clamps to Feb 28 2027, Prev returns to Feb 29 2028 exactly).
- **`BUILT_VIEWS` gate implemented**, and the builder agreed with the
  reasoning rather than just complying: six pickable views with three
  rendering something else *is* the stub the plan forbids — "a control that
  lies when tapped." Picker shows exactly `["Day","Week","Month"]`;
  `?view=year|schedule|threeDay|bogus` normalize to Week **when nothing is
  stored** — Vision corrected this: with `month` stored they render **Month**,
  which is `parseViewParam`'s documented fallback semantics and is stated
  honestly in `calendarPaging.ts:94-98`. The overclaim was this record's.
- **Last-used view verified end to end**, including the case that matters
  most: **a `?view=` in the URL still wins over the stored preference.** And
  incidentally proven across the whole 35-step trace — the after-run's own
  view switches wrote the preference mid-walk and the trace *still* matched
  base exactly, because every step names a `?view=`.
- **Trace empty**, md5 identical, positive control moved 44 lines and
  reverted to the same md5. Skeleton and hydration frame measured identical
  to base under 20× CPU throttling.
- **Deliberate non-fixes, each with the in-boundary alternative shown to be
  worse:**
  - `?view=year` renders Week and **leaves the URL saying `year`** — not
    rewritten, because a mount-time corrective push adds a history entry and
    a server round trip through the machinery CV0 spent four contracts
    stabilising, for a URL nothing reads twice.
  - **The first painted frame is always the Week frame**, documented not
    fixed. The one-line "fix" (seed the cursor from the URL) makes
    `?view=month` render **nothing at all** during the `today === null`
    branch — trading a wrong-shaped frame for an empty one. And it cannot be
    fixed in general: a bare `/calendar` with a stored preference *must*
    paint the default first, because localStorage does not exist during SSR
    by construction. `loading.tsx`'s comment now says why seven rows for Day
    is correct rather than lazy.
  - The preference is **deliberately absent from both effects' dependency
    arrays**, with the reasoning in code: `todayTime` flipping `null → real`
    already re-runs them on the same render the store resolves on, and adding
    it would re-run the resync effect *mid-push* on a picker tap against a URL
    still naming the old view — the C8/C9 drift class.

## ⚠️ `CalendarViews.tsx` is at 348/350 — this is CV0's situation, one phase later

CV0 existed because this file hit its cap. It ended at 267. C1 took it to
304, C2 to **348** — and **CV3 (Schedule) and CV4 (the timeline) still have
render branches to add.** It cannot absorb them.

The builder identified the extraction candidate and did not do it, correctly,
because no contract asked: **`ViewConfig` / `VIEW_CONFIG` itself** — pure
functions over `Date`, no JSX, no component dependency — which it estimates
drops the file to **~230**. That is the natural seam and it is now *more*
extractable than at CV0, because C1 turned three ternaries into three
functions.

Also noticed and deliberately left, since promoting them now would encode
guesses about components that don't exist (`TimelineGrid`, Schedule's rows):
`showLocation={view === "day"}` and `compact={view === "week"}` are still
inline booleans, and `view === "month"` still selects the renderer. CV3/CV4
own those.

**`useCalendarPeriod.test.ts` is at 344/350** — a second file approaching the
cap, worth a split candidate before CV2 adds timeline-adjacent cases.


- **Objective:** widen `CalendarPeriodView` to
  `"schedule" | "day" | "threeDay" | "week" | "month" | "year"`, give every
  view an explicit arm in the cursor math, gate the picker to views that
  actually render, and restore the last-used view per device.
- **⚠️ The design tension this contract must resolve, and state its
  reasoning for:** the union widens to six, but only three views render.
  `parseViewParam` currently falls back to `"week"` for anything unknown, so
  a deep link to `?view=year` today would need *something* to render.
  **Fury's guidance, not a mandate — argue if you disagree:** widen the
  *vocabulary* (union, `VIEW_CONFIG` rows, cursor arms — all real, testable
  data a view will need) but keep a single `BUILT_VIEWS` gate that
  `parseViewParam` and `VIEW_OPTIONS` both read, so an unbuilt view
  normalizes to the default and never reaches a missing renderer. Each later
  phase flips one entry when its renderer lands. **This is the plan's
  "no stubs" rule honoured** — the config rows are data, not placeholder UI,
  and nothing appears in the picker that does not work when tapped.
- **Explicit arms, no catch-alls** (`useCalendarPeriod.ts`): `stepPeriod`
  currently reads `view === "week" ? 7 : 1` — a catch-all that would silently
  step `threeDay` by **one day**. Every view gets a named arm: schedule (no
  step — it scrolls), day 1, threeDay 3, week 7, month `monthOffset ± 1`,
  **year `monthOffset ± 12`**. Year uses **no new offset** —
  `periodAnchor("year")` reuses `monthAnchor` and `withView("year")` is the
  Month arm, which keeps `useCalendarPeriod.test.ts`'s round-trip property
  tests intact rather than needing new state.
- **Last-used view**, via the `lastStore.ts` `useSyncExternalStore` pattern
  (never `useState`+`useEffect` — this project's lint rules correctly forbid
  it, for hydration-mismatch reasons documented in CLAUDE.md). **Read it only
  when `?view=` is absent.** The URL stays the source of truth; a stored
  preference that fights the resync effect would re-invent the C8/C9 drift
  CV0 just spent four contracts killing. Belongs in `useCalendarNavigation`'s
  initial parse, not in the component.
- `loading.tsx:71` decides its skeleton from a **hardcoded**
  `searchParams.get("view") === "month"`. Unlike `CalendarHeader`, this
  produces **no compile error** when the union widens — the three new views
  would silently get the seven-row Week skeleton. Route it through
  `parseViewParam` and a per-view map so `calendar-v2.md`'s promise of a
  measured skeleton per view becomes enforceable rather than remembered.
- **Boundaries:** may touch `src/lib/useCalendarPeriod.ts` (275) + its test,
  `src/lib/calendarPaging.ts` (146) + its test,
  `src/lib/useCalendarNavigation.ts` (283) + its test,
  `src/components/CalendarViews.tsx`, `src/components/CalendarHeader.tsx`,
  `src/app/(app)/calendar/loading.tsx` (104). **Must not touch**
  `calendarDates.ts`, `monthLayout.ts`, `EventForm.tsx`, `MonthGrid.tsx`,
  `DaySection.tsx`, `page.tsx`, actions, `prisma/**`.
- **Verification:** gauntlet both timezones (the count **rises** — report the
  delta). Extend `useCalendarPeriod.test.ts`'s three cursor properties to
  the new views: **Prev∘Next is an exact identity** from every day of every
  month of 2026 for threeDay and year; **Next ×12 in year view visits 12
  distinct consecutive years**; **switching view preserves the anchored
  day**. Then in the running app: the picker still shows exactly the three
  built views; `?view=year` normalizes rather than breaking; picking Month,
  navigating away and returning to a bare `/calendar` restores Month; a
  `?view=` in the URL still wins over the stored preference. **And the C1
  trace again — Week/Day/Month must still diff empty.**
- **Evidence required:** the cursor-property test output; the picker's
  contents; the `?view=year` behaviour; the last-used round trip **and** the
  URL-wins-over-storage case; the empty trace diff; both timezone counts;
  `wc -l` on every touched file.
- **Done criteria:** all of the above, and a `tsc` probe showing a seventh
  view name still errors until it has a `VIEW_CONFIG` row — the mechanism
  must survive the widening it was built for.

### C3 — Fix contract: freeze the preference at mount (Vision's BLOCKER)
- **Status:** ✅ **DONE, committed `a13cd22`.** Fury re-verified: tsc 0,
  eslint 0, **206/206 both timezones** (200 → 206, +6), build 0.
- **All three of Vision's scenarios now match base**, measured across three
  servers (base / broken HEAD / fixed):
  ```
  1  Calendar tab → Month → Back : base Week · HEAD Month · MINE Week
  2  cross-tab, A's Next→Back     : base Week · HEAD Month · MINE Week
  3  ?view=year → Day → Back      : base Week · HEAD Day   · MINE Week
  ```
- **The feature survives its own fix**, which was the other half of the
  contract: a *fresh* open of bare `/calendar` still restores Month. And F4 is
  the case that proves the freeze means the right thing — open bare **with
  `month` stored**, pick Day, Back → **Month**, i.e. what that URL meant *at
  open*, not a hardcoded default.
- **Trace empty** against broken HEAD, md5 identical across three runs, using
  **Vision's dialog-capturing harness** as required. Its positive control
  moved **404 lines including inside dialog steps** — the specific blindness
  that let C1 and C2 both report empty diffs they weren't entitled to.

### The contracted shape was rejected by lint, and the builder took the better trade

Fury specified `useRef`. **`react-hooks/refs` rejects it** — 4 errors across 2
lines (`Cannot update ref during render`, `Cannot access ref value during
render`). Rather than suppress a rule this repo treats as substantive
(CLAUDE.md's `useSyncExternalStore` precedent is the same rule protecting the
same class of bug), it used `useState` with a guarded set during render —
React's documented "adjust state while rendering" — and argued it is
**strictly safer than the ref**: it cannot retain a value written by a render
React discarded. The rule itself is extracted as a pure exported
`freezeFallbackView(...)` with 6 tests, so the logic is provable either way.
It did **not** reach for `router.replace`, as instructed.

### ⚠️ One behaviour change beyond the three scenarios — self-reported, for the gate to rule on

**F5, the soft-nav case.** From a mount opened at `?view=week` while the store
held `day`: pick Month, then tap the **Calendar nav tab** — a soft navigation
to bare `/calendar` *within the same mount*, no remount.

```
base  → Week    HEAD → Month (just-picked)    MINE → Day (this mount's frozen value)
```

The builder's argument, which is honest and probably right: **a soft nav and
a popstate are indistinguishable to this hook** — Vision's own point restated
— so no version of the freeze can answer them differently without a
`popstate` listener, which is new machinery of exactly the drift class CV0
closed. It judges the trade worth it: with the freeze, **bare `/calendar`
means one thing for the whole session no matter how you arrive**, where HEAD
let its meaning change under the user; and tapping the tab you are already on
is far rarer than Back.

**Fury's read: it is defensible but it is the weakest point of the fix**, and
"you get Day when you picked Month and never chose Day" is the kind of thing
a real user notices. Handed to Vision explicitly rather than accepted.

### Notes

- `lastCalendarView.ts`'s cross-tab comment **claimed the wrong mechanism** —
  it credited the absent `storage` subscription, when `getSnapshot` re-reads
  every render regardless, which is exactly how tab B's pick reached tab A.
  Rewritten to name the reader's freeze as what actually delivers the promise.
  A newly-true comment resting on the wrong reason is still a comment that
  lies.
- The builder notes the `LAST_VIEW_CHANGED` same-tab event now changes nothing
  on screen, kept it deliberately (it is what makes the module a correct
  external store *on its own terms* rather than one whose correctness depends
  on its caller freezing it), and said so in the comment rather than leaving
  it as mystery code.
- **`useCalendarNavigation.ts` is at 349/350** — a second file at the cap
  alongside `CalendarViews.tsx` at 348. Both are now Captain's extraction
  problem, not just the one it ruled on.


- **Objective:** `useCalendarNavigation.ts:122` reads `fallbackView` live on
  every render, so a Back to a bare or unbuilt URL re-resolves through the
  preference **the undone action just wrote** — breaking Back on the exact
  URL the nav bar links to. Read the preference **once per mount**, at its
  first resolution, and freeze it.
- **Shape (Vision's, and it makes the plan's own wording literally true):** a
  `useRef<CalendarPeriodView | undefined>` set on the first render where
  `todayTime !== null` to `useLastCalendarView() ?? defaultView`, never
  updated afterward; use it as `fallbackView` in **both** `currentSearch` and
  `urlTarget()`. `writeLastCalendarView` keeps writing, for the *next* open.
  Plan decision 5 says the preference applies "only when `/calendar` **opens**
  with no `?view=`" — freezing is what makes that true rather than aspirational.
- **Do not** reach for the alternative (`router.replace` canonicalising the
  bare URL on mount) without saying why — it routes through the push guard
  CV0 spent four contracts stabilising.
- **Also in scope:** `lastCalendarView.ts:29-31`'s comment currently promises
  cross-tab behaviour the code does not deliver (scenario 2). When the fix
  lands the promise becomes true — rewrite it to say **why**: the frozen read,
  not the absent `storage` subscription, is what delivers it.
- **Boundaries:** `src/lib/useCalendarNavigation.ts`, its test, and
  `src/lib/lastCalendarView.ts` (comment). Nothing else.
- **Verification — all three of Vision's scenarios, base-vs-HEAD:**
  (1) Calendar tab → pick Month → Back lands on **Week**; (2) tab B picks
  Month, tab A's Next→Back stays **Week**; (3) `?view=year` → pick Day → Back
  shows **Week** with the URL still saying `year`. Plus: a *fresh* open of
  bare `/calendar` still restores the last-used view — the feature must
  survive its own fix. Full gauntlet, both timezones, **200 baseline**.
- **The trace harness must capture `[role=dialog]` contents** — both prior
  harnesses were blind to the picker and reported empty diffs that could not
  have seen it. Reuse Vision's (`scratchpad/trace.mjs`), not C1's or C2's.

### C4 — Fix contract: canonicalise the URL instead of freezing the read
- **Status:** PENDING. ⚠️ **Vision has one gate pass left** — this must be right.
- **Objective:** a bare or unbuilt-view `/calendar` URL survives in history
  longer than any mount, so no per-mount freeze can stop a remount between the
  pick and the Back from re-resolving through the just-written preference.
  **Canonicalise the URL once `today` resolves**, so no ambiguous entry is
  ever left in history to come back to.
- **Shape (Vision's, prototyped and measured — do not substitute without
  arguing):** once `today` resolves and the URL names no built view, write
  **native `window.history.replaceState(null, "", "/calendar?" +
  buildCalendarSearch(view, anchor))`**. Next documents native `replaceState`
  integrating with `useSearchParams`
  (`node_modules/next/dist/docs/…/04-linking-and-navigating.md:343-345`) —
  **confirm that yourself per AGENTS.md.** Use it rather than `router.replace`,
  which Vision measured at **14 server GETs for 14 picks** on this
  `force-dynamic` page against **zero** for the native call.
- **This is a URL-resync write. It must never write the preference.**
- **The freeze becomes redundant** — with no ambiguous entry in history the
  fallback can go back to a live read. **Decide: keep or drop.** Dropping is
  Fury's preference: it undoes C3's shape in favour of a better one, and it
  frees lines in a file at **349/350**. If you keep it, its comment **must
  not** claim to close a class it does not (F7/F8 prove it doesn't).
- **Room:** `useCalendarNavigation.ts` is at 349/350. Dropping the freeze
  should cover it. If not, put the effect in a sibling lib module rather than
  going over — do **not** touch `CalendarViews.tsx` (348/350).
- **Boundaries:** `src/lib/useCalendarNavigation.ts` + test,
  `src/lib/lastCalendarView.ts` (comment), and one new sibling lib module if
  the line budget forces it. Nothing else.
- **Verification — every scenario, base vs yours:** S1/S2/S3 (pass-1's three),
  **F7** (pick → Kitchen tab → Back → Back), **F8** (pick → reload → Back),
  F2 (fresh open restores), F4 (bare with `month` stored → Day → Back →
  Month), and **F5** (should now yield Month). Plus the guard chain
  Next/Prev/Back/Back/Forward after canonicalisation, all coherent.
  **Prove the no-extra-GET claim yourself** from the dev server log.
- **The trace must capture `[role=dialog]`** — reuse Vision's
  `scratchpad/trace.mjs`. Gauntlet both timezones, **206 baseline**.
- **One case Vision could not exercise and neither may you fake:** a store
  write landing between hydration and `today` resolving. If you cannot force
  it, say so plainly, as Vision did.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **BLOCK** | 1 | Back is broken on the bare `/calendar` URL the nav bar links to; both builders' trace harnesses were blind to the picker |
| 2 | Vision | **BLOCK** | 1 | pass-1 blocker RESOLVED as specified — but Vision's own prescribed shape can't cover a remount; prototyped the real fix |
| 1 | Captain | **PASS** | 0 | extraction ruled REQUIRED before CV3; found the same hazard class living in `constants.ts`; 4 amendments proposed |

Budget: 3 passes per gate, then STOP and surface.

## Captain, pass 1 — PASS (0 blockers)

Gauntlet re-verified independently: tsc 0, eslint 0, **200/200 Denver and
200/200 UTC (direct invocation)**, build 0. Boundary clean — every off-limits
file confirmed **byte-identical by md5**, not merely absent from
`--name-status`. Both commits carry real content (checked against the M1
rename-with-no-content trap).

### Ruling 1 — extraction is REQUIRED before **CV3**, not CV2. `ViewConfig` is the seam.

```
CV0 delivered  CalendarViews=267   cursorTest=245
C1             CalendarViews=304   cursorTest=245
C2             CalendarViews=348   cursorTest=344
```
**CV1 spent 81 of the 83 lines CV0 bought, in one mission.** That trend is the
finding, not the number.

CV2 (`timelineLayout.ts`, a new pure lib) touches nothing here and can land
as-is. **CV3 cannot** — the plan has it adding `showArrows` to
`CalendarHeader` (a sixth `ViewConfig` field × six rows), a Schedule branch
and its import: ~25 lines, landing at ~373. So: **`CalendarViews.tsx` must be
back under ~250 before CV3's first contract writes a line.**

**The decisive argument for `ViewConfig` as the seam is coverage, not size.**
`npm test` globs `src/lib/*.test.ts` only. `VIEW_CURSOR` — a total record of
per-view date logic in `src/lib/` — has property tests across every day of
2026 plus Feb 29 2028. **`VIEW_CONFIG` is the same kind of thing** (three-day
`isCurrentPeriod`, `sundayOf` week math, six views) and has **zero tests,
solely because it sits in a `.tsx` the runner cannot see.** Two sibling
records of per-view date logic, one proven and one unprovable. Extraction
fixes that as a side effect. It also carries seven imports out with it
(~37% of the file), landing at ~215–225.

**Placement: its own `src/lib/calendarViewConfig.ts`, NOT folded into
`calendarViewVocabulary.ts`** — folding would put presentation config into
the module `calendarPaging.ts` imports and therefore into `page.tsx`'s
**server graph**, and would couple the URL parser to the header's title
strings.

**Do NOT extract the render switch instead** — that is where CV3–CV6's growth
lands. Moving it exports future growth into a new file that then grows, while
`VIEW_CONFIG` (which gains a field × six rows per phase) stays behind. Wrong
direction.

### Ruling 2 — the two new modules hold, and the principle is sharper than "it fit"

> **Splitting to fit a cap is a legitimate reason to *look* for a boundary,
> never a legitimate reason to *accept* one.** A file created only because
> another was full is a file with no concept, and it drifts into a junk
> drawer.

`lastCalendarView.ts` survives that test four ways: it reconciles
*localStorage* where its host reconciles the *URL* (two sources, two
subscriptions, two lifetimes); it mirrors `lastStore.ts` line for line; it is
independently importable (CV6's dropdown could read it); and its two
divergences from `lastStore.ts` are deliberate and documented — same-tab
event only (another tab's pick must not move the view under your finger) and
reads narrowed through `toBuiltCalendarView`.

`calendarViewVocabulary.ts` verified a **leaf — zero imports**, so cycle-free
by construction, with all six consumers pointing one way at it.

### Ruling 3 — `server-only` correctly absent, and Captain caught its own false positive

An earlier grep appeared to show `"use client"` in the vocabulary module —
Captain checked and found it was **the string inside that file's own
explanatory comment**, not a directive, and said so rather than reporting it.
Directive-free is the only correct answer here: `page.tsx` (server) →
`calendarPaging.ts` → this module at runtime via `BUILT_VIEWS`, so
`server-only` would break the client half and `"use client"` would put a
client reference in the server bundle.

### Ruling 5 — the ledger improved, and the hazard class survives in three named places

Five total records, no sixth list, no hand-written label anywhere; the picker
**cannot** be a second list by construction, and a test asserts it.

But `CalendarViews.tsx:260/284/286` still hold inline per-view tests with a
**falsy default** — `view === "month"` selects the renderer,
`showLocation={view === "day"}`, `compact={view === "week"}`. The day any of
the three new views flips to built, each silently inherits `false` with no
compile error — the same silent inheritance C1 just closed, one expression
over. Not a blocker **only because `BUILT_VIEWS` makes those views
unreachable**, which is exactly what buys the time. Hence amendment D.

### Ruling 6 — the gate is not a local trick; the repo already runs it, in a weaker form

`src/lib/constants.ts` solves the identical problem for roles —
`ROLES` → `ROLE_LABELS` → `ASSIGNABLE_ROLES` (a `device` role exists but must
never be pickable). Same three-part answer, arrived at independently. **That
second instance is what makes it a convention rather than a clever trick.**

**And the comparison exposed a live weakness in the older one:**
`ASSIGNABLE_ROLES` gates with a **filter predicate** (`role !== "device"`),
not a total record — so **a new role added to `ROLES` becomes assignable
silently, with no compile error.** That is Captain's own CV0 Ruling 2 hazard,
sitting in `constants.ts` today, found by comparing this mission's work
against code nobody had touched. Out of boundary; routed to whichever mission
next touches roles.

### Two more notes

- **`useCalendarPeriod.test.ts` is at 344/350** (+99 this mission) and needs a
  concern-split before CV2/CV4 add timeline cases — **but STRUCTURE.md's
  *text* currently forbids the split its *practice* already shipped**
  (mission-10/C2's `calendarDates.test.ts` / `calendarDatesFormat.test.ts`).
  Amendment B fixes the letter to match.
- `BUILT_VIEWS` (record) vs `BUILT_CALENDAR_VIEWS` (list derived from it)
  differ by one word and name different kinds of thing. Cheap rename at next
  touch: `VIEW_IS_BUILT` / `BUILT_VIEWS`.
- `MonthLoadingSkeleton.tsx` names an export that **no longer exists
  anywhere** — a grep for the filename comes up empty. Delete-or-rename in
  the next mission touching it or `loading.tsx`; **must not survive CV3.**
- `EventForm.tsx` confirmed byte-identical at 350/350 with the `b < a`
  infinite loop still live. Captain's note: it is simultaneously at the cap,
  carrying a known defect, and scheduled for extraction in CT1 — **the
  extraction and the fix should land together**, since the extraction is what
  creates room to fix it safely.

## Vision, pass 1 — BLOCK (1 blocker, 6 notes)

Gauntlet re-run: 200/200 both timezones, build 0. Boundary clean. The
seventh-view probe **matched exactly** — 5 errors and only 5.

### BLOCKER — Back is broken on the bare `/calendar` URL, which is the one the nav bar links to

`useCalendarNavigation.ts:122` reads `fallbackView` **live on every render**.
So a Back to a URL naming no built view re-resolves through the preference
**that the very action being undone just wrote.** `HUB_NAV_ITEMS` links to
bare `/calendar` (`nav.ts:12`), so this is the first thing a family member
does.

**Three scenarios, each measured base-vs-HEAD:**

1. **Same tab.** Calendar tab → Week; pick Month; Back.
   Base → **Week**. HEAD → **stays on Month**; Back appears to do nothing,
   and a second Back leaves the calendar entirely.
2. **Cross-tab** — and this **directly contradicts `lastCalendarView.ts:29-31`'s
   own comment** ("another tab's picker tap is not a reason to change the view
   under someone's finger"). Tab A on bare `/calendar` (Week); tab B picks
   Month; tab A taps Next then Back → **A lands on Month**, a view A never
   chose.
3. **The `?view=year` non-fix, answering the question Fury put to the gate.**
   Load `?view=year` (renders Week); pick Day; Back → **URL says `year`,
   screen says Day.** The un-rewritten URL is honest *only until the
   preference changes underneath it.*

**The stated rule — "the URL wins when `?view=` is present" — held everywhere
Vision attacked it.** The hole is the **history** dimension the rule never
mentions: a bare or unbuilt URL's *meaning* is mutated by the user's own tap,
and popstate re-reads the mutated meaning. Same class the mission says the
effect dependency arrays were designed to avoid — it just enters through
`useSyncExternalStore`'s per-render `getSnapshot` re-read instead.

**Fix:** read the preference **once per mount**, at its first resolution, and
freeze it as `fallbackView`. That makes plan decision 5 literally true —
"applied only when `/calendar` **opens** with no `?view=`" — so within one
mount every popstate to a bare or unbuilt URL resolves to what it meant at
open, while a fresh open still restores the last-used view.

### ⚠️ The methodology finding: both builders' empty trace diffs were blind

C1 and C2 each reported an **empty** trace diff with a passing positive
control. Vision's own harness — which additionally captures every open
`[role=dialog]`'s text — found a **24-line diff**, and every line is the same
change:

```
< "dialogs":["View :: View × Week Day Month"]
> "dialogs":["View :: View × Day Week Month"]
```

The picker's row order changed (plan decision 1's order, sanctioned) and
**neither builder's harness recorded dialogs, so their positive controls
proved only that the harness saw `VIEW_CONFIG` — not that it saw the one
thing that visibly changed.** Behaviour across all **45 non-picker steps** is
byte-identical, so the finding is about the instrument, not the code.
**Future trace harnesses must record `[role=dialog]` contents.**

Vision's own run: 48 steps including the real Nov 1 2026 DST week in all
three views, the Add sheet, the detail sheet, five Back/Forward pairs, and a
bare `/calendar`; 2751 lines each side; positive control moved 68 lines and
reverted to the exact same md5; zero timeout markers.

### Notes

- **The mission record overclaims and is corrected below:** "`?view=year|
  schedule|threeDay|bogus` all normalize to **Week**" is true **only with no
  stored preference.** With `month` stored, `?view=year` and `?view=bogus`
  render **Month**. `calendarPaging.ts:94-98`'s own comment states this
  honestly — the mission file was the thing that was wrong.
- Under 20× CPU throttle, bare `/calendar` with `month` stored paints a
  **fully resolved Week frame** before flipping to Month — one *more* frame
  than the wrong-shaped skeleton the mission documents. Inherent to
  jumpTo-in-an-effect and present on base for a `?view=month` deep link, so
  not a regression, but `loading.tsx`'s comment shouldn't imply the skeleton
  is the only mismatch.
- A stored unbuilt or corrupt value is normalised on read but never cleared —
  harmless.

### What held under attack, for the record

URL-wins verified from every angle Vision could construct. Stored unbuilt
(`year`/`schedule`/`threeDay`) and corrupt values (`"Month"`, `""`, `"null"`,
JSON, `toString`, `__proto__`, `constructor`, `" week"`, `"week\n"`) → all
Week. The `BUILT_VIEWS` gate held against `?view=` of every unbuilt name plus
`toString`/`__proto__`/`constructor`/`WEEK`/`Day`. **Cursor properties
independently re-probed**: Prev∘Next identity for **all six views** from every
offset −400..+800 against four `today` values including Nov 1 2026 and **Feb
29 2028 as today** (year Next → Feb 28 2029, Prev → Feb 29 2028, Next×4 →
Feb 29 2032); threeDay across both 2026 DST transitions is exactly 3 calendar
days at local midnight. Both documented non-fixes verified sound, including
reading `CalendarViews.tsx:243-247` to confirm the "seed from URL renders
nothing" claim. Add sheet, detail sheet, Month day-cell tap and its
Back/Forward all byte-identical to base.

## Vision, pass 2 — BLOCK (1 blocker, 5 notes). Pass-1 blocker RESOLVED as specified.

All three named scenarios re-derived independently across three servers and
**match base**. F2/F4 matched. Trace HEAD-vs-fixed **0 lines, md5 identical**;
base-vs-fixed 12 lines, all the sanctioned picker-order change — which
doubles as the positive control proving the harness sees dialogs.

### Vision blocked its own prescription, and said so

> *"I own that the shape was mine; the finding stands regardless."*

The per-mount freeze was Vision's pass-1 fix. It works for everything it was
scoped to — and Vision then found the same symptom reachable by two ordinary
paths **no per-mount shape can cover**, because a bare `/calendar` history
entry **outlives the mount**, so any remount between the pick and the Back
re-freezes from the store the pick just wrote:

```
F7  bare → pick Month → Kitchen tab → Back → Back → Back
    BASE : Month, Week,  /kitchen
    FIXED: Month, Month, /kitchen     ← the second Back does nothing; the third exits the branch

F8  bare → pick Month → RELOAD → Back
    BASE : Week          FIXED: Month
```

**F8 is routine on the household's iOS home-screen app** — pages reload after
backgrounding. This is Emily's actual usage pattern, not a contrived case.

### Vision prototyped the real fix in-browser, without editing source

**Canonicalise any URL naming no built view, once `today` resolves** — via
**native `window.history.replaceState`**, not `router.replace`. Next's own
docs confirm native `replaceState` integrates with `useSearchParams`
(`node_modules/next/dist/docs/…/04-linking-and-navigating.md:343-345`), and
Vision measured the difference that matters on this `force-dynamic` page:

> native `replaceState` → **no server GET**.
> `router.replace` → **14 GETs for 14 picks.**

Prototype results (`scratchpad/v2-proto.mjs`, run against the fixed build with
no source change):
```
P7  … → Kitchen → Back → Back  : Month, Week   ✓
P8  … → reload → Back          : Week          ✓
P-guard  Next/Prev/Back/Back/Forward after canon: all coherent, URL and view agree
```

**And it collapses the whole problem class:** with no bare entry ever left in
history, the fallback can safely return to a live read — **the freeze becomes
redundant.**

### F5 ruled: acceptable in isolation, and **moot under the fix**

Base also snaps away from the just-picked view (to Week); the frozen answer
is at least a coherent model; and it needs the already-active tab tapped
after a pick, with a store differing from the opening view. Vision confirmed
the indistinguishability claim is **true for this hook**, though a signal does
exist (Navigation API `navigationType`) at the cost of new machinery and
Safari risk. **Under canonicalisation F5 yields Month — HEAD's answer, which
Vision calls the best one.**

### The pass-3 attacks that held

Deep chain across two stored writes, pick+Next with no settle, two rapid
mounts — all match base. Frozen-equal-to-default did not re-open the question
*in the app*, not just in the unit test. Frozen cannot be `null` after
resolution. `today` never resolving leaves the value unobservable.
**One case honestly not exercised:** a store write landing between hydration
and `today` resolving — at 20× throttle the write never beat `today`. Vision
reasoned it is safe (both inputs are snapshots read in the same render) and
**said it had not tested it** rather than implying it had.

### Notes

- The `useState`-during-render shape verified: guarded, fires once, cannot
  loop. "Strictly safer than a ref" confirmed correct — a render-phase update
  lives on the discarded work-in-progress hook where a ref write survives —
  **though Vision notes it is marginal here** since both inputs are snapshots.
- `lastCalendarView.ts`'s rewritten comment names the real mechanism and
  matches Vision's own measurement. One triviality: it credits "C3" for a
  measurement that was Vision pass 1.
- **`useCalendarNavigation.ts` is at 349/350** — the canonicalisation effect
  needs either a sibling module or the extraction Captain already ruled
  required before CV3.

## Handoff log

- 2026-09-03 — Opened by Fury immediately after CV0 delivered. Two serial
  contracts (they share `CalendarViews.tsx` and `useCalendarPeriod.ts`).
  C1 closes Captain's CV0 Ruling 2 **before** C2 widens the union, so the
  widening lands on a totality check that actually covers everything.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

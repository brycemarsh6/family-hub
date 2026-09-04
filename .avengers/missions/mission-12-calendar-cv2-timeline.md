# Mission: Calendar CV2 — the timeline layout library (+ the queued C5 repairs)

**Project:** family-hub (Marshee)
**Status:** DELIVERED — C1–C5 committed; **Vision PASS, Captain PASS** (pass 2, 0 blockers). Strange deliberately not assembled (see below). On PR #11, stacked on #10 → #9. Not merged, by Bryce's standing decision.
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
- **Status:** ✅ **DONE, committed `f4ed18a`.** Fury re-verified: tsc 0,
  eslint 0, 236 both zones (232 + 4 gated skips under UTC), build 0, tree
  clean. **`git diff` on `HubNav.tsx` changes zero `className` lines** — the
  markup is byte-identical, so no Strange escalation is warranted.
- **The fix:** the active tab's `<Link>` now renders `replace={active}` (no
  duplicate history entry on a re-tap) and
  `onClick={active ? () => router.refresh() : undefined}` (the refetch a
  re-tap used to perform). **Both props are conditioned on `active`, so
  inter-tab taps are untouched** — that conditioning is what keeps the change
  from leaking into normal navigation.
- **Measured on two tabs, as required** — request captures *and* the dev
  server log, not one or the other:
  ```
  Calendar re-tap: history.length 2 → 2 (unchanged), GET /calendar 200 ×3
  Kitchen  re-tap: history.length 3 → 3 (unchanged), GET /kitchen  200 ×3
  ```
- **The dead press is gone**, reproducing mission-11 pass-3's own transcript
  on the fixed build: pick Month (history 6), re-tap Calendar (still 6),
  **Back #1 lands straight on Week** rather than repeating the same URL.
- **Inter-tab navigation verified unchanged** — Calendar → Kitchen → Calendar
  still pushes per tap and Back walks both entries.
- **All five mission-11 scenarios re-run and matching their documented FIXED
  results**: S1, S3, F7 (Back×3 → Month, Week, /kitchen), F8, F5.
- **The comment now states the truth it previously overclaimed**: free on
  loads and picks; **+1 fetch on a cold Back into a canonicalised entry**,
  bounded to once by the shared cache key, with Next's two-mismatch
  escalation unreachable; **base pays the same for any native `pushState`
  entry**, so it is the price of the History API integration Next's docs
  recommend rather than a cost this hook introduced; native still beats
  `router.replace`. Plus the dev-only StrictMode double-fire note.
- **A discrepancy it flagged rather than let be misread:** the contract's
  "baseline 207" was the mission's starting point, but C2 had already landed
  on the shared branch, so HEAD was 236 when it began. **It verified its own
  delta was 0 by `git stash`-ing its two files and re-running** — which is
  what "C1 should not move the count" actually requires, and is a more useful
  check than comparing against a stale headline number.
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
- **Status:** ✅ **DONE, committed `4125372`.** Fury re-verified: tsc 0,
  eslint 0, build 0, **236 tests** (207 → 236, +29) — 236/236 under Denver,
  232 pass + **4 deliberately skipped** under UTC, which is exactly the four
  zone-gated DST cases. `timelineLayout.ts` **293**, its test **349**, both
  under cap. Imports confirmed to be **only** `./mealPlanDates` and
  `./calendarDates`; no `new Date()`, no `Date.now()`, no pixels.
- **The red-then-green was done better than the contract asked.** It
  implemented the *plausible wrong reading* first (`top > clusterEnd`,
  `columnEnd < top` — i.e. "touching counts as overlapping") and ran the
  failing test **alongside a control that passed in the same run**:
  ```
  ✖ REGRESSION: touching events (9-10 and 10-11) are NOT an overlap
      actual:   [['a',0,2], ['b',1,2]]
      expected: [['a',0,1], ['b',0,1]]
  ✔ CONTROL: genuinely overlapping events DO get two columns
  ```
  **The passing control is what makes the red meaningful** — mission-9's own
  red was a module-not-found, which Vision correctly noted proves only that
  an import resolves. This is the improved version of that lesson, applied
  without being told.

### It followed the contract's reason where the letter fell short

The contract said to gate the fall-back tests with `skip` so they cannot pass
vacuously under UTC. It did that — all four transition cases, both
directions — **and then noticed that `skip` leaves the UTC invocation with
*zero* DST coverage, when the entire stated worry was that DST tests prove
nothing.** So it added one further case pinning `America/Denver` explicitly
via the `withTimeZone` helper `calendarDates.test.ts` already established,
which is **genuinely non-vacuous under both invocations**. Additive; the
gated cases all remain.

### Two shape decisions that matter to CV4

- **`TimelineEvent` is structurally identical to `MonthLayoutEvent`**, so the
  `allDayRow` feeds `assignLanes` with **no conversion** — the "don't write a
  second packer" instruction enforced by the type, not by discipline.
- **`blockGeometry` takes only `startAt`/`endAt` — it *cannot* read
  `allDay`.** That is what structurally keeps the timed path off the deferred
  all-day-storage-bug audit list, rather than relying on a future editor
  remembering.
- `assignColumns` is generic where `assignLanes` isn't, so a caller hands it
  `{ id, ...geometry, event }` and gets its own object back instead of doing
  an id lookup.

### One reading the contract's wording would have got wrong

"Spans ≥ 1 full calendar day" as a plain `calendarDayDiff(start, end) >= 1`
**would have sent Fri 10 PM → Sat 2 AM to the all-day row — which the same
contract forbids two sentences later.** It implemented the question actually
being asked — *does the event swallow at least one calendar day end to end* —
purely in calendar components. Verified: Fri 10 PM → Sat 2 AM → grid;
Fri 10 AM → Sun 2 PM → row; 8 PM → midnight → grid.

### Notes

- **DST policy, stated in the header and pinned by tests:** a fixed 24-row
  wall-clock rail; a day is always 1440 rail minutes even when it is 23 or
  25 hours long. Nov 1 2026's repeated 1:30s both land on rail minute 90 (a
  3-hour event draws 2 hours); Mar 8's 2 AM row is empty. Its recorded
  rationale: an elapsed-time rail would make **the hour gutter lie** — the row
  labelled "2 AM" wouldn't sit where 2 AM is — and a rail matching the clock
  on the kitchen wall is worth more than a faithful duration twice a year.
  Each transition test **asserts the fixture really does span 3 hours / the
  day really is 25 hours** before asserting the rail answer, plus an ungated
  sweep asserting the guarantee (finite, positive, within bounds).
- The `assignColumns` doc states K4's requirement explicitly: `id` must be
  unique **per rendered block, not per database row**, since one `rrule` row
  expands into many instances — Vision's mission-9 note, carried forward to
  the only place that can guarantee it.
- **Noticed, deliberately not acted on:** a degenerate row (end before start)
  clamps to a `MIN_BLOCK_MINUTES` box rather than returning `null`, mirroring
  `eventDaySpan`'s V2 clamp — a bad stored row stays visible and fixable
  instead of vanishing. Flagged as a caller-side decision for CV4, not
  changed unilaterally.
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

### C3 — Fix contract: the re-tap should not navigate at all; plus two library corrections

**The contract as dispatched** (re-filed here in pass 2 — Captain found
this body sitting under C4's heading, where its boundary line would have
authorised C4 to edit source. C4's actual diff is two test files; no harm
reached the tree, but this repo has reconstructed a mission from these
files before, and that reader would have been misled.):

- **The blocker:** `active` is prefix-based, so C1's `replace` and
  `router.refresh()` fire on **20 sub-pages** where the tap is a *real*
  navigation — discarding the entry the user is standing on and reintroducing
  the dead Back press C1 exists to remove.
- **Fix — Vision's, which removes F as well as D and E.** An exact-path
  predicate alone (Captain's) fixes D and E but **leaves F**, because a paged
  Calendar entry's pathname is already `/calendar`. So: add
  `const sameUrl = pathname === item.href` for the *history* question (keeping
  `active` for styling and `aria-current`), and on that path
  **`event.preventDefault(); router.refresh()` — no navigation at all.**
  Safe because **the Today circle already covers "go to today"**, so a re-tap
  that refreshes rather than resets loses nothing.
- **Also fix, both from Vision:**
  - **`blockGeometry` and `daysEventCovers` disagree on a zero-length timed
    event at exactly local midnight** — writable through the sanctioned path,
    since `validateEventInput` rejects only `endAt < startAt`. It would show
    in list views and vanish from the timeline. Treat `end <= start` as
    "covers `startOfDay(start)` only", mirroring `eventDaySpan`'s clamp, and
    correct the header's claim (it mirrors `eventDaySpan` **only for same-day**
    rows). **Must land before CV4 consumes this library.**
  - **The pinned-Denver test cannot prove its own pin.** Under UTC with the
    pin removed the fixture is 2 hours and `heightMinutes` is still 120, so
    the assertion can't detect the pin failing. Add the same
    `assert.equal(end - start, 3h)` the gated cases carry.
- **Also fix the comment.** It says *"Re-tapping the tab you're already on is
  a no-op navigation"*, which is **false on those 20 pages** — an
  overclaiming comment inside the contract whose other half was fixing one.
- **Boundaries:** `src/components/HubNav.tsx`, `src/lib/timelineLayout.ts`,
  `src/lib/timelineLayout.test.ts`.
- **Verification — all three of Vision's measured cases (D, E, F), before and
  after**, plus **every C1 result re-confirmed unchanged**: root re-taps on
  two tabs (no history entry, real refetch), inter-tab navigation, and
  mission-11's S1/S3/F5/F7/F8. Then the library: the zero-length-midnight
  event agrees across `daysEventCovers` / `blockGeometry` /
  `partitionForTimeline`, and the pinned test **fails if its pin is removed**
  (prove it by removing the pin and showing red). Gauntlet both timezones;
  `className` diff still 0.
- **Status:** ✅ **DONE, committed `8cdef13`** — with **one open item**
  (`timelineLayout.test.ts` is now over cap; C4 below). Fury re-verified:
  tsc 0, eslint 0, **237** (236 → 237), 233 + 4 gated skips under UTC,
  build 0, `className` diff **0**.
- **All three cases fixed, measured across three builds** (base / C1 / fixed),
  with both C1 defects reproduced before being fixed:
  ```
  D  BASE Back#1 /kitchen/inventory · C1 /kitchen [DEAD] · MINE /kitchen/inventory  ✓
  E  BASE Back#1 …/recipes          · C1 …/cooking       · MINE …/recipes           ✓
  F  BASE Back#1 09-10 [live]       · C1 09-03 [DEAD]    · MINE 09-03 [live], Fwd restores 09-10 ✓
  ```
- **C1's own results re-confirmed across all five tabs**, with a finding
  inside them: C1's Calendar re-tap cost **2 RSC + 1 full document reload**;
  the fixed build is **1 RSC, 0 documents, no history entry**, and base was
  0 RSC with a dead Back. So the fix is better than *both* prior builds.
- **The two libraries now agree.** Before → after on the same probe, plus a
  sweep across four zones:
  ```
  zero-length at exact midnight: BEFORE blockGeometry [] → AFTER [3], partition timed 1
  sweep: 76 (Denver) / 81 (UTC) disagreements before → 0 after,
         in Denver, UTC, Europe/London and Australia/Sydney
  ```
- **The pin now proves itself** — removed, it goes red with a message naming
  the reason; restored, green in both zones:
  ```
  pin removed, PRE-C3 test: 25 pass, 0 fail   ← Vision's finding: cannot detect its own pin
  pin removed, C3 test    : 25 pass, 1 fail   "00:30 to 02:30 is 3 REAL hours only under a zone that falls back"
  ```

### Three judgment calls the builder made and flagged rather than glossed

- **Case F cannot match base's transcript, and it explained why instead of
  fudging it.** Base's tab tap *performs a navigation* (reset to today) that
  the prescribed fix deliberately removes, so base's Back#1 is `09-10` and
  the fixed build's is `09-03`. **What the criterion protects is met and
  measured** — no dead press, and no discarded entry (Forward restores
  `09-10`, which C1 destroyed). The only shape matching base exactly is
  full-URL equality, which reintroduces C1's dead press at `/calendar`
  proper. It flagged the trade rather than choosing silently.
- **It named the predicate `atTabRoot`, not the contract's `sameUrl`** —
  because case F is *exactly* a differing URL, so `sameUrl` "would be the
  kind of overclaiming this contract exists to remove." Naming discipline
  applied to itself.
- **It added `isModifiedClick` unasked**, and the reason is sound: an
  unconditional `preventDefault` would swallow cmd/shift-click on the active
  tab, **making it the one link in the app you cannot open in a new tab** — a
  regression against base. Verified at parity: plain click
  `defaultPrevented=true`, cmd/shift-click `false`, on all three builds.

### ⚠️ A comment that said something was unreachable — and it was reachable

`useCanonicalCalendarUrl.ts:87-88` states Next's two-mismatch escalation is
"not reachable here." **C1's Calendar re-tap triggered a full document
reload** — that escalation — via `replace` onto a canonicalised entry. The C3
build removes the trigger, so **the claim is true again for shipped code**,
but the *reasoning* behind it was wrong and nobody had tested it. Out of
boundary; routed. This is the same file whose sibling comment C1 was
correcting for overclaiming.

### C4 — Split `timelineLayout.test.ts` (Captain's Ruling 2, now due)
- `timelineLayout.test.ts` is **376/350**, over the soft cap. Captain's
  Ruling 2 required "the mission adding the first new case splits it in that
  same commit"; C3 added that case. **The builder did not split** because the
  split needs a fourth file outside its boundary, and it judged that blocking
  a correctness fix on file organisation was the worse trade — then surfaced
  it. Fury agrees with that ordering.
- **Split on the line Captain named and the file's own structure already
  shows:** geometry + DST, and column packing + partition. `timelineLayout.test.ts`
  keeps the first; a new sibling named for the second concern takes the rest.
  **No numbered second file** (STRUCTURE.md), and each header names the module
  both cover (amendment B's requirement).
- **Boundaries:** `src/lib/timelineLayout.test.ts` and the one new sibling
  test file. **Nothing else** — no source change.
- **Verification:** the test **count is the instrument** — 237 before and
  after under both zones, with the **4 zone-gated skips still gated** (they
  must land in whichever file keeps the DST cases and still skip under UTC).
  Both files under 350. `tsc`, `eslint`, `build` clean.

### C4 — DONE, committed `aae9cd8`

`timelineLayout.test.ts` **376 → 232**; new sibling
`timelineLayoutPacking.test.ts` **187**. Both under the cap; no source file
touched (`git status` showed only the two permitted paths).

**The count is the instrument, and it holds:** 17 + 13 = the **30** the
single file carried. Suite **237** under both zones, and the **4 DST cases
still skip under UTC** rather than passing vacuously — the gating survived
the move. tsc 0, eslint 0, build 0.

**The count alone cannot see a moved test that still runs but no longer
asserts**, so every moved body was diffed byte-identical against the exact
pre-split line ranges. Both diffs were empty.

The **composition case moved verbatim** — the one feeding a
`TimelineEvent[]` straight into `monthLayout.assignLanes`. Captain flagged
it as load-bearing structure rather than coverage, and it is: it is the
only thing proving the two libraries compose with no conversion. **It must
survive CV4's real call site making it look redundant.**

**Two judgment calls the builder made and flagged:**

1. **C3's zero-length-midnight regression stayed with geometry**, not with
   partition. Three of its four assertions call `blockGeometry` directly and
   it uses `partitionForTimeline` only as a one-line cross-check, so moving
   it would have split one test's assertions across two concerns — which
   the no-behaviour-change boundary doesn't permit anyway.
2. **The sibling is named `…Packing`, not `…Columns`.** "Columns" undersells
   the `belongsInAllDayRow` / `partitionForTimeline` half, roughly half the
   file. "Packing" is the module's own vocabulary — `assignColumns`'s doc
   comment calls itself greedy interval packing, and the `assignLanes` it
   composes with is described the same way.

**It also declined to commit**, reading the contract as not authorising it
and preferring to surface the question rather than assume. Fury committed
after re-verifying independently (counts, both zones, skip gating, tree).


### Assemble: Strange is deliberately NOT on this mission

Recorded because the doctrine says to assemble minimally *and say so*, and
because a future session reading "two gates, not three" should find a
reason rather than an omission.

Strange gates **anything a human will see changed**. CV2 ships no pixels:
`timelineLayout.ts` is a pure library with **no component consuming it
yet** — that is CV4 — and C4 is a test-file split. The one human-facing
change is C3's tab re-tap, which is *felt* rather than *seen*: no layout,
no colour, no type. Vision already measured it in a real browser across
three navigation cases and caught a fourth that a code-read fix would have
missed.

**CV4 is Strange's mission**, and heavily so — that is where the hour rail,
the now-line, column widths at 375px, and the contrast-by-border ruling all
land. Spending an Opus design pass on a library with no rendered surface
would buy nothing and cost against an allowance that is already the binding
constraint this week.

**The tripwire:** if anything before CV4 puts `timelineLayout.ts`'s output
on screen, Strange gates that mission, no exceptions.

**Corrected in pass 2 — the conclusion survives, the argument did not.** I
wrote "the one human-facing change is felt rather than seen." Vision then
measured a **second** felt change I did not know about: the re-tap also
stopped scrolling to top, because `preventDefault()` takes Next's
scroll-to-top with it. Vision named my own commit while doing it.

Strange still isn't the right gate — scroll position is no more visual than
refresh is — so the verdict stands. But "the one change" was a claim I had
not measured, in a note whose whole purpose was justifying *not* measuring.
**That is the overclaiming class this mission has been cataloguing, authored
by the person cataloguing it.** C5 fixes the regression; this records that a
correct conclusion rested on an argument that happened to be wrong.


## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **BLOCK** | 1 | converges with Captain from measurement, and **extends it** — case F survives an exact-path fix; 6 notes incl. a real library disagreement |
| 1 | Captain | **BLOCK** | 1 | C2 clean; C1's `active` is prefix-based, so `replace` discards the entry on 20 sub-pages — the same dead Back press it exists to remove |
| 2 | Captain | **PASS** | 0 | 5 notes. Ruled its own Ruling 2 named the wrong unit; type-probed the composition case. **Covers `aae9cd8`.** |
| 2 | Vision | **PASS** | 0 | 3 notes. Reproduced the library sweep with its own fixture + a +12:45 DST zone; caught its own empty control. **Covers `aae9cd8`.** |
| 3 | Vision | **PASS** | 0 | 3 notes, all record-keeping. **Re-gate of `fe26316` — the tree that actually shipped.** Supersedes its pass-2 verdict. |

Budget: 3 passes per gate. **Vision is now exhausted (3/3); Captain has used
2/3.**

**What each verdict covers, because it is not the same tree.** Both pass-2
PASSes were measured against `aae9cd8`. `117cd33` (C5) then changed four
source files — three comment-only, one a **live behaviour line**
(`window.scrollTo`) — followed by `544f0a5` and `fe26316`. Vision re-gated
`fe26316` on pass 3 and passed it. **Captain's PASS still covers `aae9cd8`
only.**

Not re-gated for structure, with the reasoning stated so the next reader can
disagree: C5 added no file, moved no module, added no import, changed no
`className` (diff 0), and left both test files under cap (232→234, 187→199).
Captain's domain is placement, caps, dependency direction, and one source of
truth — none of which C5 touched. That is a checkable claim, not a
reassurance; if any of it is wrong, Captain has a pass left.

## Captain, pass 1 — BLOCK (1 blocker, 7 notes). **C2 passes clean.**

Gauntlet re-run: tsc 0, eslint **0 bytes** of output, 236/236 Denver, tree
clean. Boundary audit: **5 files, no others** — the two contracts stayed
disjoint and every named off-limits file is untouched.

### BLOCKER — `replace` fires on 20 sub-pages, where the tap is a *real* navigation

`isActive` is **prefix-matching by construction** and says so
(`HubNav.tsx:16`: `pathname === href || pathname.startsWith(href + "/")`).
That is correct for **highlighting** — "this branch is current" — and wrong
for **history semantics** — "this tap goes nowhere". C1 conditioned both on
the same predicate.

So on `/kitchen/inventory`, `/calendar/new`, `/calendar/[id]/edit` and 17
others (**20 pages**, counted by `find`), tapping the tab is a genuine
navigation, and `<Link replace>` **discards the entry the user is standing
on**:

```
history [/calendar, /calendar/123/edit]  --tap Calendar (replace)-->  [/calendar, /calendar]
Back → /calendar → the same page again.  Dead press.
```

**That is the identical defect C1's own brief describes itself as removing**,
one level down. `router.refresh()` also fires there, adding a refetch to a
real navigation — the very cost the sibling comment rewrite in the same
contract was correcting elsewhere.

And the new comment — *"Re-tapping the tab you're already on is a no-op
navigation"* — **is false on those 20 pages.** An overclaiming comment, inside
the contract whose other half was fixing an overclaiming comment.

**Why C1's evidence didn't reach it:** both measured re-taps were taken at
tab **roots**, where `pathname === href` and the two predicates agree. The
test wasn't wrong; it was taken where the bug can't appear.

**Fix (inside C1's existing boundary, `HubNav.tsx` only):** keep `active` for
class names and `aria-current`; introduce `const isCurrentPage = pathname ===
item.href` for the history behaviour, and condition `replace` / `onClick` on
that. **Pathname equality, not full-URL equality, is the right grain** —
`/calendar?view=month` has pathname `/calendar`, so **every measured C1 result
is preserved byte-for-byte** and only the 20 sub-pages change.

### Ruling 1 — `timelineLayout.ts` earns the sibling slot; all four shape decisions stand

Imports verified as exactly the two allowed; no `server-only` correctly; no
lib module imports `app/` or `components/`; no cycle.

- **`TimelineEvent` ≡ `MonthLayoutEvent` is good reuse, and the compiler
  really is enforcing it today** — `timelineLayout.test.ts:339` passes a
  `TimelineEvent[]` straight into `assignLanes` and `tsc` exits 0 over it.
  Captain notes which direction that catches (adding a field to
  `MonthLayoutEvent` breaks that line; adding one to `TimelineEvent`
  correctly does not) and flags: **that composition test is load-bearing
  structure, not just coverage — it must not be deleted when CV4's real call
  site makes it look redundant.**
- **`blockGeometry`'s `Pick<…, "startAt" | "endAt">` is "the strongest thing
  in the file"** — it converts "the timed path must never read an all-day
  row's stored times" from a rule an editor must remember into one the
  compiler refuses.
- `assignColumns` being generic where `assignLanes` isn't: divergence worth
  having. Generifying `assignLanes` to match would be churn in an
  out-of-contract file for a caller that doesn't exist yet.
- Not importing `monthLayout.ts` is **a stronger constraint than the
  constitution requires**, and buys something real: two packers with disjoint
  jobs, composed visibly at the call site rather than buried an import deep.

### Ruling 2 — the new test file at 349/350, and a threshold Captain declined to invent

Under the cap by the letter, so not a blocker — but **a file *born* at 349 is
different from one that grew there: the very next case breaks it, and CV4 is
the mission that adds timeline-adjacent cases.** The split line is already
visible in the file's own structure. **Requirement: the mission adding the
first new case splits it in that same commit** — geometry + DST, and column
packing + partition, each header naming the module both cover.

Captain **deliberately did not propose an amendment** for "born near the cap":
*"a line-count threshold on new files is my taste, not a structural rule, and
the constitution is better lean."* Cap ledger: `EventForm.tsx` 350, this file
349, `CalendarViews.tsx` 348, `useCalendarPeriod.test.ts` 344.

### Ruling 3 — amendments A and D held on their first live mission

CV2 adds no vocabulary, no gate, and **no view-conditioned logic at all**, so
D is satisfied the strongest way available: nothing flipped, and nothing new
was placed where it would later have to move. **D now binds CV4 exactly as
intended** — flipping `threeDay: true` is blocked until
`CalendarViews.tsx`'s three inline per-view expressions move into
`VIEW_CONFIG`. *"That is the enforcement working ahead of the mistake, which
is what it was for."*

One wording ambiguity, raised and then set aside: `BUILT_CALENDAR_VIEWS` is
built with `.filter(view => BUILT_VIEWS[view])`, which a quick reader might
mistake for the forbidden predicate form. It isn't — filtering **through** the
record is the sanctioned derivation; the forbidden thing is a *separately
maintained* predicate like `ASSIGNABLE_ROLES`. Captain offered exact wording
and then declined to push it: **"I'd rather not amend twice in two days."**

### Ruling 4 — conditioning belongs in `HubNav.tsx`, not `nav.ts`

The blocker is that the *predicate is wrong*, not that it lives in the wrong
file. "Am I on this page" is a function of runtime `pathname`, not a property
of a tab, and `router.refresh()` is client-runtime behaviour that would drag
navigation semantics into a pure lib vocabulary. Not amendment-A/D territory
either — the behaviour is uniform across all five tabs, not a per-member
difference. Singular-nav decision intact; `className` diff is **0**.

### Ruling 5 + the dormant clock

Ledger unchanged; CV2 created no duplication. `minutesOfDay` is the only
wall-clock-minutes computation in `src/`. `compareBlocks` and
`compareCandidates` are a shared *idiom* over different fields and types —
not copy-pasted logic, and a shared comparator across divergent field names
would be worse than both.

**`timelineLayout.ts` has no application caller, and Captain recorded the
reading rather than starting a mechanical count:** the dormant-export rule
was written for exports whose caller *went away* (`periodWindowEdges`, the
retired wall), and its refinement targets code describing behaviour the app
no longer has. **This is the opposite — a library built one phase ahead
against a written plan phase**, whose header names its consumer twice.
**CV3 is mission one with no caller; CV4 is the named consumer. If CV4 ships
without consuming it, the rule bites and it should be deleted with its
tests.**

## Vision, pass 1 — BLOCK (1 blocker, 6 notes)

**Two gates reached the same blocker by different routes** — Captain from a
code read, Vision from measurement — which is the strongest form of
agreement available. Vision's version **extends** it.

Gauntlet re-run; the 4 UTC skips confirmed as **tests 11–14, zone-conditional,
0 skips under Denver**. It also verified the mission-11 defect is genuinely
fixed by measuring a **base worktree**: Calendar re-tap there was history
2→**3** with **0 GETs** and a dead Back, against 2→2 with a real GET on the
fixed build.

### BLOCKER — measured, and case F is not what Captain found

```
D  / → Kitchen → Inventory → Kitchen tab → Back → Back
   BASE : history 4→5 · Back#1 /kitchen/inventory · Back#2 /kitchen
   FIXED: history 4→4 · Back#1 /kitchen (DEAD)     · Back#2 /

E  /kitchen → Cooking → Recipes → Kitchen tab → Back
   BASE : Back#1 /kitchen/cooking/recipes    FIXED: Back#1 /kitchen/cooking

F  /calendar (today) → Next → Calendar tab → Back
   BASE : Back#1 ?date=2026-09-10   FIXED: Back#1 ?date=2026-09-03 (DEAD, identical URL)
```

D and E are Captain's prefix-matching finding, measured. **F is not** — the
paged entry's *pathname* is already `/calendar`, so **an exact-path fix
would leave F standing.** Vision also measured that on D the
`router.refresh()` refetched the page being **left** (`GET
/kitchen/inventory`, and `/kitchen` served from cache) — so the "refresh
gesture" refreshes the wrong page on that path.

The user-facing scenario, in its words: *Emily opens Kitchen, taps Inventory,
taps the Kitchen tab to go back up, presses Back — she lands on `/kitchen`
again, and the Inventory entry is gone.*

**Vision's clean fix, which removes D, E *and* F:** on an exact-path re-tap,
`event.preventDefault(); router.refresh()` — **no navigation at all.**
And the observation that makes it safe: **the Today circle already covers
"go to today"**, so a re-tap that refreshes rather than resets loses nothing.
The alternative is to accept F and record it; **Fury chose the clean fix** —
a re-tap's job is *refresh*, and resetting the view is a different button
that already exists.

### ⚠️ NOTE that becomes a blocker if ignored — the two libraries *do* disagree, in exactly one case

This is the failure the contract was written to prevent, and Vision found the
single instance: a **zero-length timed event at exactly local midnight**
(00:00 → 00:00). `validateEventInput` rejects only `endAt < startAt`, so
`end === start` **is writable through the sanctioned path**.

```
daysEventCovers      → covers that day (eventDaySpan clamps it)
blockGeometry        → null on every day (end > dayStart is false)
belongsInAllDayRow   → false
partitionForTimeline → { allDayRow: 0, timed: 0 }
```

**The event would appear in the list views and be absent from the timeline.**
Across **225 events × 10 days** the agreement sweep found *only* these five
zero-length-midnight cases — everything else, including exact-midnight ends
and both DST days, agrees exactly. NOTE rather than BLOCKER because no view
renders blocks yet, **but it must be fixed before CV4 consumes this.**
Fix: treat `end <= start` as "covers `startOfDay(start)` only", mirroring
`eventDaySpan`'s own clamp. Vision also corrected the header's claim: the
degenerate clamp mirrors `eventDaySpan` **only for same-day** rows.

### ⚠️ A correction to *this record* — Fury repeated a claim that isn't true

This file says C2's pinned-Denver test is "genuinely non-vacuous under both
invocations." **Vision checked, and it is not.** Under `TZ=UTC` with the pin
removed, the same fixture is 2 real hours and `heightMinutes` is still 120 —
so the test's sole assertion **cannot detect the pin failing.** The pin does
work; the test just can't prove it did. Fix: add inside `withTimeZone` the
same `assert.equal(end - start, 3h)` the gated cases already carry.

**The gated skips are real** — zone-conditional, 0 under Denver, exactly
tests 11–14 under UTC.

### Other notes

- **`belongsInAllDayRow` hangs forever on an invalid `Date`** (reproduced with
  a 6-second watchdog) — `calendarDayDiff`'s `while (!isSameDay(...))` never
  terminates on NaN. **Pre-existing in `calendarDates.ts:88-99` and shared
  with `assignLanes`**, so not this mission's; `blockGeometry` handles the
  same input correctly. Not reachable from Prisma dates. Worth a guard
  someday.
- Duplicate id **with identical geometry** binds payload↔column by input
  order — exactly the K4 caller obligation the doc already states. Duplicate
  ids with *different* geometry are fine. **3,000 fuzzed runs** otherwise held
  every invariant; a 12-deep chain resolved to 6 columns correctly.
- The corrected cost comment **matches mission-11 pass 3 claim for claim** —
  neither over- nor under-claiming.
- DST guarantee held over **7,512 events × 3 columns** at 5-minute steps
  across both transition weekends in both zones; the all-day battery (15
  cases) matched; `allDayRow` composes with `assignLanes` unchanged.

## Handoff log

- 2026-09-03 — Opened by Fury after CV1 delivered and Bryce approved the five
  constitution amendments. C1 is mission-11's queued C5, folded in here as
  CV2's opening contract since the boundaries are disjoint from the library
  work and both can run at once.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —


---

## Captain, pass 2 — **PASS** (0 blockers, 5 notes)

Gauntlet re-run in full: tsc 0, eslint 0, 237/237/0 Denver, 237/233/4 UTC,
build 0, tree clean. Boundaries verified **off the tree, not the report** —
C4 touched exactly two test files and no source.

**Ruling 2 came due, and Captain ruled against its own wording.** It had
required the split happen "in that same commit"; C3 declined, for a stated
reason. Captain's finding: **C3 was right, and the rule named the wrong
unit.** A boundary is per-*contract*, so a same-commit requirement can only
be met by whichever contract happens to own the file — which the ruling
could not know in advance. What the rule actually protects is *the file does
not leave this mission over cap*, which C4 satisfied. Future rulings of this
shape say **mission**, not **commit**. It declined to amend STRUCTURE.md,
holding its pass-1 line that the constitution is better lean.

**It measured the composition case rather than trusting its own pass-1
reading.** Copied four lib files plus the test out of the repo, added one
required field to `MonthLayoutEvent`, and got `TS2345` at exactly the
`assignLanes` call — control clean, drift caught. `git status` empty
afterward; the repo tree was never touched.

**The split verified by a stronger instrument than the contract asked for.**
Rather than counting tests, it extracted every `test(...)` block from all
three files and compared bodies: `30 → 17 + 13`, zero titles dropped, zero
added, **zero bodies changed**. The cut fell between the file's own existing
dividers, subdividing none.

Notes: the CV4 consumption line missing from the plan; the "don't delete
me" comment missing from the composition test; **this mission file's C3/C4
heading mixup** (fixed above); a cap-trend flag on `timelineLayout.ts`
(331/350, 19 lines of headroom, CV4 is the consumer); and both test headers
claiming a cleaner separation than the files have. All routed to C5.

Confirmed clean and stated so a later gate need not re-open them: the test
glob reaches both files (21 `*.test.ts` enumerated against what the glob
resolves — identical sets); `d()`/`ev()` duplication is the established
per-file fixture pattern in eight test files, and `withTimeZone` was
correctly **not** copied into the zone-free file; dependency direction
intact; `HubNav.tsx` markup byte-identical to base; `ASSIGNABLE_ROLES`
already routed by constitutional text ("convert it at the next touch").

## Vision, pass 2 — **PASS** (0 blockers, 3 notes)

Gauntlet re-run: same numbers, independently.

**All three pass-1 findings confirmed independently rather than from the
record.**

- **The library sweep was reproduced, not matched.** Vision built its own
  harness with a different fixture — 750 events × 9 days × **5** zones
  including `Pacific/Chatham`, a +12:45 half-hour DST zone the builder never
  used — and found **0** disagreements. Then proved the harness non-vacuous
  by running it against the pre-fix file: **89 / 85 / 85**. Its sweep also
  finds *more* shapes than the recorded midnight-only case (any `end <=
  start` near a day boundary), and the fix covers all of them.
- **The pin proof: matched.** Pin present under UTC, 13 pass / 0 fail; pin
  removed, **1 fail** with the exact assertion message.
- **C4's byte-identity: matched, after Vision caught its own instrument.**
  Its first parser silently under-counted (13 of 30) — it caught that
  against the runtime count, rebuilt it line-based, and got 30 → 17 + 13,
  0 missing, 0 added, 0 bodies changed, **67 `assert.*` calls both sides**.

**On whether "don't navigate" covers the class or just three instances** —
the question the contract asked it to be sceptical about: the predicate
splits on `pathname === href`, so the only divergence from a real navigation
is query/hash state at a tab root, and **of the five roots only `/calendar`
reads `searchParams`.** The F-class is bounded to one route. It then
measured the claim that makes the trade safe (Today reaches the current
period from both a paged date and a distant month, and disables correctly)
rather than taking it from the comment.

**Its first network capture returned `[]` even for the control** — a broken
instrument, not a result. It fixed the capture and re-ran before reporting.
Second time on this mission a gate has caught its own tooling.

Notes: the scroll-to-top regression (above); the "not reachable here"
sentence — **0 document reloads across every path it constructed, so not a
blocker**, but the sentence states an app-wide claim a single file cannot
own and was already falsified once by a change in a *different* file; and
`isModifiedClick`'s comment, which claims to mirror Next's `isModifiedEvent`
but omits its `target` early-return. All routed to C5.

## Verdict

**Both assembled gates PASS.** CV2 is gate-verified end to end. C5 clears
the combined notes; no blocker was found by either gate on this pass.


## C5 — the contract, reconstructed after the fact

**Recorded late, and that is the finding.** C5 was dispatched with
boundaries in its prompt but **no contract was ever written into this
file**, so Vision's pass-3 boundary audit had no declared may-touch list to
audit against. It recorded that rather than blocking — the changes were
correct and it had reviewed the substance — while noting the boundary rule
"bought nothing here, and would have bought nothing had the change been
wrong." That is the right reading: a boundary that exists only in a dispatch
prompt is not a boundary, because the prompt is not the durable record.

- **Objective:** clear both gates' combined notes. No blocker existed.
- **May touch:** `HubNav.tsx`, `useCanonicalCalendarUrl.ts`, both timeline
  test files, `.avengers/plans/calendar-v2.md`.
- **Must not touch:** `timelineLayout.ts`, any other source file, and this
  mission file (Fury was writing it in parallel).
- **Verification:** gauntlet both zones, count unmoved at 237, `className`
  diff 0, and the scroll fix measured in a real browser without costing the
  refetch or adding a history entry.

## C5 — DONE, committed `117cd33` + `9b8d5ea`

Clears both gates' combined notes. No blocker existed; this is the
"true but worth fixing" batch.

**The one behaviour change: scroll-to-top restored** on an active-tab
re-tap. `window.scrollTo({ top: 0 })` beside `router.refresh()`,
unconditional. Measured in a real authenticated browser: `/kitchen`
scrollY **150 → 0**, `/calendar` **120 → 0**, history unchanged in both,
and the RSC refetch still fires — the refresh was not traded away for the
scroll. Sub-page taps, inter-tab taps, and modified clicks all confirmed
unaffected (`className` diff 0, so no design-gate escalation created).

**Three comments narrowed to claims their file can keep:**
`useCanonicalCalendarUrl`'s app-wide reachability sentence → what the hook
itself guarantees; `isModifiedClick`'s "mirrors Next's `isModifiedEvent`" →
the real relationship, after reading `link.js:47-52` in this tree rather
than from memory; and both test headers' overstated split.

**Two "don't delete this" facts moved to where the next person stands:**
the composition test now carries its own load-bearing comment (with the
type-probe both gates independently ran as the evidence), and
`calendar-v2.md`'s CV4 section now names the exports CV4 consumes plus the
dormant-export deletion deadline. Neither lived anywhere a CV4 builder
would look.

**One correction to my own contract.** I prescribed the phrase *"apart from
a single cross-check assertion in each direction."* The builder applied it
verbatim **and flagged that it is false for the packing file**, which
cross-checks `blockGeometry` at four call sites across two tests. It was
right on both counts — right to apply its contract rather than silently
re-derive Captain's wording, and right to say so. Fixed in `9b8d5ea`:
both headers now say a few cross-checks point each way, and say *why* they
exist, which is the claim that stays true as the files move.

Shipping a comment claiming one assertion where there are four, inside the
batch whose entire purpose was removing comments that claim more than they
can keep, would have been the precise failure under repair.

## Delivery

- **C1–C5 committed and pushed.** `git log origin/…..HEAD` → 0 local-only.
- Gauntlet at HEAD: tsc 0, eslint 0, **237/237/0** Denver, **237/233/4**
  UTC, build 0 (30 routes).
- Caps: `timelineLayout.ts` **331**, `timelineLayout.test.ts` **234**,
  `timelineLayoutPacking.test.ts` **199** — all under 350.
  `CalendarViews.tsx` **348, unchanged**, so Captain's pre-CV3 extraction
  ruling is undisturbed.
- **PR #11** opened against `claude/calendar-k2-month`; Gauntlet green.

**Deliberately not done:** Strange (no rendered surface until CV4 — tripwire
recorded); `CalendarViews.tsx`'s extraction (CV3's precondition, not CV2's
work); `calendarDayDiff`'s invalid-`Date` infinite loop (pre-existing, out of
every boundary so far); `ASSIGNABLE_ROLES` (already routed by constitutional
text). **Closed:** Captain's STRUCTURE.md concern-split re-wording — Bryce chose
the extended version. Captain's own text was adopted, plus one sentence
tying the bare name to the module's **primary concern** rather than to
whichever file happened to be retained, which also answers what a *second*
split does. That gap was worth closing rather than deferring: the rule's own
text already names `useCalendarPeriod.test.ts` at 344 as the next file
needing it, and this repo's files provably return to the cap — this one was
born at 349 and hit 376 within a single mission. Left unsaid, the bare name
would eventually land on whatever concern hadn't been named yet: the
broadest label on the narrowest content. Nothing else was added — Captain's
"the constitution is better lean" is right, and it turned down two other
amendments this week on that ground.


---

## Vision, pass 3 — **PASS** (re-gate of `fe26316`; supersedes its pass-2 verdict)

Gauntlet re-run on the C5 tree: tsc 0, eslint 0, **237/237/0** Denver,
**237/233/4** UTC, build 0. Database at baseline (`calendarEvent` 4,
`user` 5), tree clean.

All three blocker cases re-measured and still fixed **under C5**, rather
than inferred from C5 not having touched the predicate: D and E preserve the
entry (history 4→5, 7→8, Back returns to the sub-page); F is 0 document
loads and 1 RSC fetch. **The scroll fix costs neither the refetch nor a
history entry** — `/kitchen` 180→0, `/` 318→0, 1 RSC, 0 doc loads, modified
clicks still unswallowed. Both comment corrections checked against the Next
source it read this pass. Test assertions untouched at **41 + 26 = 67**,
identical to its C4 audit.

### The finding that matters, and it is Fury's

**The mission was recorded DELIVERED on a tree no gate had seen.** `8ffb271`
("both gates PASS") and `7db42f5` ("CV2 delivered: both gates PASS") both
**post-date** `117cd33`, which changed four source files including a live
behaviour line. Both gates' PASSes covered `aae9cd8`. Until this re-gate,
nothing had verified the shipped tree.

**The code turns out to be correct — but that was luck of review order, not
evidence.** Vision's own words. This is the project's tracked
"recorded but not verified" class one turn deeper: not a stale *plan* record
(the dashboard), not a stale *test* claim (C4's missing `recipeFilters`
tests), but **a stale gate record** — the strongest kind of claim this
process makes, asserted about a tree the gate never saw.

The mechanism was ordinary and will recur: gates passed, then notes were
actioned, and actioning the notes changed the code. **A fix contract written
to satisfy a gate invalidates that gate's verdict.** The habit that follows:
if a contract lands after a PASS, the PASS covers the old tree until it is
re-run or the delta is enumerated and shown not to reach that gate's domain.

Its two other notes — the ledger table stopping at pass 1 while commits
asserted otherwise, and C5 having no written contract — are both fixed
above.

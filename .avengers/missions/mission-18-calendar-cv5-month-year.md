# Mission: CV5 — Month text pills, MonthChips, Year

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES — 5 contracts DONE, Vision + Captain blockers closed, **Strange not yet run (paused for usage)**
**Started:** 2026-09-06 · **Updated:** 2026-09-06

## Brief

- **Goal:** Close CV4's one open finding, then finish the Month/Year half of
  Calendar v2 — month pills that show text on a phone, a month-name scroller
  above the grid, and a Year view that makes all six views reachable for the
  first time.
- **Done means:** the boundary-day `sr-only` string is true on the UTC
  production path; `TimelineGrid.tsx` is under the 650 hard cap with real
  headroom; a Month pill shows its title at 375px; `MonthChips` scrolls and
  jumps to a month; `YearView` renders 12 mini-grids and `BUILT_VIEWS.year`
  is `true`, so the picker offers Year and `?view=year` resolves; the
  gauntlet passes on all three timezone legs.
- **Out of scope:** CV6 (month dropdown, swipe paging), CD1 (drag to
  reschedule), K3 filters/tags, K4 recurrence, the RSVP and search
  walkthroughs, Google sync. Captain's nine round-1 notes from mission-17
  are routed here only where a contract already touches the file.

## Danger register

Absolute, for every agent including Fury:

- **Never** `npm run db:seed` / `npm run db:reset`; never a Neon branch reset.
- **Never** create, update, delete or deactivate `User` rows. No clean/reset
  script for `User`, ever.
- **Never** edit an existing migration. This mission adds none.
- The dev branch holds **real family data**. Report roles and counts, never
  names or event titles.
- Baseline for verification: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
  Scoped `db:seed-*` / `db:clean-*` only; delete fixtures **by id as each
  measurement finishes**, not batched (a rate-limit death stranded 25 rows).
- **Never** `git add -A` / `git add .` — stage by explicit path.
- Secrets live in `.env` and Vercel only; never in git, chat, or code.
- Direct pushes to `main` are blocked. Branch → PR → green Gauntlet → merge.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (America/Denver)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `npm run build`
- At delivery: `node .claude/skills/avengers/recordcheck.mjs origin/main..HEAD`

## Assembled

- **Stark + Vision** — irreducible.
- **Strange** — every contract changes something a human looks at.
- **Captain** — three new files, a file at the hard cap, and
  `CalendarViews.tsx` already at **459/350** before this mission adds two
  branches to it.
- **Banner — NOT assembled.** The plan section is specific and the tree was
  read directly while writing these contracts (mount points, sizes and the
  renderer switch are all quoted below from real greps). Said out loud so a
  gate can hold me to it.

## Known risk, named before the gate finds it

`CalendarViews.tsx` is **459 total / ~228 code**, already past the 350 soft
cap. C3 and C4 both add a branch to it. If C4's addition pushes it toward the
hard cap, the extraction is part of C4 rather than a follow-up — the
mission-17 lesson was that a file must not *leave* the mission over cap, and
that writing a hard-cap justification instead is self-refuting.

## Contracts

### C1 — the false screen-reader string, and the extraction it is coupled to
- **Status:** **DONE** — merged. **CV4's one open finding is closed.**
  `TimelineGrid.tsx` **649 → 555 total / 297 code** (95 under the hard cap,
  45 under the contract's own target); new `TimelineDayColumn.tsx` 232/113.
  Old string: **0 occurrences**. All four numbers and the whole gauntlet
  re-measured by Fury, not taken from the report.
  **Evidence worth keeping:** behaviour-preservation was proven by a
  **byte-identical before/after DOM trace** on two real days (one with three
  timed events, one with none) at 375×812, driven by headless Chromium over
  CDP against a **production build** — not the browser pane, whose renderer
  runs hidden. And the builder **declined to claim** it had reproduced the
  false-string path: it stated plainly that a single request can never see
  its own columns as outside a window centred on their own anchor, so the
  defect is a genuine UTC-only production artifact. Saying "I could not test
  this, and here is why" is the behaviour the doctrine wants.
- **Objective:** Make the boundary-day `sr-only` string true on the
  production path, and bring `TimelineGrid.tsx` under the hard cap with real
  headroom in the same contract, because CV4 established the two are coupled.
- **Boundaries:** may touch `src/components/TimelineGrid.tsx`, new
  `src/components/TimelineDayColumn.tsx` · must not touch
  `src/lib/timelineLayout.ts`, `src/lib/monthLayout.ts`, `src/lib/appChrome.ts`,
  `src/components/TimelineAllDayStrip.tsx`, `src/lib/calendarViewConfig.ts`,
  `actions/**`, `prisma/**`.
- **The defect, exactly:** `TimelineGrid.tsx:423` reads
  `— no events loaded for this day`. `isOutsideWindow` flags a **partially**
  fetched day (`dayEnd > windowEnd`), and on Vercel's **UTC** server that
  boundary falls at **5 PM Denver** — so a screen reader is told nothing
  loaded while that morning's events render underneath the claim. **It cannot
  reproduce on a Denver server**, so local dev structurally cannot show it.
- **The fix:** `— not all events loaded`. True in both the unfetched and
  partly-fetched cases, unmisreadable as a count, shorter than the shipped
  string, and it reuses `DaySection`'s existing `NotLoadedCard` wording. **The
  comment justifying the current wording must change with the string** — a
  stale justification is this project's named defect class.
- **Verification:** the gauntlet; `wc -l src/components/TimelineGrid.tsx` and
  the new file, both reported as total AND code (STRUCTURE.md judges the cap
  on total and asks for both); a rendered check at 375×812 that the timeline
  is unchanged apart from the string.
- **Evidence required:** the new string in place with its rewritten comment;
  both files' two line counts; proof the extraction is behaviour-preserving
  (a before/after DOM trace of one timeline day, not a claim); the failing
  case named in words.
- **Done criteria:** `grep -c "no events loaded for this day" src/` is 0;
  `TimelineGrid.tsx` total ≤ 600 (real headroom, not one line); gauntlet green.

### C2 — Month pills show their text on a phone
- **Status:** **DONE** — merged. The `md:` gate is gone (`md:not-sr-only`
  count is **0**); a pill shows its title at every width. Capacity
  re-measured with `Range.getClientRects` on real data: **6–8 characters at
  375px**, 5–6 at 320, dropping to **5** when a completed task's checkmark
  shares the box. Accessibility names **4/4 exposed before and after** —
  `sr-only` was already keeping them in the tree, so the `md:` gate was
  hiding them only visually. `body.scrollWidth === innerWidth` at both
  widths. `MonthCell.tsx` **300 → 350 total / ~108 code — exactly ON the
  soft cap**, flagged for Captain.
- ⚠️ **FURY'S CONTRACT WAS WRONG, for the fifth time in this project, and
  this time the tool had already told me.** C2's contract asserted the
  comment "says a pill holds `~2 characters`". At the very commit I
  contracted against, `MonthCell.tsx:245` already read **"holds roughly 7-8
  characters"** — corrected by mission-9/C8 long before. What was genuinely
  stale was the *hide-it-below-`md`* rationale, which is what the builder
  fixed. It proceeded rather than blocking, because the objective was
  reachable regardless, and **disclosed the wrinkle instead of quietly
  working around it** — the right call on both counts.
- ⚠️ **The part that matters more: `preflight.mjs` caught this and I did not
  read it.** Its C2 run printed *"4 claim(s) about what exists or how many —
  THIS TOOL CANNOT SETTLE THEM"* and quoted my false sentence back to me
  **twice**, verbatim. I settled the dependency findings by hand and skipped
  the claims list. **Within the same hour I had told Bryce that CI can print
  a REVIEW line but cannot make anyone read it.** The tool worked; the
  foreman didn't. Surfacing is not enough, and this is the evidence.
- ⚠️ **Hygiene:** the builder left a copy of `.env` in its worktree. Never
  committed (gitignored, and the diff carries zero secrets — both verified),
  but a worktree must not keep a live secrets file. Deleted by Fury.
- **Objective:** Drop the `md:` gate so a Month pill shows its title at phone
  width, and replace the stale rationale that justified hiding it.
- **Boundaries:** may touch `src/components/MonthCell.tsx` · must not touch
  `src/components/MonthGrid.tsx`, `src/components/CalendarViews.tsx`,
  `src/components/TimelineGrid.tsx`, `src/lib/**`, `actions/**`, `prisma/**`.
- **The stale rationale:** the comment says a pill holds "~2 characters" at
  375px. mission-9 superseded the measurement it rested on and the plan
  records that **8 fit**. Re-measure rather than copying either number, and
  write what you measured.
- **Watch:** `MonthCell.tsx:285` currently reads
  `sr-only md:not-sr-only md:inline`. `sr-only` is what puts the title in the
  accessibility tree today; removing the gate must not remove the title from
  the tree, and must not reintroduce the ink-overflow defect that was fixed
  **three times** in CV4 — measure with `Range.getClientRects`, never
  `getBoundingClientRect`, which structurally cannot see ink overflow.
- **Verification:** the gauntlet; measured character capacity at 375px;
  accessibility-tree names present at both widths.
- **Evidence required:** the measured number that replaces "~2 characters";
  before/after `Range.getClientRects` showing no ink escapes its box at 375
  and 320; the count of exposed event names at 375 before and after.
- **Done criteria:** a pill title is visible at 375px, no ink escape, no name
  lost from the accessibility tree, gauntlet green.

### C3 — `MonthChips`: the month-name scroller
- **Status:** **DONE** — merged. 25 chips (±12 months), Januaries carry the
  year and **no other month does** (`nonJanuariesWithYear: []`), selected
  chip auto-recentres. Measured: every chip **exactly 44px tall at 375 and
  320** — the DESIGN.md floor, not eyeballed. The scroller absorbs its own
  overflow (`scrollWidth 1782` against `clientWidth 320`) while
  `body.scrollWidth === innerWidth` at both widths, before and after, so
  nothing leaks to the page. A **real tap** moved the rendered heading
  September 2026 → March 2026. `CalendarViews.tsx` 459 → **492 total / ~236
  code** (158 under the hard cap); `MonthChips.tsx` 106/52. Boundary exactly
  the two allowed files; gauntlet re-run by Fury.
- ⚠️ **A REAL GAP IN THE PLAN, found by the builder and verified by Fury.**
  `.avengers/plans/calendar-v2.md:262` specifies *"tap = `jumpTo(1st,
  "month")`"*. **That is not reachable.** `useCalendarNavigation.ts`'s return
  value is `{view, anchor, today, step, goToToday, setView, openDay}` —
  **`jumpTo` is not in it** (confirmed by reading the return statement, not
  the imports; the hook destructures `jumpTo` from `useCalendarPeriod` and
  uses it only internally). `openDay` forces Day view; `step` moves one
  period and reads a stale closure, so looping it is wrong; `setView` takes
  no target day. The builder pushed `buildCalendarSearch("month", day)`
  through the router already present for the Add sheet — **not an unguarded
  bypass**: the hook's own resync effect is documented to treat an unmatched
  search-param change as an external navigation and re-point the cursor with
  `jumpTo`, which it verified live. **CV6's dropdown hits this identical gap**,
  so re-exporting `jumpTo` belongs to whichever contract may touch that hook.
- ⚠️ **Disclosed by the builder, verified by Fury: a full dev-branch
  connection string was printed into its own local transcript** by an early
  `grep`, before it added redaction. **Nothing durable was touched** — the
  only `postgresql://` strings anywhere in the branch are vendored Prisma
  **documentation placeholders** (`USER:PASSWORD@HOST`), the worktree's
  `.env` was deleted, and `git status` is clean. **Second transcript
  exposure of a dev credential** (2026-09-02 was a fragment; this was the
  whole string). Strengthens the case for the parked dev-branch rotation.
- **Objective:** A horizontal scroller of month names above the Month grid;
  the year is shown once at each January; tapping a month jumps to its 1st.
- **Boundaries:** may touch new `src/components/MonthChips.tsx`,
  `src/components/CalendarViews.tsx` · must not touch
  `src/components/MonthCell.tsx` (C2 owns it), `src/components/MonthGrid.tsx`,
  `src/components/TimelineGrid.tsx`, `src/lib/calendarViewVocabulary.ts`,
  `actions/**`, `prisma/**`.
- **Why it mounts in `CalendarViews.tsx`:** `MonthGrid` is rendered there, at
  the `renderer === "month"` branch — verified by grep, not assumed. **CV6
  reuses these chips for its dropdown**, so the component must not depend on
  anything Month-specific; it takes an anchor and an `onPick`, nothing more.
- **Verification:** the gauntlet; tap a chip and confirm the grid moves to
  that month; 44px minimum touch targets; horizontal scroll does not leak
  into the page (`body.scrollWidth`, never `documentElement.scrollWidth`).
- **Evidence required:** measured target sizes; `body.scrollWidth` at 375 and
  320 before and after; a real tap changing the rendered month.
- **Done criteria:** chips render above the grid, jump correctly, no
  horizontal page overflow, gauntlet green.

### C4 — `YearView`, and Year becomes reachable
- **Status:** **DONE** — merged. **ALL SIX VIEWS ARE NOW REACHABLE**, the
  first time in this project: `BUILT_VIEWS.year` is `true` and the picker
  lists Schedule · Day · 3 Day · Week · Month · Year. Twelve mini-grids from
  the **same `monthGridDays`** the real grid uses; each month one tappable
  tile (166×144 at 375, 138×144 at 320 — far past the 44px floor); today's
  circle measured live at **7.93:1 dark / 5.08:1 light**, both clear of 4.5.
  Prev/Next round trip returns to the identical anchor, shown as real URLs.
  `body.scrollWidth === innerWidth` at 375 and 320.
  **`CalendarViews.tsx` went DOWN, 492 → 478**, because the dead
  `"daySection"` case went with it — `CalendarRenderer` is now
  `"month" | "schedule" | "timeline" | "year"`, and the only surviving
  mentions of the old tag are historical comments (checked, not assumed).
  `YearView.tsx` 102/55. Gauntlet re-run by Fury.
- **Skeleton: 924px against a rendered 924px — 0px difference.** Method
  disclosed rather than dressed up: the builder could not win the SSR
  streaming race after five escalating attempts, so it measured the
  skeleton's exact markup injected into the same live page under the same
  CSS. It said so plainly instead of claiming it watched the transition.
- ⚠️ **FURY'S CONTRACT WAS WRONG AGAIN — the sixth time, and the same shape
  as CT1/C4: a boundary that excludes the only files the contract's own done
  criteria can be met with.** Flipping `BUILT_VIEWS.year` — my stated done
  criterion — necessarily falsifies assertions in four test files I did not
  list. **Proven, not argued:** reverting only those four files and running
  the suite gives **exactly 9 failures**, the number the builder reported.
  The builder edited only the broken assertions, substituted a fictional
  `"quarter"` where a not-built example was still needed, disclosed it in
  full, and offered to revert. **Its judgment was right and my boundary was
  wrong.** One of those files had even written its own future: *"this
  assertion is meant to fail then, and to be updated then."*
- ⚠️ **And preflight surfaced this too — the SECOND time in one mission I
  was handed the fact and did not act on it.** C4's preflight printed
  `BUILT_VIEWS → 11 file(s)` and named `calendarPaging.test.ts` and
  `calendarViewConfig.test.ts` among them. I read that line while settling
  the *claims* and never asked the next question: *what breaks when I flip
  it?* **A reference count is only useful if you ask what the references
  do.**
- **Objective:** Twelve mini month-grids, day numbers only, today circled,
  tapping a month opens it; flip `BUILT_VIEWS.year` to `true` so the picker
  offers Year and `?view=year` resolves.
- **Boundaries:** may touch new `src/components/YearView.tsx`,
  `src/lib/calendarViewVocabulary.ts`, `src/lib/calendarViewConfig.ts`,
  `src/components/CalendarViews.tsx`, `src/app/(app)/calendar/loading.tsx` ·
  must not touch `src/components/MonthCell.tsx`,
  **`src/components/MonthChips.tsx` — created by C3, so it does not exist at
  the time this contract is written; C4 dispatches only after C3 is DONE** —
  `src/components/TimelineGrid.tsx`,
  `src/lib/timelineLayout.ts`, `actions/**`, `prisma/**`.
- **The reachability rule binds here.** STRUCTURE.md makes a per-member
  difference outside a total record a **BLOCKER the moment a reachability
  entry flips**. `renderer` in `calendarViewConfig.ts` is a total record and
  the switch in `CalendarViews.tsx` is `never`-typed, so adding `"year"`
  is a compile error until every branch handles it — **let that mechanism
  work; do not widen a type to silence it.**
- **Year steps by `monthOffset ± 12`** and reuses `monthAnchor` — CV1 built
  this deliberately so no new offset was needed. Do not add one.
- **The skeleton must be MEASURED**, not guessed: mission-7's rule, and CV4
  found a 225px jump by measuring rather than trusting.
- **Verification:** the gauntlet; the picker lists six views; `?view=year`
  resolves and renders; a Prev/Next round trip from Year returns to the same
  anchor; skeleton height within a few px of the rendered view.
- **Evidence required:** the picker's six rows; the measured skeleton height
  against the rendered height; the round-trip anchor equality; both line
  counts for `CalendarViews.tsx` after the change, against 350 and 650.
- **Done criteria:** all six views reachable, `BUILT_VIEWS.year === true`,
  no view unreachable from picker or URL, gauntlet green.

## Preflight, run before any dispatch

First mission with `preflight.mjs`. Run on all four contracts; **it caught a
real defect in C4 on its first real use** — `MonthChips.tsx` sat in C4's
must-not-touch list as though it existed, when C3 creates it. Harmless in
effect (forbidding an absent file forbids nothing) but the premise was wrong,
which is the exact class the tool exists for. Contract amended to say so.

**And that produced a lesson about the tool itself, worth more than the
catch:** the FAIL does **not** clear, because C4 legitimately forbids a file
C3 has not created yet. Preflight is a **pre-dispatch** check, not a
contract-writing check — a sequential contract's boundary is true at the time
it runs, not at the time it is written. **C4's preflight is therefore re-run
immediately before C4 is dispatched, after C3 is DONE**, and only that run
counts. Recorded rather than silenced: marking the path `new` would have made
the tool pass by making the contract lie.

Settled by hand, because the tool cannot settle them:

- **C1/C2/C3/C4 "may-touch depends on must-not-touch"** — every instance is a
  *consume unchanged* relationship (`TimelineGrid` → `timelineLayout`,
  `appChrome`, `TimelineAllDayStrip`; `MonthCell` → `constants`,
  `calendarDates`, `mealPlanDates`, `color`; `CalendarViews` → the components
  it mounts). None is where the behaviour being changed is decided, so each
  contract **can** be satisfied inside its boundary. Checked per import, not
  waved through.
- **C1 `TimelineGrid.tsx` at 649/650, "1 line from the HARD cap"** — that is
  the contract's whole point, not a surprise.
- **C3/C4 `CalendarViews.tsx` at 459/350** — the named risk above.

## C4's preflight, re-run at dispatch time — and every claim settled

The earlier FAIL **cleared on its own**, exactly as predicted: `MonthChips.tsx`
exists as of C3's merge, so the boundary that was false at writing time is
true at dispatch time. That is the whole reason preflight is a pre-dispatch
check.

Seven claims surfaced. Five are done-criteria or evidence requirements, not
assertions about the tree. **The two real assertions were both checked:**

- *"the switch is `never`-typed, so adding a renderer is a compile error"* —
  **TRUE.** `CalendarViews.tsx`'s renderer switch ends in
  `default: { const exhaustiveCheck: never = renderer; … }`. Worth recording
  **how nearly I got this wrong**: a first `grep` for `never` in that file
  returned only prose comments and made the claim look false. Reading the
  actual switch showed the guard is real. Verifying cuts both ways — the
  discipline is not "assume my claim is wrong", it is "run the command".
- *"Year steps by `monthOffset ± 12` and reuses `monthAnchor`"* — **TRUE.**
  `useCalendarPeriod.ts:82` reads `year: { basis: "month", step: 12 }`. No new
  offset is needed, and that file is forbidden to C4.

**This is the settlement step I skipped on C2**, where preflight quoted my
false claim back to me twice and I read only the dependency findings.

### C5 — both gates' blockers, and four notes, in one batch
- **Status:** **DONE** — merged. Both blockers closed, four notes cleared.
  `showArrows` and `ownsTodayScroll` are now fields on the total `VIEW_CONFIG`
  record; `CalendarHeader` reads `showArrows` itself and the prop is gone;
  **zero inline `view === "schedule"` tests remain in the shell** (grep: 0).
  Two new per-row tests assert both fields across all six views — tests
  **333 → 335**. The Month skeleton reproduced Vision's **76px** gap first
  (303 against 379), then measured **379/379, three runs**, by mirroring the
  real box model rather than hardcoding a margin. MDT/MST labels corrected to
  **6 PM MDT / 5 PM MST**. `MonthChips`' suppression removed by hoisting
  (grep: 0); the other five files' suppressions deliberately untouched.
  Boundary exactly the eight allowed files; gauntlet re-run by Fury.
- **A builder judgement worth keeping:** for N3 it **rejected** my offered
  cast of `"quarter" as CalendarPeriodView`, on the grounds that it would
  call a typed function with a value its own type promises it never receives
  — "a smaller, quieter version of the fictional-view pattern already
  disclosed once this mission." It renamed the test instead. That is the
  right instinct, and it declined a shortcut I had explicitly offered.
- **Objective:** close Captain's reachability blocker and Vision's Month-skeleton
  blocker, and clear four notes, in one contract so neither gate is re-run twice.
- **Boundaries:** may touch `src/lib/calendarViewConfig.ts`,
  `src/lib/calendarViewConfig.test.ts`, `src/components/CalendarHeader.tsx`,
  `src/components/CalendarViews.tsx`, `src/app/(app)/calendar/loading.tsx`,
  `src/components/TimelineGrid.tsx`, `src/components/MonthChips.tsx`,
  `src/lib/calendarPaging.test.ts` · must not touch
  `src/components/YearView.tsx`, `src/components/MonthCell.tsx`,
  `src/components/MonthGrid.tsx`, `src/components/TimelineDayColumn.tsx`,
  `src/lib/calendarViewVocabulary.ts`, `src/lib/useCalendarNavigation.ts`,
  `src/lib/useCalendarPeriod.ts`, `src/app/actions/**`, `prisma/**`.
- **Note on the boundary:** `src/app/(app)/calendar/loading.tsx` is **in** the
  may-touch list this time. Its absence from C3's list is what produced
  Vision's blocker. There are **eight** `loading.tsx` files in this repo —
  preflight flagged the bare name as ambiguous — so the full path is what
  binds, and it is the only one this contract may touch.
- **B1 (Captain).** Add `showArrows: boolean` and `ownsTodayScroll: boolean`
  to `ViewConfig` beside `pinned`. `showArrows` is `false` on `schedule`,
  `true` on the other five; **delete the `showArrows` prop from
  `CalendarHeader` entirely** and read `VIEW_CONFIG[view].showArrows` inside
  it, mirroring `pinned` (it already imports `VIEW_CONFIG`). Move
  `calendarViewConfig.ts:244`'s existing explanation onto the new field's doc
  comment. `ownsTodayScroll` is `true` on `schedule` only;
  `CalendarViews.tsx:170` becomes `config.ownsTodayScroll ? … : …` and `:173`
  becomes `if (config.ownsTodayScroll)`. **Branch bodies stay put — only the
  condition moves.** Extend `calendarViewConfig.test.ts`'s per-row assertions
  to cover both new fields. Leave **zero** inline `view === "<member>"` tests
  in the calendar shell.
- **B2 (Vision).** The Month skeleton is **76px short** since C3 mounted
  `MonthChips`: skeleton weekday row y=303 against a real y=379, measured at
  375×812 on a production build. In the **`monthGrid` branch only** (Year must
  NOT get it — Year measured 0px difference and is correct), render a strip
  placeholder above `<MonthGridSkeletonRows />` mirroring `MonthChips`' outer
  box. **Do not derive the number as 44+16** — measure until the skeleton's
  weekday-row top equals the rendered 379.
- **N1.** `TimelineGrid.tsx:428` reads *"5 PM Mountain Daylight Time (6 PM
  Standard)"*. **The labels are swapped**: MDT is UTC−6, so UTC midnight is
  **6 PM MDT / 5 PM MST**. Fix the comment. *(The wrong number was mine — this
  mission file said "5 PM Denver" and the builder copied it. Corrected here
  too.)*
- **N2 — downgraded, because Vision's premise is false and I checked before
  passing it on.** The suppression is at **`MonthChips.tsx:70`, not :97**, and
  it is **not** "the first suppression in non-generated `src/`": six files
  outside `src/generated` carry one — `TimelineGrid.tsx`,
  `PhotoImportForm.tsx`, `MonthChips.tsx`, `useCanonicalCalendarUrl.ts`,
  `useScheduleWindow.ts`, `useCalendarNavigation.ts`. So the "don't start this
  pattern" argument does not apply; it is the sixth, not the first.
  **Still do the fix**, for the ordinary reason rather than the dramatic one:
  hoisting `const year = anchor.getFullYear()` and
  `const month = anchor.getMonth()` and depending on `[year, month]` is
  simply better than suppressing the rule, and the project has a standing
  precedent of a builder refusing a suppression when a safer substitute
  exists. **Do not remove the other five** — out of boundary and unexamined.
- **N3.** `calendarPaging.test.ts:169` is titled `"buildCalendarSearch: …"` but
  no longer calls it. Rename the test to what it asserts, or cast
  `"quarter" as CalendarPeriodView` to keep exercising the function.
- **Verification:** the full six-leg gauntlet; the measured skeleton
  weekday-row top against the rendered one; `grep -rn 'view === "schedule"'
  src/components/CalendarViews.tsx` → 0; `grep -c "eslint-disable" src/components/MonthChips.tsx` → 0 (the other five
  files keep theirs).
- **Evidence required:** the measured before/after skeleton offsets by the
  same method Vision used; the two greps; the new `ViewConfig` rows; gauntlet
  output.
- **Done criteria:** both blockers closed, four notes cleared, gauntlet green,
  no inline per-view test left in the shell.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | **BLOCKED** | 1 | 7 notes, 2 amendments drafted. Re-ran all six gauntlet legs first |
| 1 | Vision | **BLOCKED** | 1 | 9 notes. Re-ran all six legs. **Reproduced the CV4 finding that C1 said could not be reproduced locally** |
| — | C5 | DONE — merged | — | Both blockers closed, four notes cleared, tests 333 → 335 |
| 1 | Strange | **NOT RUN — paused for usage** | — | Bryce is low on usage; the design gate is the most expensive remaining step |

### Captain pass 1 — BLOCKED, and the argument is better than the finding

**The blocker:** three per-member differences sit outside the total record in
the very commit that flips a reachability entry —
`CalendarViews.tsx:405` (`showArrows={view !== "schedule"}`), `:170`
(`headerIsCurrentPeriod`) and `:173` (`if (view === "schedule")` in
`handleToday`). STRUCTURE.md: *"a member's reachability entry may not flip to
`true` in a commit that leaves any per-member difference outside a total
record."*

**None of the three actually mislabels `year`** — Captain checked each, and
`showArrows = true`, year-comparison `isCurrentPeriod` and plain `goToToday()`
are all correct for Year. It ruled BLOCKER anyway, and the decisive reason is
one I had not thought of: **this is the LAST flip.** `BUILT_VIEWS` is now
all-`true`, so the tripwire that would ever collect this debt **can never fire
again** for calendar views. Waving it through does not defer the cleanup, it
retires the mechanism. My own C4 contract quoted this clause and then
addressed only `renderer`.

**Accepted without argument.** Fix contract **C5** below.

### Vision pass 1 — BLOCKED, and it proved the thing nobody could prove

**It reproduced the defect CV4 shipped open.** C1 honestly said the false
string could not be reproduced locally, and it was right about *steady
state*. Vision found the **transition** state: holding every RSC response
with CDP `Fetch` and paging Week ×8 (the cursor moves optimistically before
the push) puts Nov 1–7 against a Sep-6 window. A Denver server then flags two
days; **`TZ=UTC next start` flags three** — Nov 5 being the partially-fetched
day — and the column reads **`— not all events loaded`**. So the fix is
*verified on the failing path*, not merely reasoned about. That closes CV4's
open finding properly.

**The blocker: this mission broke the Month skeleton, and it is my boundary
again.** C3 mounted `MonthChips` above `MonthGrid`, but `loading.tsx` was
**not in C3's may-touch list** and C4 touched only Year. So the Month
skeleton no longer matches the Month render: measured at 375×812 on a
production build, skeleton weekday row **y=303** against a real **y=379** —
a **76px** jump on every cold load of `/calendar?view=month`. Vision proved
the 76px belongs to this mission by removing the strip from the live page and
watching the real row return to exactly 303. A tap aimed at skeleton row N
lands on real row N−1 during the swap. **Seventh contract error, and the
second in this mission of the identical shape** — a boundary that excludes
the file which must change for the change to be complete. DESIGN.md's
"skeletons shaped like the real content" is a written rule, so it is a
BLOCKER by the severity test, not taste.

**And a number I got wrong that propagated into the code.** This mission file
said UTC midnight falls at **"5 PM Denver"**. It does not: MDT is UTC−6, so
it is **6 PM MDT / 5 PM MST**. The builder copied my framing into
`TimelineGrid.tsx:428` as *"5 PM Mountain Daylight Time (6 PM Standard)"* —
labels swapped. **A wrong number in a contract becomes a wrong comment in the
code**, which is this project's named stale-justification class, seeded by me.

### A bug Captain found in Fury's own tool, and it is fixed

`preflight.mjs`'s code counter tested `startsWith("/*")`, which a **JSX**
comment never satisfies — it opens with `{`. So `{/* … */}`, this repo's
dominant documentation form in `.tsx`, was counted as **code**. The same file
read **237** code lines by the tool and **108** by Captain's JSX-aware count,
and STRUCTURE.md's size clause takes that number as its judgement input: the
counter was arguing to split the files that explain themselves best. Fixed;
the tool now reads MonthCell 105 / CalendarViews 224 / TimelineGrid 201
against Captain's independent 108 / 223 / 206. Synced to both copies.

## Handoff log

- 2026-09-06 — **C5 DONE and merged; both gate blockers closed.** **PAUSED
  HERE, deliberately:** Bryce is low on usage and Strange (the design gate)
  is the most expensive remaining step. Nothing is half-done — five contracts
  are merged, the six-leg gauntlet is green, and the branch is unpushed.
  **To resume:** run Strange on this tree, then deliver. Vision and Captain
  both blocked on the *previous* tree, so **their PASS is not on record for
  the current one** — re-run them, or enumerate the C5 delta and show it does
  not reach their domains. Vision said so itself.
- 2026-09-06 — **C4 DONE and merged. All four contracts built; ALL SIX VIEWS
  REACHABLE.** My boundary was wrong for the sixth time — proven by reverting
  the four test files and reproducing exactly 9 failures. Preflight had named
  those files in a reference count I read and did not act on. Gates next.
- 2026-09-06 — **C3 DONE and merged.** Two findings, both verified rather
  than taken on trust: the plan's `jumpTo` call is not reachable through the
  navigation hook's public surface, and a dev connection string reached a
  local transcript while nothing durable was touched. **C4 is next and its
  preflight must be re-run now** — `MonthChips.tsx` exists as of this merge,
  which is what its earlier FAIL was about.
- 2026-09-06 — **C2 DONE and merged.** Boundary clean (one file). Gauntlet
  re-run by Fury. Two findings recorded above: my contract's premise was
  stale for the fifth time, and preflight had already quoted it back to me.
  A stray `.env` in the worktree was deleted.
- 2026-09-06 — **C1 DONE and merged.** Boundary audit clean: exactly the two
  files it was allowed. Worktree left clean, no `.env` survived, zero secrets
  in the diff — checked, because C1 temporarily copied `.env` in to drive a
  production build and minted a short-lived session token for the DOM trace.
  Both deleted by the builder and verified gone by Fury.
- 2026-09-06 — Mission opened. Scope read from `.avengers/plans/calendar-v2.md`'s
  CV5 section; file sizes, the `md:` gate at `MonthCell.tsx:285`, the
  `sr-only` string at `TimelineGrid.tsx:423`, and `MonthGrid`'s mount inside
  `CalendarViews.tsx` all verified by grep before the contracts were written.
  C1 and C2 have disjoint boundaries and go in parallel worktrees; C3 and C4
  share `CalendarViews.tsx` and are sequential. **First mission with
  `preflight.mjs` available — every contract goes through it before dispatch.**

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

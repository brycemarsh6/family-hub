# Mission: CV5 — Month text pills, MonthChips, Year

**Project:** family-hub (Marshee)
**Status:** **COMPLETE — all three gates PASS.** 6 contracts DONE. Unpushed by
decision: the merge is Bryce's call.
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

### C6 — the "today" marker belongs to the surface's own period

- **Status:** WRITTEN — preflight next, then dispatch.
- **Objective:** Close Strange's blocker: a today-marker may only be drawn on
  a cell belonging to the period its surface is showing. Fix `YearView`
  (the blocker) and `MonthGrid` (N-S6 — the identical defect, milder, and
  **confirmed by Fury to have no downstream guard**).
- **Boundaries:** may touch `src/components/YearView.tsx`,
  `src/components/MonthGrid.tsx` · must not touch
  `src/components/MonthCell.tsx`, `src/components/MonthChips.tsx`,
  `src/components/CalendarViews.tsx`, `src/components/TimelineGrid.tsx`,
  `src/components/TimelineDayColumn.tsx`, `src/lib/**`,
  `src/app/(app)/calendar/loading.tsx`, `src/app/actions/**`, `prisma/**`.
- **⚠️ SCOPE WIDENED BY ONE LINE BEYOND THE BLOCKER, deliberately, and said
  out loud so a gate can hold me to it.** Strange's own advice was "one line
  in `YearView.tsx`, then re-run me on Year alone." `MonthGrid` is added
  anyway, because: it is the *same one-line conjunct*; **Fury verified the
  defect is real** rather than taking it on trust (`MonthCell.tsx:129` renders
  `isToday ? … : (isCurrentMonth ? … )`, so `isToday` **wins** and there is no
  downstream guard); Month is the app's most-used calendar view, where on
  1 October September's grid circles a day that is not in September; and
  shipping a mission that *establishes* this rule while knowingly leaving a
  live instance is exactly the "clause whose cited instances are false"
  problem Captain filed as N-C11 in this same pass. The cost is that Strange
  re-verifies two views instead of one.
- **The defect, exactly, read from source not from the report:**
  - `YearView.tsx:80` — `const isToday = isSameDay(day, today);` and
    **`:81` already computes `const inMonth = isSameMonth(day, month);`** on
    the very next line. `isSameMonth` is already imported at `:4`.
  - `MonthGrid.tsx:211` — `isToday={isSameDay(day, today)}`, and **`:210`
    already computes `isCurrentMonth={isSameMonth(day, anchor)}`** on the
    adjacent line. `isSameMonth` is already imported at `:10`.
  Neither fix needs a new import, a new helper, or a new value — in both files
  the guard is **already computed one line away**.
- **The fix:** in `YearView.tsx`, reorder the two consts so `inMonth` is
  declared first, then `const isToday = isSameDay(day, today) && inMonth;`.
  In `MonthGrid.tsx`, `isToday={isSameDay(day, today) && isSameMonth(day, anchor)}`.
  **Do not restructure anything else**; do not touch the styling branches.
- **Comment discipline — this project's named defect class.** If either file
  carries a comment about the today marker that the change makes untrue, fix
  the comment in the same edit. Do **not** add a comment that merely restates
  the code; add one only where it records *why* the guard exists (the
  42-cell grid contains up to 12 neighbour days).
- **Verification:** the full six-leg gauntlet; and a real render at
  375×812 on a **production build** with the browser clock frozen to
  **2026-10-01** — a date Strange measured as producing the bug — showing
  **exactly one** today-circle in Year, plus the **positive control** at the
  real clock also showing exactly one. A count that reads 1 in both states
  without a control proving the harness can see 2 is **not** a measurement.
- **Evidence required:** the two diffs; the frozen-clock Year circle count
  **with** its control; the same check for Month (September's grid on
  2026-10-01 must circle nothing); confirmation that today is still circled
  correctly on an ordinary in-month day in **both** views; gauntlet output.
- **Done criteria:** exactly one today-circle in Year on 2026-10-01 and on an
  ordinary day; no today-circle on an adjacent-month cell in Month; today
  still circles correctly where it should; gauntlet green; boundary exactly
  the two allowed files.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | **BLOCKED** | 1 | 7 notes, 2 amendments drafted. Re-ran all six gauntlet legs first |
| 1 | Vision | **BLOCKED** | 1 | "9 notes" — but only **4 were ever written down**; see N-V4. Re-ran all six legs. **Reproduced the CV4 finding that C1 said could not be reproduced locally** |
| — | C5 | DONE — merged | — | Both blockers closed, four notes cleared, tests 333 → 335 |
| 1 | Strange | **NOT RUN — paused for usage** | — | Bryce is low on usage; the design gate is the most expensive remaining step |
| 2 | Vision | **PASS** | 0 | 7 notes. Both blockers closed by its own measurement, with stated positive controls. **Corrected its own first ink measurement** |
| 2 | Captain | **PASS** | 0 | 12 notes, 3 amendments. **Swept for a fourth per-view difference it was never asked about** |
| 1 | Strange | **BLOCKED** | 1 | 8 notes, 2 amendments. Found a real bug both other gates missed |
| — | C6 | DONE — merged | — | The today-marker guard, in both `YearView` and `MonthGrid` |
| 2 | Strange | **PASS** | 0 | 3 notes. Positive control reproduced the bug pre-fix. **Ruled Fury's scope widening correct, against its own pass-1 advice** |

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

### Vision pass 2 — PASS, and the method is the finding

**Verdict: PASS.** Zero blockers. Gauntlet re-run on all six legs
(335 / 328+7-skipped / 335, build clean); boundary **exactly** the eight
declared files plus the mission file — no `actions/**`, no `prisma/**`, none
of the nine forbidden files.

**B2 (Month skeleton) closed independently, and the instrument is worth more
than the number.** Vision's harness was **wrong three times and a control
caught it each time**: truncate + `Fetch.fulfillRequest` (control failed, 0
pulse blocks); JS disabled (shows only the *outer* app fallback — the
calendar skeleton sits behind a nested boundary that needs JS); neutralising
the `$RC` reveal (hydration reveals it from the embedded flight payload
anyway). What finally worked: stream the server's own bytes through
`$RC("B:0","S:0")` and hold the socket, so all 13 `__next_f.push` chunks fall
after the cut and hydration cannot complete. **Positive control: 60 visible
pulse blocks on the skeleton, 0 on the real page.** Result: Month weekday-row
top **379 skeleton / 379 real, 0.00px**, at both 375 and 320. **No leak into
Year** (C4's 0px preserved) or the timeline views — the strip is structurally
confined to the `"monthGrid" in shape` branch.

**B1 (reachability) closed for all six views, proven two ways.** The real
`VIEW_CONFIG` was run against the exact pre-C5 expressions: identical for all
six, **with a negative control proving the probe can detect divergence**. The
non-comment diff in `CalendarViews.tsx` is **exactly three lines** — two
conditions and one prop deletion — so branch bodies genuinely stayed put. And
the two `ownsTodayScroll` branches were proven *distinct* rather than merely
equal: Month's Today pushes a URL, Schedule's Today scrolls with **no push**.

**Vision corrected its own work, unprompted.** Its first ink-overflow pass
reported real escapes on Month pills of up to 45.8px. That was the
instrument, not the app — `Range.getClientRects` reports **layout**, so an
overflowing inline inside a `truncate` ancestor looks like an escape.
Re-measured against the actual clipping ancestor: `realEscapes: []` at both
widths; every overflow is clipped by `overflow: hidden`, which is the
ellipsis doing its job. **C2's claim holds.** A gate that publishes its own
false positive and the correction is worth more than one that only publishes
clean numbers.

**Notes (7), recorded in full:**

- **N-V1 — `MonthGridSkeletonRows.tsx` is 192px taller than the real grid on
  real data** (`main` 957 vs 765). Skeleton rows are all 78.5px; real rows are
  78.5 when populated then **44 for each of five empty rows**. **Pre-existing,
  not introduced here** — the file is untouched since CV3/C5, and C2's only
  structural change cannot shorten a cell with no pills. It sits *below* the
  weekday row, so it moves no landmark C5 fixed. **C5 made the right trade:**
  it bought exact alignment of everything above the grid. Worth knowing that
  the file's "MEASURED 78.5px" comment is true only for a *populated* row.
- **N-V2 — a stale comment in the code C5 just wrote.**
  `loading.tsx` ~:183's `MonthChipsSkeleton` comment says "same `min-h-11`
  chip height"; the code uses `h-11`. Measured equal today (44/44 at both
  widths, both `2.75rem`) and chips are `w-max` single-line so no wrap
  divergence — comment accuracy only, but this project tracks stale comments
  as a named defect class. Routed to Captain.
- **N-V3 — three files over the soft cap**, none near the 650 hard cap:
  `calendarViewConfig.ts` **392/110** (C5 pushed it over), `CalendarViews.tsx`
  **484/223**, `TimelineGrid.tsx` **555/201**. Explicitly Captain's call under
  STRUCTURE.md's own clause that code well under the cap is not a split
  candidate.
- **N-V4 — ⚠️ FIVE OF VISION'S OWN PASS-1 NOTES WERE NEVER WRITTEN DOWN.**
  The gate ledger's pass-1 row claims **9 notes**; only four exist in this
  file (B2 + N1/N2/N3). Vision cannot restate the other five — **they are
  lost to the record.** This is the project's "claimed but not durable" class
  applied to a gate report, and the loss is **Fury's**: I wrote the ledger row
  from the report and recorded only the notes C5 was going to action. A
  count in a ledger is not a record of the things counted.
- **N-V5 — two commits landed mid-gate** (`b31b715`, `8599bde`). **Provably
  inert for Vision's domain**: `git diff --stat` over `src/`, `prisma/`,
  `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`,
  `eslint.config.mjs`, `.github/` and `vercel.json` is **empty** — the delta
  is `.md`-only. Its verdict therefore covers `8599bde`. Recorded because
  "a contract landing after a PASS leaves that PASS covering the old tree" is
  this arc's named hazard, and Fury created the situation again even while
  writing about it.
- **N-V6 — third transcript exposure of real family data on this arc.** A
  real event title and **a child's first name** reached Vision's own
  transcript while it read pill text off the live dev branch for the ink
  measurement. Nothing durable was written, it did not repeat them in its
  report, and it switched to counting rather than quoting. Strengthens the
  standing case for the parked dev-branch rotation and for treating dev data
  as private.
- **N-V7 — Week's timeline skeleton is 2px shorter than its real render**
  (793 vs 795), from `calc(100dvh - 369px)` against a runtime measurement.
  Pre-existing, untouched by C5. Logged so it is not rediscovered as new.

### Captain pass 2 — PASS, and it swept past the fix it asked for

**Verdict: PASS**, pinned to `7dbf18b`. Zero blockers, 12 notes, 3 amendments.
All six gauntlet legs re-run with real exit codes. C5's boundary audited:
exactly the eight declared files, none of the nine forbidden. It also
**independently re-verified Fury's own STRUCTURE.md correction against the
pre-C4 blobs** rather than trusting it — accurate, exactly one file — citing
the law that a correction is not more trustworthy for being a correction.

**The blocker is closed, and Captain did not stop there.** It swept for a
*fourth* per-member difference nobody had named, by **four independent
mechanisms**: literal `view ===`/`!==` tests, `switch (view)`, arrays and
`includes` of view tags, and every `Record<CalendarPeriodView, …>`
declaration. Result: **zero live inline per-view tests anywhere in `src/`**.
Every per-view dispatch surface is now a total record (`VIEW_LABELS`,
`BUILT_VIEWS`, `VIEW_CURSOR`, `VIEW_CONFIG`, `SKELETON_SHAPE`), the one
surviving `switch` dispatches on `config.renderer` and ends in a
`never`-typed exhaustiveness check, and **`showLocation`/`compact` — which
STRUCTURE.md still names as live instances — are no longer view-keyed at
all**: `compact` derives from `columnDays.length > 1`, which answers
correctly for a future member automatically. Totality is enforced, not
decorative: a sibling test pins `Object.keys(VIEW_CONFIG)` to `ALL_VIEWS`, so
a seventh view **fails the suite** rather than silently inheriting a falsy
default.

**Sizes — Captain's ruling on Vision's N-V3.** Re-measured; the canonical
counter and `wc -l` agree exactly on all three.

- **N-C1** `calendarViewConfig.ts` **392/110** — over soft, **explicitly not a
  split candidate**. 110 code is 31% of the soft cap, and C5's 58 added lines
  are ~14 code against ~44 of doc comment. *"Precisely the file the caps
  amendment was written to protect"* — splitting a per-row record because its
  rows explain themselves would invert the rule. No action.
- **N-C2** `CalendarViews.tsx` **484/223** — over soft, 166 under hard. The
  only file in this arc with a **rising multi-mission trend**
  (459 → 492 → 478 → 484), and **CV6 and CD1 both land here**. Standing seam:
  the sheets block (`:420–481`, ~62 lines, four sheet mounts, no shared state
  beyond four setters) → a clean `CalendarSheets.tsx`. Flagged, not required.
- **N-C3** `TimelineGrid.tsx` **555/201** — **mission-17's trip condition on
  this file is SATISFIED and is hereby RECORDED CLOSED.** It said "the next
  contract touching it extracts first"; C1 *was* that contract and extracted
  649 → 555; C5's later touch added zero lines. Recorded explicitly so the
  condition is not cited against a future contract forever.
- **N-C4** `MonthCell.tsx` **350/105** — exactly on the soft cap; not a split
  candidate, same clause.

**One source of truth — the finding with live consequences:**

- **N-C5 — month-name formatting now has FIVE definitions, and this mission
  added two of them.** `mealPlanDates.ts:55` (`MONTH_NAMES`, short, hardcoded,
  **unexported**), `:116` (`FULL_MONTH_NAMES`, long, hardcoded, **unexported**),
  `calendarViewConfig.ts:206` (`Intl`, mission-17), `MonthChips.tsx:35`
  (`Intl`, short — C3), `YearView.tsx:54` (`Intl`, long — C4). The failure
  scenario is that they split across **two mechanisms**: three derive names
  from `Intl` at runtime and two are hardcoded English arrays, so a locale or
  ICU-data change moves three and leaves two, and **two screens spell the same
  month differently**. **The root cause is written in the code itself** —
  `calendarViewConfig.ts:202` says it wrote its own copy because
  `mealPlanDates.ts`'s array is off its contract boundary *and* unexported.
  **That is a boundary satisfied by copying**, the exact shape STRUCTURE.md's
  trip-condition clause names, and it has now produced three copies in two
  missions. Amendment 3 below.
- **N-C6 — `MONTH_NAME_FORMATTER` is defined in both `MonthChips.tsx:35` and
  `YearView.tsx:54`, same identifier, different behaviour** (`short` vs
  `long`). Both document why, so the divergence is deliberate — but a `grep`
  for that identifier returns two things that are not the same thing. If
  amendment 3 is not taken, the cheap fix is renaming to
  `SHORT_`/`LONG_MONTH_FORMATTER` at the next touch.
- **N-C7 — grandfathered debt did NOT grow this mission**, re-counted rather
  than assumed: `toDateInputValue` **3**, `withTimeZone` **4**,
  `MAX_FETCH_SPAN_DAYS` **2**, `validatedPeople` **2**, `VISIBLE_LANES` **2**.
  `ASSIGNABLE_ROLES` is still the weaker `.filter()` predicate
  (`constants.ts:270`) and correctly remains open — `constants.ts` was in no
  contract's boundary.

**Stale comments:**

- **N-C8 — `loading.tsx:184`** (Vision's N-V2, confirmed independently). The
  comment says "same `min-h-11` chip height"; the code is `h-11` (`:220`) and
  the real chip is `min-h-11` (`MonthChips.tsx:100`). **Not cosmetic:**
  `min-h-11` is a **floor**, `h-11` is a **pin**. Any change that makes a real
  chip taller — a line-height or font-size change, a January label wrapping at
  a narrow width — grows the render and not the skeleton, **silently
  reintroducing a smaller version of the exact 76px landmark shift C5 just
  spent a contract removing**. The comment asserting they are "the same" is
  what would stop the next reader noticing.
- **N-C9 — `MonthGridSkeletonRows.tsx:12`** says *"CV4 replaces this skeleton
  entirely later, so re-measuring now would be wasted work."* **CV4 has
  shipped and did not replace it.** C5 built a sibling strip above it and now
  *depends* on it for the measured alignment — so the file is load-bearing
  while claiming it is about to be deleted, **and that claim is the stated
  reason its own heights were never re-measured** — the same file as Vision's
  N-V1 192px finding. Route both together.
- **N-C10 — `TimelineGrid.tsx:25`** still says mission-17/C1 *"is relocating"*
  `APP_HEADER_HEIGHT_PX` *"at the same time … in a separate worktree."* That
  relocation completed. The justification remains sound but is written in
  present tense about a worktree that no longer exists. **This file was in two
  of this mission's may-touch lists (C1, C5) and was not taken.**

**Constitution accuracy — Captain's own file:**

- **N-C11 — STRUCTURE.md:315–322's live-instance parenthetical is now entirely
  historical.** Every instance it names is closed, and its trailing sentence
  ("CV4 flips `threeDay`, which makes this clause bind there as a BLOCKER")
  describes a mission that shipped two sessions ago. Amendment 1.
- **N-C12 — STRUCTURE.md:436–443 ends "no live instance remains." That is
  false.** `HubNav.tsx` exports only `HubBottomNav`. Amendment 2.

**Process, and it lands on Fury:** three commits landed mid-gate
(`b31b715`, `8599bde` before dispatch; `7dbf18b` **during** it). All provably
`.md`-only, so the verdict covers `7dbf18b` — but this is the **fourth
mission running**. And **Captain's own pass-1 row says "7 notes, 2 amendments"
while this file enumerates none of the seven** — the identical loss as Vision's
N-V4. **Both gates on this mission now have a count in the ledger with no
record of what was counted.** Four of Captain's seven were recoverable only by
re-derivation, and are the notes above.

### Strange pass 1 — BLOCKED, and it found what two other gates walked past

**Verdict: BLOCKED**, 1 blocker, 8 notes, 2 amendments. Gauntlet re-run on all
six legs. Real headless Chromium over CDP against a production build; session
minted **read-only** from an existing admin row; baseline `Task 0, TaskPerson
0, CalendarEvent 4, User 5` confirmed before and after, with one scoped
`db:seed-tasks` → measure → `db:clean-tasks` cycle. **Pill and chip text
reported as character counts, never quoted** — the danger-register discipline
three earlier agents on this arc failed.

**THE BLOCKER — `YearView` circles "today" in two different month tiles at
once, on 34.5% of days.** `YearView.tsx:80` is
`const isToday = isSameDay(day, today);` with **no in-month guard**, while
`monthGridDays` returns adjacent-month padding. Semantically the September
tile asserts *today falls in September* — and on 1 October that is simply
false, in a view whose own doc comment says it exists to answer "which week
does this fall in."

**Measured with a stated positive control:** clock frozen to `2026-10-01`,
`?view=year` → **2** accent circles (`Open September 2026` and
`Open October 2026`, both reading "1"). Control at the real clock
`2026-09-06` → **1** circle. The harness detects both states, so the count is
real. Frequency computed from `monthGridDays`' own 42-cell construction:
**126 of 365 days (34.5%)** in both 2026 and 2027 appear in more than one
month's grid.

**Notes:**

- **N-S1 — a multi-day bar's title is confined to one cell while the bar spans
  three.** At 375 a spanning event renders as three 47.9px segments; only the
  first carries a label (8 of 17 characters), the other two measure
  `titleLen: 0` — so ~**95.8px of continuous bar is blank** while the title is
  ellipsised at 8 characters. **This only became visible because C2 removed
  the `md:` gate**, and it is the cheapest available improvement to C2's own
  goal. Fix: let the first segment's label overflow into its continuations, or
  render the label once at bar level.
- **N-S2 — capacity at 320px, and the risk C2's own comment names.** Events
  6–7 characters, **tasks 4** (the glyph consumes 7.5–8.1px of a 40px box).
  `MonthCell.tsx`'s comment quotes Strange's *earlier* finding that a
  near-identical truncation is *"worse than no label at all"* — and 320px is
  where that condition now exists. **Strange did not block**: the ellipsis is
  honest, `+N more` and the day tap still carry full identification, and at
  375 (6–8 chars) C2 is a clear net gain over a 1.00:1 fill with no text.
  Flagged so the trade is on the record rather than discovered later.
- **N-S3 — the written rule C2 could have broken HOLDS.** Every task pill
  carries its glyph fully inside the box at both widths, and the completed one
  measures `text-decoration-line: line-through`. `line-through` appears on
  **completion only** — no past event is struck. (DESIGN.md's "line-through
  means done, never past".)
- **N-S4 — `MonthChips`: the chips left of the first January carry no year
  anchor.** Demonstrated, not argued: scrolled fully left from a September
  anchor the strip reads `Sep · Oct · Nov · Dec · Jan 2026`, and tapping the
  chip labelled **"Sep"** — byte-identical to the selected chip's label —
  navigates to **September 2025**. From September that leading run is 4 chips;
  from a February anchor it would be 11. Fix: also print the year at
  `index === 0`.
- **N-S5 — `YearView`'s 7px day numbers carry in-month vs adjacent-month by
  colour alone**, same size, same weight, at **1.47:1 between the two text
  colours** in light. `MonthCell.tsx:131` makes the identical distinction at
  **11px and `font-semibold`**. Dark is materially better, so light is the
  weak case; February's tile carries 14 padding cells and reads as a 42-day
  month at a glance. Not a rule violation — the token use is correct — but the
  app's weakest application of that distinction. Cheap fix: `font-medium` on
  in-month days, or 8px.
- **N-S6 — `MonthGrid.tsx:211` has the SAME missing in-month guard as the
  blocker.** Milder (one grid on screen, the header names the month) and
  **pre-existing since K2**, so not part of the blocker. *(Fury verified this
  independently and found `MonthCell.tsx:129` lets `isToday` win over
  `isCurrentMonth`, so there is no downstream guard — it is a real defect, and
  C6 takes it.)*
- **N-S7 — Strange could NOT reproduce Vision's 379/379, and said so rather
  than reporting numbers as if they bore on C5.** Its valid instrument
  (8 visible pulse blocks / 0 `grid-cols-7` against the real page's 0 / 7)
  captured the **outer** `(app)/loading.tsx` `SkeletonPage`, not
  `calendar/loading.tsx`. **So on a cold document load the first painted frame
  is the generic app skeleton, and the file C5 fixed is reached on client
  navigation.** Pre-existing and outside CV5's boundary. Two later attempts to
  force the inner fallback failed their own controls and were **discarded
  rather than reported**. No evidence contradicts Vision's measurement.
- **N-S8 — ruling on N-V1 (skeleton 192px taller than the real grid): ACCEPTED
  TRADE, not a violation; recorded as settled.** DESIGN.md asks for skeletons
  "shaped like the real content" and the shape is right — six week rows of a
  seven-column grid. The residual comes entirely from real *empty* rows
  collapsing to 44px, **which the skeleton cannot know before the data
  arrives** — and guessing a mix of tall and short rows would assert a fact
  about unfetched data, the exact error `DaySection` already refuses in its
  own comment. **N-V7** (Week timeline 2px) is below any perceptual threshold;
  settled.

**What Strange proved holds:** all six views reachable, every picker row 48px
with `elementFromPoint` returning the row itself; all 25 chips **exactly
44.0px** at both widths; Year tiles 165.5×144 / 138×144; **unoccluded swept
rather than sampled** — Year checked every 40px of scroll (14 positions at
375, 20 at 320), and the sweep is **non-vacuous** because it *did* flag July
and August as nav-occluded at the bottom position, which scrolling clears; no
horizontal leak (`body.scrollWidth === innerWidth`, both widths, both themes);
contrast re-measured not taken — selected chip 5.08 light / 7.93 dark, today's
circle 5.08 / 7.93 (**confirming C4's claim**), accent fill vs page 5.08 /
9.34, **so the selected state is not carried by a sub-3:1 fill, the failure
this project has already paid for twice**; zero ink escapes with a positive
control that distinguishes; and `MonthChips` **reuses `PantryList`/
`GroceryList`/`TagFilterChips`' exact chip markup including `aria-pressed`**
rather than reinventing a vocabulary.

### Strange pass 2 — PASS, and it overturned its own pass-1 advice

**Verdict: PASS**, measured on `5004b48`. Zero blockers, 3 notes. All six
gauntlet legs re-run. Production builds at 375×812, **theme forced explicitly
in both directions and re-verified from inside the page** via
`matchMedia(...).matches` on every reading; clock frozen by overriding the
`Date` constructor — *which is what `useToday`'s `getTodayTimestamp` actually
reads* — and re-render forced through the app's own year controls. **No
fixtures created at any point**; every measurement was read-only against real
household data, nothing quoted, baseline unchanged.

**The blocker is closed with a real positive control** — the pre-fix commit
`b9b809b` was built in an isolated worktree and served separately, so the
control is a genuinely different build rather than a simulated one:

| | pre-fix `b9b809b` | post-fix `5004b48` |
|---|---|---|
| Year, frozen 2026-10-01 | **2 circles** — "1" in *September* **and** "1" in *October* | **1** — October only |
| Year, real clock | 1 — "6" in September | 1 — unchanged |
| Month anchored Sept, frozen 2026-10-01 | **1** — Oct-1 cell `accent:true, muted:false`, 11 muted cells | **0** — that cell `muted:true`, **12** muted |
| Month anchored Oct, frozen 2026-10-01 | — | 1 — the marker still works |

The harness demonstrably produces **2** and captured it visually, so the
post-fix **1** is a measurement rather than an instrument ceiling. The freeze
is non-vacuous: the circled day moves 6 → 1 and its tile September → October.

**Nothing was removed that shouldn't be**, proven structurally rather than by
eyeballing: across all 42 cells per tile, September post-fix has **exactly two**
distinct computed `color|background` pairs — muted and in-month, **no accent
present at all** — with its whole trailing run uniformly muted; October has
three, the third being the circle. Identical in dark. Geometry unchanged;
circle contrast 5.08 light / 7.87 dark.

**⚠️ N-S9 — Strange ruled that Fury's scope widening was right and its own
pass-1 advice was wrong, and gave the measurement that settles it.** It had
called `MonthGrid` "milder" because one grid is on screen with the month named
in the header. The measurement it had not taken: pre-fix, September's Oct-1
cell rendered **`accent: true, muted: false`** — styled as an in-month today,
**visually indistinguishable from a real one**, in the app's most-used
calendar view. *"That is the same semantic falsehood as the Year blocker, not
a lesser cousin. My 'fix Year alone' advice would have shipped the rule with a
live counterexample."* **This is the second time on this arc a gate's finding
stood while its prescription was wrong** — and the first time the gate itself
supplied the correction.

**And it verified the widening was COMPLETE rather than assuming it** —
independently reproducing Fury's own preflight settlement: `monthGridDays` has
**exactly two callers**, both now guarded; every other
`isToday = isSameDay(day, today)` site (`TimelineGrid.tsx:388`/`:541`,
`DaySection.tsx:171`, `WeekCard.tsx:50`) derives its days from the viewed
period and has no padding concept. **No false instance of the new rule
remains** — which is what lets the amendment be written flatly.

**Notes:**

- **N-S10 — the guard lives at both call sites, not in the consumer.**
  `MonthCell` still accepts `isToday` and `isCurrentMonth` as independent
  props while they now carry an **unexpressed invariant** (`isToday` implies
  same-month). Correct as shipped and the cheaper fix — but **a third
  `MonthCell` caller would reintroduce the bug with no compile error.** Routed
  to the follow-up; Captain's call whether it rises above taste.
- **N-S11 — five instrument failures hit and corrected**, recorded because a
  clean reading from a broken instrument is this arc's recurring defect:
  (1) headless Chrome driven from the Bash tool cannot reach the network —
  `Page.navigate` hung and poisoned the CDP session; (2) **the first pre-fix
  build FAILED while its wrapper still exited 0** (Turbopack rejects a
  symlinked `node_modules`) — caught by checking for `BUILD_ID`, **not the
  exit code**; (3) the pre-fix page looked un-hydrated, so it loaded the
  *known-good* build in the same tab and saw the identical symptom, matching
  the hidden-pane finding already on record; (4) it **nearly labelled a
  pre-fix screenshot as post-fix**, so every measurement now records
  `location.origin`; (5) `.rounded-full.bg-accent` matches `MonthChips`' active
  chip — measured `nonSpanAccent: 1` live, **independently confirming the
  builder's reported trap is real**. All counts are `span`-scoped.
- **Amendments stand as drafted, with one clarification:** because C6 fixed
  **both** instances, the today-marker rule can be written **flatly** — *a
  today-marker may only be drawn on a cell belonging to the period being
  displayed* — with **no carve-out for a known-live exception**. The now-line
  `--danger` amendment is untouched by C6.

**Carried forward from pass 1, with the reason stated:** the delta is two
conjuncts in two boolean expressions (+10/−2 including comments), no new
imports, no styling or layout change, so it cannot reach N-S1, N-S2, N-S3,
N-S4, N-S7, or the settled N-S8/N-V1 and N-V7. **N-S5 was re-measured
incidentally** and is unchanged at 1.47:1. **N-S6 is now CLOSED.**

## Handoff log
- 2026-09-06 — **MISSION COMPLETE. All three gates PASS.** Vision PASS
  (0 blockers, 7 notes), Captain PASS (0 blockers, 12 notes, 3 amendments),
  Strange PASS on pass 2 after blocking on pass 1 (0 blockers, 11 notes total,
  2 amendments). **C6** closed Strange's blocker. Six-leg gauntlet green;
  recordcheck run. **Nothing pushed — the branch is local**, and merging is
  what deploys to the family's live app, so it is Bryce's decision.
  **Gate coverage, stated precisely rather than glossed:** Strange's PASS
  covers the final tree `5004b48`. **Captain's PASS covers `7dbf18b`, and the
  C6 delta provably does not reach its domain** — zero import lines added or
  removed, zero exports changed, no new files, and both touched files far
  under the soft cap (`YearView` 106, `MonthGrid` 235 against 350). **Vision's
  PASS covers `8599bde`, before C6** — that is the one gap, and it is
  recorded rather than glossed. What stands in for it: C6 alters exactly one
  boolean per cell, whose only two failure directions (today circles where it
  should not / today stops circling) were both measured by Strange **against
  a genuinely separate pre-fix build**, plus a boundary audit by Fury and a
  green six-leg gauntlet. **A re-run of Vision is the rigorous option and is
  Bryce's call on usage.**
  **Fury's ledger for this session:** the mid-gate-commit habit that Captain
  flagged as four-missions-running was **broken** — Captain's verdict was
  staged in the scratchpad *outside the repo* while Strange ran, and C6 was
  committed before its gate was dispatched. Preflight's judgement items were
  **settled rather than skipped**, which is the failure this mission had
  already recorded twice; asking "what do these references *do*" found that
  `monthGridDays` has exactly two callers, which Strange later reproduced
  independently. And running recordcheck at the **start** of the resume rather
  than at delivery caught a false count in a STRUCTURE.md amendment.


- 2026-09-06 — **RESUMED at the gate phase.** Fury re-ran the full six-leg
  gauntlet on the post-C5 tree before spending anything on a gate: tsc 0,
  eslint 0, **335 Denver / 328+7-skipped UTC / 335 LA**, build clean.
  **Vision pass 2 DISPATCHED** on this tree. Captain pass 2 and Strange pass 1
  follow **serially** — not parallel: all three run `npm run build` into the
  same `.next`, and mission-16 already paid for parallel gates contaminating
  each other's evidence. Serial costs the same tokens as parallel (the
  constraint is usage, not wall-clock) and is interruptible.
  **A false claim found in a constitution, and fixed.** `recordcheck.mjs` was
  run at the *start* of the resume rather than at delivery — deliberately,
  because this mission's own record says preflight quoted a false claim back
  to me twice and I read only the dependency findings. 0 hard failures, 6
  REVIEW items. Settling them by command found that STRUCTURE.md's new
  reachability amendment claimed **"three of which had written their own
  obsolescence in-file"**. Checked against the **pre-C4 blobs**: exactly
  **one** did. The other three read that way only because C4 added the
  framing while updating them. Corrected; committed doc-only, **0 files under
  `src/`**, so no gate's domain moves and no verdict is invalidated by it.
  The other five REVIEW items were judged benign with reasons: `vision.md`'s
  only change is `model: fable → opus`, which cannot stale a past report's
  "item 1"; mission-8's `CalendarHeader.tsx (100)` is frozen history, correct
  as of mission-8. Load-bearing claims re-settled by command, not re-reading:
  old `sr-only` string **0**, `md:not-sr-only` **0**, all six `BUILT_VIEWS`
  entries genuinely `true` (read from the record, not its comment, which
  *asserts* uniformity), inline `view === "schedule"` in the shell **0**,
  `MonthChips` suppression **0**, and `VIEW_CONFIG` carrying both new fields
  on all six rows.

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

- **Shipped:** CV4's open `sr-only` finding closed and `TimelineGrid`
  extracted (C1); Month pills show their titles at phone width (C2);
  `MonthChips`, the month-name scroller (C3); `YearView`, and
  **all six calendar views reachable for the first time** (C4); both gates'
  blockers plus four notes (C5); the today-marker guard in `YearView` **and**
  `MonthGrid` (C6). Tests **333 → 335**.
- **Shipped check:** `git log origin/main..HEAD` — **NOT pushed.** The branch
  is local only. Merging deploys to the family's live app, so it is Bryce's
  decision, not the mission's. **"Works locally" and "the family has it" are
  different claims**, and this project has been bitten by that gap five times.
- **Deliberate leftovers** (none blocking; all recorded above with detail):
  - **N-S1** a multi-day bar's title is confined to one cell while the bar
    spans three (~95.8px of blank bar) — the cheapest remaining improvement to
    C2's own goal, and only visible *because* C2 shipped.
  - **N-S4** `MonthChips` chips left of the first January carry no year, so a
    chip reading "Sep" can navigate to the *previous* September.
  - **N-S5** `YearView`'s 7px day numbers carry in-month vs adjacent-month by
    colour alone at **1.47:1**, where `MonthCell` uses 11px + `font-semibold`.
  - **N-S10** the today invariant lives at both call sites, not in
    `MonthCell` — a third caller would reintroduce the bug with no compile
    error.
  - **N-C5/N-C6** five month-name definitions across two mechanisms, and one
    identifier meaning two different things — amendment 3.
  - **N-C8/N-C9/N-C10** three stale comments, one of which
    (`MonthGridSkeletonRows.tsx:12`) is the stated reason its own heights were
    never re-measured.
  - **N-C2** `CalendarViews.tsx` is the only file in the arc with a rising
    multi-mission trend, and **CV6 and CD1 both land there**; the sheets block
    is the standing seam.
  - **N-S7** on a cold document load the first painted frame is the *generic
    app* skeleton, not the calendar one — pre-existing, outside CV5.
  - **Both gates' pass-1 note counts have no records behind them** (Vision's
    N-V4, Captain's own) — five of Vision's nine and all seven of Captain's
    were never written down. **That loss is Fury's**, and the standing lesson
    is that a count in a ledger is not a record of the things counted.

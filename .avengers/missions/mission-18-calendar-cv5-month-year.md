# Mission: CV5 — Month text pills, MonthChips, Year

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
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
- **Status:** PENDING (sequential — after C3)
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

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Handoff log

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

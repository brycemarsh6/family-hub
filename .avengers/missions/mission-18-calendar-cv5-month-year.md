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
- **Status:** PENDING
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
- **Status:** PENDING (sequential — shares `CalendarViews.tsx` with C4)
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

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Handoff log

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

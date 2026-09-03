# Mission: Calendar K2 — Month view + navigation

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (boundaries and line budgets re-checked against the real post-C4 tree, 2026-09-02; ready to dispatch C1 the moment K1 delivers)
**Started:** 2026-09-02 · **Updated:** 2026-09-02

## Brief

- **Goal:** Add the Month view to `/calendar` — the third view in the
  existing `RadioSheet` switcher — as a Sunday-first six-week grid that
  reads events as colored pills, draws multi-day events as spanning bars,
  and hands off to Day view on a day tap. Phase K2 of
  `.avengers/plans/calendar-v1.md`; the design is the walkthrough log's
  screenshot-1 entry (adopt/adapt/skip calls already made with Bryce).
- **Done means:** signed in, the switcher offers Day / Week / Month; Month
  shows the current month as a six-row grid (adjacent-month days in
  `--muted`, today's number in the accent circle) with up to three pills
  per cell and a "+N more" overflow; a three-day all-day event renders as
  one continuous bar across its cells and across a week break; a
  multi-person pill shows up to three color bands; ended events dim per
  Strange's K1 instruction; tapping a day number opens that day in Day
  view; prev/next page by month with the same window-edge honesty as
  Week (`isOutsideWindow` per cell, `canStepToPeriod` for the arrows,
  direction-of-travel rule from C7); the whole grid clears the bottom nav
  at 375px with no horizontal scroll; gauntlet green under both timezones;
  the Nov 1 2026 DST month renders 30 consecutive dates.
- **Out of scope (do not build):** filters/tags/meals (K3), recurrence
  expansion (K4 — `rrule` rows render once, on their `startAt`), AI import,
  Google sync, search, Skylight's swipe-to-page (arrows only, per the plan),
  any change to the event model.

## Danger register

Standing (STRUCTURE.md + AGENTS.md), absolute for every agent:
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- **No committed, rerunnable script may create, update, or delete `User`
  rows** (amended 2026-09-02). Seeders attach to existing people;
  verification people are created and deleted one-off by id.
- Migrations are **additive only** — and **K2 needs none**. A contract
  that finds itself wanting a schema change is BLOCKED-ON-CONTRACT.
- Never push without the user (autonomy granted 2026-09-02 covers building
  and pushing the working branch; **not** opening a PR).

⚠️ **THIS SESSION IS NOT K1'S CONTAINER. Do not trust any older copy of this
paragraph.** (It said "a local throwaway Postgres, port 5433, no family
data." That was K1. Fury corrected it once, the correction was lost to a
later write, and **Vision caught the stale text at C5 pass 2** — hence this
louder rewrite. If you are reading a version that mentions port 5433 or
`marshee_k1`, it is wrong.)

`DATABASE_URL` points at the **Neon `dev` branch** — a copy-on-write clone of
production holding a **real snapshot of the family's data, password hashes
included** (host `ep-hidden-pine-…-pooler.us-west-2.aws.neon.tech`; `user` = 5
is the actual household). Writes cannot reach production; **isolation is not
privacy.**

- Do not print, log, or paste personal rows, and **never print `.env`** — an
  agent leaked a dev-branch password fragment into its own transcript doing
  exactly that.
- Test data **only** via `db:seed-calendar` / `db:clean-calendar`, which
  refuse to delete what they didn't create. `db:seed` / `db:reset` would
  destroy the realistic dev copy; the sanctioned refresh is a Neon console
  branch reset, a human step.
- **Never create, update, or delete `User` rows** — the table holds the
  family's real credentials. Minting a session cookie for an *existing* user
  is permitted (the Phase-1e pattern); writing to the table is not.
- Restore counts to **`calendarEvent` 3, `user` 5** and confirm by direct
  read before reporting.

Scratch under `prisma/tmp-*/` is git-ignored and tsconfig-excluded. **Gates
that create calendar test data run serially** (Vision, then Strange) — their
cleanups collide otherwise; Captain may run alongside either.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pinned to `TZ=America/Denver`; baseline after K1 = 135 + C4's additions)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts` (same count)
- `npm run build`

## Assembled

- Stark + Vision (always).
- **Strange** — a whole new view a human sees; the lane-assignment renderer
  is the riskiest visual in the calendar.
- **Captain** — new files (`MonthGrid.tsx`, `monthLayout.ts` + test), and
  `CalendarViews.tsx` grows a third branch right after K1 fought to keep it
  under the cap.
- Banner — not needed; K1 left `file:line` citations for every seam.

## Contracts (DRAFT — re-check boundaries against the post-C4 tree before dispatch)

### C1 — Pure month layout + the shared-vocabulary exports Captain asked for
- **Status:** BUILT, awaiting gates (Stark reported DONE 2026-09-02; Fury re-ran the full gauntlet independently: tsc 0, eslint 0, **146/146 under both TZs** (135 baseline, +11), build exit 0; boundary audit clean — only the 4 permitted files changed, `calendarDates.test.ts` byte-identical, `calendarDates.ts` diff is exactly the one `export` keyword plus its comment)
- **Objective:** given a month, a Sunday-first six-week grid of 42 days,
  and given the events, a per-row **lane assignment** so spanning bars and
  pills never collide — pure functions, no React, no DB, no `new Date()`.
- **Boundaries:** may touch `src/lib/monthLayout.ts` (new),
  `src/lib/monthLayout.test.ts` (new), and — for Captain's collapse-the-
  duplicates note only — `src/lib/mealPlanDates.ts` (85 lines; **add one
  export**, `toLocalDateString`) and `src/lib/calendarDates.ts` (250;
  **export the existing private `calendarDayDiff`**, no behavior change)
  plus `src/lib/calendarDates.test.ts` (349 — **at the cap: add no tests
  here**, only adjust if the export rename requires it). Must not touch
  any component, page, action, or `prisma/**`. `monthLayout.ts` imports
  only from `mealPlanDates.ts` and `calendarDates.ts`.
- **Shape:** `monthGridDays(anchor): Date[42]` (always six rows, so the
  grid height never jumps between months); `assignLanes(rowDays,
  events): { spans: {event, startCol, endCol, lane}[], overflowByDay:
  number[] }` — multi-day events first, longest first, then single-day
  by start time; a per-cell cap of three visible entries with the rest
  counted into `overflowByDay`; spans that cross a week break are split
  into one span per row (the caller draws a continuation, not the lib).
  Uses `daysEventCovers` from C2 so the exclusive all-day end is honored
  by construction, and `isOutsideWindow` so out-of-window cells are marked.
- **Verification:** `node:test` cases: a month starting on Sunday (Nov
  2026 — also the DST month), one starting on Saturday, Feb of a non-leap
  year (needs rows 5–6 from the next month), a 3-day all-day bar across a
  week break (row split, lanes continuous), two overlapping bars taking
  lanes 0 and 1, a cell with five single-day events → three shown + 2
  overflow, and a cell outside the fetch window. Both timezones.
- **Done criteria:** tests red-then-green for the lane collision case;
  the 42-day grid for every month of 2026 has no duplicate and no gap;
  `calendarDates.test.ts` line count unchanged or lower; the two new
  exports have tests in **`monthLayout.test.ts`** (per the amended cap
  rule, tests split by module under test).

### C2 — SUPERSEDED, split into C2a + C2b (Fury, 2026-09-02)

The original single C2 bundled a state-model rewrite, a type migration, two
new components, a skeleton, and a full screenshot pass. **K1's own delivery
lesson is that "contracts must be sized so one dispatch survives an
interruption — C4 alone was 529k tokens in a single dispatch,"** and this
session already lost ~6h45m of K1 to rate limits that killed a gate mid-run
twice. The split also gives a natural gate boundary: C2a is headless and
Vision-gateable on tests alone; C2b is the visual work Strange must see.
The original contract text is preserved in git history.

### C2a — The period cursor, the month vocabulary, and the type migration
- **Status:** DONE (2026-09-02), awaiting gates. Fury re-ran the gauntlet
  independently: tsc 0, eslint 0, **164/164 under both timezones** (146
  baseline; +13 `useCalendarPeriod.test.ts`, +6 `mealPlanDates.test.ts`, −1
  moved out of `monthLayout.test.ts`), build 0. `CalendarViews.tsx`
  **307 → 293**, satisfying the "under 307" done criterion. Boundary audit
  clean — `EventForm.tsx`, `EventCard.tsx`, `DaySection.tsx`,
  `calendarDates.test.ts`, actions and `prisma/**` all untouched.
  Red-then-green delivered against the *old* `offsetDays` model, reproducing
  Captain's exact cases (`AssertionError: 28 !== 31`; Feb skipped) before
  passing on the new cursor.
- **Cursor signature for C2b:** `CalendarPeriod = { view, dayOffset,
  monthOffset, monthDay }` with pure `periodAnchor` / `stepPeriod` /
  `withView` / `resetToToday`, wrapped by
  `useCalendarPeriod<V>(initialView, today)`. **`monthOffset` is a separate
  integer counter from `dayOffset`** — that separation is what makes Prev∘Next
  an exact identity by integer cancellation, even when the rendered anchor
  legitimately clamps on a short month. C2b calls
  `useCalendarPeriod<"day" | "week" | "month">("week", today)`.
- **Two deviations, both accepted:**
  1. It edited `monthLayout.test.ts`, which C2a's own "must not touch" list
     named — because the *same* contract's boundary text explicitly
     authorized moving the `toLocalDateString` test out of it. That
     contradiction was **Fury's drafting error**, not a builder judgment
     call; the builder resolved it narrowly (removed exactly the one moved
     test plus its stale comment) and flagged it rather than proceeding
     silently. Correct handling.
  2. `CalendarViews.tsx` landed at **293**, not Captain's projected 250–280,
     because the builder deliberately left the window-edge disabling block
     in place. Its reasoning is sound and Fury accepts it: that logic is a
     function of `windowStart`/`windowEnd` (page-fetch bounds), not cursor
     state, and it carries hardened, already-adversarially-verified
     invariants (C7's direction-of-travel rule, Vision pass-3's skewed-clock
     case). Moving it would risk a real regression to hit a number Captain
     framed as a projection, not a criterion.
- **The one gap the builder could not close, closed by Fury instead.** C2a
  had no browser tool in its dispatch, so it could not exercise Week/Day
  interactively and **said so plainly rather than claiming it** — the right
  call. Fury then drove the running app directly against Bryce's own real
  test events (Temple, Ledger Pre-School, and a 3-day Camping Trip):
  - Week **Next ×2**: Aug 30–Sep 5 → **Sep 13–19** (exactly +14 days).
  - Week **Prev ×2**: exact round trip back to Aug 30–Sep 5, all events intact.
  - **Week → Day** preserved the anchor (Wednesday, Sep 2 = today).
  - **Day Next**: Sep 2 → **Sep 3** (exactly +1), rendering "Day 1 of 3" and
    the location "Uintas".
  - **Day → Week** from Sep 3 landed on **Aug 30–Sep 5**, the week
    containing it — anchor preserved across a view switch *after* paging.
  - The switcher correctly offers **only Week and Day**; Month is C2b's.
- **Objective:** replace the `offsetDays` scalar with a typed period cursor
  that can express month paging correctly, add the two missing month
  vocabulary items, and land Captain's `createdByNames` → `createdByName`
  migration. **No Month rendering — headless plumbing only.**
- **Boundaries:** may touch `src/lib/useCalendarPeriod.ts` (new),
  `src/lib/useCalendarPeriod.test.ts` (new, if the cursor is testable
  headlessly — preferred), `src/lib/mealPlanDates.ts` (99 → **append-only**:
  `isSameMonth`, `formatMonthTitle`), `src/lib/mealPlanDates.test.ts` (new —
  Captain notes this file does not exist yet and is `toLocalDateString`'s
  proper permanent home; moving that test here from `monthLayout.test.ts` is
  in scope and retires the debt marker), `src/components/CalendarViews.tsx`
  (307 — should end **lower**, ~250–280), `src/lib/types.ts` (96),
  `src/components/EventDetailSheet.tsx` (189),
  `src/app/(app)/calendar/page.tsx` (118).
  **Must not touch:** `monthLayout.ts`, `calendarDates.ts`,
  `calendarDates.test.ts`, `EventForm.tsx` (**350 — at the cap, K3's**),
  `EventCard.tsx`, `DaySection.tsx`, any action, `prisma/**`.
- **The cursor must be a typed period, not a day count.** Captain proved
  `offsetDays` cannot express months: stepping by `daysInMonth(anchor)` skips
  February entirely from Jan 31 and loses 3 days per Prev/Next round trip
  (reproductions in Captain's section above). Model `{ view, anchor }` or a
  month-offset distinct from a day-offset. **Required properties, each with
  a test:** Prev∘Next is identity from *every* day of *every* month of 2026
  including Jan 31 and Feb 29-adjacent dates; paging Next 12× from any month
  visits 12 distinct consecutive months with none skipped; switching view
  preserves the anchored day. `today` still arrives from `useToday()` at the
  call site — **the hook constructs no calendar-meaningful date server-side.**
- **Verification:** full gauntlet, both timezones, equal counts. Report
  `CalendarViews.tsx`'s line count before and after (expected to *drop*).
  Week and Day views must be **behaviourally unchanged** — verify in the
  running app, not just by types.
- **Done criteria:** gauntlet green; the three cursor properties tested;
  `CalendarViews.tsx` under 307; Week/Day verified unregressed.

### C2b — `MonthGrid.tsx` + `MonthCell.tsx` + the Month branch
- **Status:** PENDING (depends on C2a)
- **Objective:** render C1's layout — header row of `SHORT_DAY_NAMES`, six
  rows, day numbers (adjacent-month `--muted`, today accent-circled), pills
  with up to three `avatarColorHex()` bands, spanning bars with week-break
  continuation, "+N more", the out-of-window treatment (the C4 glyph,
  smaller), Strange's K1 past treatment. Day-number tap → Day view.
  Switcher gains Month; title "September 2026"; arrows page by month.
- **Boundaries:** may touch `src/components/MonthGrid.tsx` (new),
  `src/components/MonthCell.tsx` (**new — build it from the start**, per
  Captain: the cell is 80–120 lines of visual rules and interleaving them
  with the grid's lane wiring is the shape `DaySection`/`EventCard` were
  split to avoid), `src/components/CalendarEmptyStates.tsx` (new — **only if
  two files genuinely import it**; Captain expects the condition not to fire,
  since an empty Month cell is blank rather than a `NoEventsCard`. Report
  which way it went), `src/components/CalendarViews.tsx`,
  `src/components/CalendarHeader.tsx` (100, label only),
  `src/components/DaySection.tsx` (196, **only** to make `onOpenEvent`
  required and to import extracted cards if C2b actually extracts them),
  `src/app/(app)/calendar/loading.tsx` (61 — **measure the Month skeleton
  against the rendered grid; this repo has shipped a guessed skeleton
  twice**). Must not touch `monthLayout.ts`, `calendarDates.ts`,
  `EventForm.tsx`, `EventCard.tsx`, any action, `prisma/**`.
- **⚠️ Four renderer constraints Vision proved against the real module —
  violating any of these produces a visibly wrong grid:**
  1. **A continuing bar may change lane number at a week break** (proved:
     `row1 A@L0` → `row2 B@L0, A@L1`). The continuation treatment must be
     **per-row open/closed bar ends — never a connector that assumes lane
     alignment across the break.**
  2. **A cell can legitimately show 2 pills and "+1 more" with an empty
     third slot**, because a hidden bar can be blocked at lane 2 by a
     *different* column. The count is arithmetically correct. **Do not
     assert "3 pills whenever overflow > 0".**
  3. **`isOutsideWindow` is C2b's to call, per cell** — C1's return shapes
     have no slot for it, by design. **A bar passing *through* an
     out-of-window cell needs a rendering decision the library does not
     make; make it deliberately and say what you chose.**
  4. `assignLanes` is called **once per row** with that row's 7 dates; a
     multi-day event is clipped to the row automatically. Call it again for
     the continuation.
- **Verification:** 375px screenshots light **and** dark of: the current
  month with a 3-day bar crossing a week break; a five-event cell showing
  "+2 more"; **a cell exhibiting constraint 2** (2 pills + "+1 more");
  Nov 2026 (30 consecutive dates, DST); the forward window edge with
  out-of-window cells marked; and Day view after a day-number tap.
  `getBoundingClientRect` on every tappable day number (≥44px) and on the
  grid's last row vs the bottom nav. **No horizontal scroll at 320/375/1024,
  measured with `body.scrollWidth` — never `documentElement.scrollWidth`,
  which clips and hides overflow** (Strange caught itself under-reporting
  with the wrong one in K1).
- **Done criteria:** the Brief's "Done means" list, each item shown by
  screenshot or measurement; gauntlet green both timezones; counts back to
  baseline.

### C1a — Doc-accuracy fixes in C1's own files (batched, doc-only)
- **Status:** DONE (2026-09-02). Both fixes landed; Fury verified independently: the header now reads "no zero-argument `new Date()`… never reads the clock", the test title claims only what it proves ("keeping its lane in this mix"), **146/146 unmoved** (correct — a doc-only change must not move the count), and all 56 assertions intact. Builder noted honestly that a plain `git diff` cannot evidence this (both files are untracked from C1), and reconstructed a round-trip-verified unified diff instead — the right call rather than an unevidenced claim.
- **Objective:** correct two comments that claim guarantees the code does
  not provide. **No code changes, no behavior changes.**
- **Boundaries:** `src/lib/monthLayout.ts` (header comment only),
  `src/lib/monthLayout.test.ts` (one test title + one comment). Nothing else.
- **The two fixes:**
  1. `monthLayout.ts:10` — "no `new Date()`" is false; line 43 constructs
     `new Date(anchor.getFullYear(), anchor.getMonth(), 1)`. Replace with
     "no zero-argument `new Date()`, no `Date.now()` — this module never
     reads the clock."
  2. `monthLayout.test.ts:100` title and `:111-113` comment — both claim
     general lane continuity. True only on `compareCandidates`' single-day
     branch; the multi-day branch sorts by length first. Retitle to reflect
     that the continuing event keeps its lane *in this mix*, and state the
     real weaker property.
- **Why this is worth a contract at all:** comments that overclaim are a
  documented, repeating defect class in this repo — K1's `page.tsx`,
  `findOrCreateTag`, `AvatarBadge`, and now twice in C1. Both gates
  independently flagged it.
- **Verification:** gauntlet green, 146/146 both zones (a doc-only change
  must not move the count); `git diff` shows comment lines only.

### C5 — The four gate blockers
- **Status:** DONE (2026-09-02), awaiting re-gate. **Fury re-verified every
  blocker independently in the running app**, not from the report:
  - **B1** — Vision's acceptance test at 375×812: **42 cells tested, 0
    day-number failures** (Sep 27 previously failed). Header now shows three
    circles, Today / Month / **Add**. `FloatingAddButton` has no import or
    render left in the Calendar branch, the file itself is byte-identical,
    and `RecipesBrowser.tsx:107` / `FamilyList.tsx:103` still render it.
  - **B2** — bar segments now measured at x 211.42→259.28→307.14, each 47.86
    wide: **gaps of exactly 0 and 0**, against Strange's pre-fix 11.9px.
  - **B3** — at 375px the inner title span computes `display:none`, width 0,
    so the pill is a bare colour bar; at 768px the same spans compute
    `inline` at 32 / 81.4 / 58.3px ("Temple", "Ledger Pre-School", "Camping
    Trip"). Font size and contrast untouched; `font-semibold` applied.
  - **B4** — trailing empty lanes dropped, interior gaps kept.
  - Gauntlet: tsc 0, eslint 0, **164/164 both timezones**, build 0. Line
    counts all under cap; `CalendarViews.tsx` **347 → 342** (net negative as
    contracted). Database at exact baseline: **calendarEvent 3, user 5, 0
    `ZZZ` strays.**
- **Builder deviation, accepted:** B3 was implemented as a *hybrid* of the two
  offered options — `hidden md:inline`, colour-only below 768px and labelled
  at/above it — rather than a pure pick, and the builder flagged it as a third
  variant rather than presenting it as one of the two. Reasoning accepted:
  option (a) alone would have discarded the 768px labelling Strange
  explicitly measured as "genuinely works", and the wall tablet is one of the
  app's two primary devices; the literal ~6-character version of (b) would
  need runtime width measurement for something a fixed, already-tested
  breakpoint does for free.
- **The builder found and fixed a methodology bug in its own tooling
  mid-contract** — its shared `cdp.mjs` only called
  `Emulation.setEmulatedMedia` when `dark: true`, so every "light" capture was
  silently inheriting the Mac's dark OS theme: **the exact mistake this
  contract warned that Vision's driver had made.** It fixed the tool and
  **re-ran every light-theme screenshot and measurement afterwards**. This is
  the third time in this mission a false-verification path was caught by
  someone checking their own instrument rather than their result.
- **Fury's note for the re-gate (not a blocker):** at phone width a pill now
  carries no visible text *and* the title span is `display:none`, so it is
  unavailable to assistive tech too; the cell's own `aria-label` is
  "Open <weekday>, <date>" and names no event. A screen-reader user gets no
  event information from Month at phone width. This is the **same class** as
  K1's delivered note that a Week card conveys *who* only through
  `aria-hidden` swatches. Worth Strange ruling on whether the cell label
  should name its events.

- **Objective:** clear Vision's and Strange's blockers. Rendering and layout
  only — no data, no fetching, no date math.
- **Boundaries:** may touch `src/components/MonthCell.tsx`,
  `src/components/MonthGrid.tsx`, `src/components/CalendarHeader.tsx`,
  `src/components/CalendarViews.tsx` (347 — the FAB removal is net-negative).
  Must not touch `FloatingAddButton.tsx` (**Recipes and Family keep it
  unchanged**), `monthLayout.ts` (**the lane arithmetic is correct and is not
  challenged by any blocker**), `calendarDates.ts`, `useCalendarPeriod.ts`,
  `EventForm.tsx`, `EventCard.tsx`, actions, `prisma/**`.
- **B1 — the FAB.** Remove the `{canManage && <FloatingAddButton …/>}` block
  from the Calendar branch (**all three views**, not Month only — Strange
  rejected per-view placement on `DESIGN.md`'s nav-consistency principle).
  Add a third `ActionCircle` to `CalendarHeader.tsx`: `Plus`, label "Add",
  rendered only when a new `canManage` prop is true so kid sessions keep two
  circles and `justify-center` stays balanced. Keep the `ActionSheet` flow
  exactly as-is — **only the trigger moves.**
  **Do not substitute your own remedy:** bottom-right and grid-padding were
  both *measured* and both **fail** (the FAB is 56px, wider than a 44.42px
  cell; and a `position: fixed` overlay cannot be moved by document padding).
- **B2 — the bar must actually be continuous.** Segments currently measure
  36.4px separated by **11.9px of page background**. Drop the horizontal gap
  on the day-row `ROW_CLASS` (**keep the vertical gap between rows**) and give
  `MonthCell`'s slot track `-mx-1` so pills reach the cell edges while the day
  number and "+N more" keep their padding.
- **B3 — titles truncate to 2 characters at 375px.** Builder's choice of two
  honest options: (a) at phone width render a colour bar with no text, letting
  "+N more" and the day tap carry identification (what Google and Apple do);
  or (b) render the title only when the pill holds a useful minimum (~6
  chars), falling back to (a). **Do not shrink the font** — 9px is already the
  app's smallest type. **Do not lower contrast** — it currently passes AA and
  Strange measured it.
- **B4 — stop reserving trailing empty lane slots**, so "+N more" sits under
  the last pill. **Interior gaps must still render**, or bars slide vertically
  between columns. `MonthCell.tsx` only; touch no lane arithmetic.
- **Cheap notes to fold in:** `font-semibold` on live pills to restore the
  past/live weight delta Week and Day use; fix `pillBackground`'s comment
  (the 3-band cap lives in the caller, not that function); and the stale
  "no Month view yet" comments at `CalendarViews.tsx:71` (the ones in
  `useCalendarPeriod.ts` and `page.tsx` are off this boundary — C6 takes them).
- **Verification — Vision's acceptance test, verbatim:** at scrollY 0, for
  **375×667, 375×812 and 320×568**, `elementFromPoint` at the centre of every
  in-viewport cell's **day number** must return that cell. Reusable script at
  `scratchpad/fab.mjs`. Plus: screenshots in **both themes set explicitly via
  `Emulation.setEmulatedMedia`** — never inherited from the host OS, and never
  Chrome's `--force-dark-mode`, which inverts the app's own theme and gives a
  false reading (Vision's driver made exactly that mistake). Bar continuity
  measured in pixels, not asserted from the rounding logic — that is what
  Vision's check could not see. Full gauntlet, both timezones, 164 baseline.

### C7 — Strange's two new blockers (B5 contrast, B6 accessibility)
- **Status:** DONE (2026-09-02), awaiting re-gate. `MonthCell.tsx` 193 → 218,
  the only file touched.
- **B5 result:** rendered-pixel contrast, decoded from a real screenshot via
  canvas `getImageData` (not computed alpha): **0 of 18 pills below 3:1 in
  either theme**, against Strange's pre-fix **55 of 55**. Live `border-fg`
  6.96:1 light / 15.23:1 dark; past `border-muted` 4.75 / 6.81 — matching
  Strange's cited figures exactly. Continuity preserved: the six
  inter-segment gaps on an injected full-week bar are **still `[0,0,0,0,0,0]`**
  and every pill is still 16px tall. Implementation verified by Fury:
  `border-y` always, `border-l`/`border-r` gated on the **existing**
  `roundLeft`/`roundRight` flags, so a continuing segment grows no vertical
  edge.
- **B6 result:** AX event-name nodes at 375px **0 → 16**, read from
  `Accessibility.getFullAXTree`.
- **The builder's best call was refusing a convenient baseline.** Asked to
  prove the phone view stayed pixel-identical, it found the shared
  scratchpad screenshots were from Strange's own gate run against *different*
  staged data (~127K/1.2M pixels differing — not apples to apples). Rather
  than use an artifact of unknown provenance, it **reconstructed the literal
  C5-shipped `MonthCell.tsx` from its own pre-edit read** and ran a controlled
  A/B with identical DOM, database and viewport. Result: **0.2% of pixels
  differ, bounded to `bbox {x 328-709, y 692-765}` — the pill region only.**
  Nothing outside it changed. That is a stronger proof than the one asked for.
- Declined the optional `md:` → `sm:` breakpoint move, correctly, as
  explicitly non-blocking and outside the two named blockers.

**⚠️ Fury's finding for the re-gate — a NOTE, but a load-bearing one.**
`MonthCell.tsx:167` still reads *"at 375px the pill can hold ~2
characters."* **Strange corrected that number at pass 2**: B2 widened the
pill 36.4 → 47.86px, and **8 characters now fit at 375**. The comment does not
merely carry a stale figure — **it is the stated rationale for withholding
labels below `md`**, so a future reader who trusts it will never re-examine
the breakpoint, which is exactly what Strange recommended re-examining
(`md:` → `sm:`). Behaviour is correct, so this does not block; but it is the
**sixth** instance of this repo's overclaiming-comment class in this mission
alone (K1's `page.tsx`, `findOrCreateTag`, `AvatarBadge`, C1's two, now this),
and the first where the stale evidence is the *argument for a design
decision* rather than a description of behaviour. Fix the comment and decide
the breakpoint in the same pass.
- **Boundaries:** `src/components/MonthCell.tsx` **only**. Touches no lane
  arithmetic, no other component.
- **B5 — pill border.** `border-y` always; `border-l` / `border-r` gated on
  the **existing** `roundLeft` / `roundRight` flags so bar continuity survives.
  `border-fg` on live pills, `border-muted` on past. **Do not raise fill
  alpha** (measured 1.51:1 even at α 0.40) and **do not use `--line`**
  (1.24:1). **Do not use the person's own colour at full opacity** — four of
  eight `AVATAR_COLORS` fail on the dark background.
- **B6 — `hidden md:inline` → `sr-only md:not-sr-only md:inline`.** The phone
  view must stay **pixel-identical**; `sr-only` is absolute + clip and
  contributes nothing to layout.
- **Optional, Strange's recommendation, not a blocker:** move the label
  breakpoint `md:` → `sm:` (640), since B2's wider pill now fits 8 characters
  at 375 and `md` withholds labels up to 767 including iPad mini at 744.
- **Verification:** the six Sep-20-row inter-segment gaps **still exactly 0**;
  pill height still 16px; **rendered-pixel** contrast ≥3:1 against the
  background in **both** themes (not computed alphas); AX event-name count at
  375 back to non-zero; phone-view screenshots pixel-identical apart from the
  border. Full gauntlet, both timezones, 164 baseline.

### C6 — Unbounded navigation: fetch the period you're looking at
- **Status:** DONE (2026-09-02), awaiting gates. **Bryce, 2026-09-02: "We HAVE
  to fix it. Let's do it the way Google does it."** — done.
- **Fury verified independently in the running app:** `?date=2028-03-15&view=month`
  loads **March 2028** with **both arrows enabled** (`prevDisabled false,
  nextDisabled false`); paging forward from there gives **April → May → June
  2028**, consecutive, no skips; and **November 2026 renders 30 cells, Nov 1 →
  Nov 30, consecutive, in a 42-cell grid** — the DST item Strange correctly
  refused to claim at C2b, because the ±60-day wall made it unreachable. The
  `WINDOW_DAYS` constant is gone from `page.tsx`.
- **Gauntlet (Fury's own run):** tsc 0, eslint 0, **180/180 under both
  timezones** (164 + 16 new), build 0. All six files under the cap.
- **The date-authority split, as required:** the **server** turns `?date=`
  into a fetch **window** only — `CALENDAR_FETCH_WINDOW_DAYS` 60 plus a
  deliberate `WINDOW_TZ_SKEW_PAD_DAYS` of 1 each side to absorb the
  server/browser offset. It never decides today, nor which day an event
  renders under. The **browser** still decides all of that, unchanged. The URL
  only ever carries a Date the browser itself computed.
- **Red-then-green delivered** for both previously-untested invariants (C7
  direction-of-travel, Vision pass-3 skewed clock), which had been verified
  *only* by adversarial browser runs until now.

**⚠️ The real tradeoff this contract introduces — Fury measured it, and it is
not in the contract's own success criteria.** Every Prev/Next is now a **real
server navigation** rather than a local state step. Measured on localhost
against the Neon dev branch: **1213ms / 240ms / 763ms** for three consecutive
month steps. Before C6, paging was instant (local state, no fetch).
Production is co-located (Vercel `pdx1` beside Neon `us-west-2`, per
`vercel.json`) so it should be faster, but it is a round trip either way, and
**CLAUDE.md has an entire section on this app having felt slow for exactly
this reason.** The builder anticipated it and converted `loading.tsx` to a
Client Component so a Month-shaped skeleton shows during the navigation
instead of the mismatched 7-row Week one — a regression it would otherwise
have introduced, since this fallback now fires on *every* step rather than
only on first load. **Gates should judge whether sub-second-with-skeleton is
acceptable, or whether a hybrid is wanted after all.**

**Deviations, all self-reported honestly:**
- `CalendarViews.tsx` **342 → 339**, not the "well below" the contract hoped
  for: the extraction saved ~57 lines and the required navigation machinery
  added roughly the same back. The builder clawed back headroom by moving
  `parseViewParam`/`buildCalendarSearch` into `calendarPaging.ts` (11 lines
  spare, not 1) and **reported the real number rather than the hoped-for one.**
- **`periodWindowEdges` is extracted and tested but no longer called** —
  tested dead code. The builder rejected a "hybrid" (step locally inside the
  window, navigate only at its edge) on the grounds that the URL must stay the
  single source of truth for back/forward and reload, and any searchParams
  change forces a fresh RSC render anyway — so the hybrid buys nothing while
  adding exactly the class of date-sync bug this repo's history warns about.
  Kept per the contract's "do not delete the honesty machinery" instruction
  and documented as dormant. **Captain should rule**: the contract meant
  `isOutsideWindow` and the glyph; whether a tested-but-uncalled predicate
  should live on is a structure call, and Captain has already flagged one dead
  export this mission (`MonthLoadingSkeleton`).
- `DaySection.tsx`'s `NotLoadedCard` copy ("tap Today to come back") is now
  stale in spirit — the honest text is "keep paging, it'll load more" — but
  that file was must-not-touch, so it is flagged, not fixed.
- An earlier verification run showed a one-month round-trip discrepancy,
  **traced to the builder's own fixed-timeout title read racing a real click**
  — the browser-automation flakiness class this repo already documents. Re-run
  with URL-change-confirmed clicks, the +18/−18 round trip was exact.
- **The problem.** `page.tsx:22`'s `WINDOW_DAYS = 60` fetches ±60 days around
  the **server's** now, once, and `canStepToPeriod` **disables the arrows** at
  that edge. You cannot reach next June, let alone next year. K1 built
  "window-edge honesty" and built it well — three distinct states,
  adversarially verified twice — but its side effect is a **navigation wall**,
  and a calendar you cannot book a year ahead in is not a calendar. This was
  missed by every gate and by Fury; Bryce caught it on first contact.
- **Objective:** the window follows the period being viewed, not today.
  Navigate arbitrarily far in either direction, as Google Calendar does.
- **Boundaries:** may touch `src/app/(app)/calendar/page.tsx`,
  `src/components/CalendarViews.tsx`, `src/lib/useCalendarPeriod.ts`,
  `src/lib/calendarPaging.ts` (**new — see below**),
  `src/lib/calendarPaging.test.ts` (new), `src/app/(app)/calendar/loading.tsx`.
  Must not touch `monthLayout.ts`, `MonthCell.tsx`, `MonthGrid.tsx`,
  `EventForm.tsx`, `EventCard.tsx`, `prisma/**`, or any Server Action's guard.
- **Shape.** The page accepts the viewed period as a **URL parameter** and
  builds its fetch window around **that anchor**, not around today.
  Navigation becomes real navigation (`router.push`), which is how the rest of
  this app already works and which reuses the loading skeleton that already
  exists. No parameter = today, so the calendar **opens on today like Google
  and Apple do**.
- **⚠️ The trap this contract is most likely to fall into.** The URL carries
  a date *string*; the server must build a fetch *window* from it. This
  repo's standing rule is "never construct a calendar-meaningful `Date`
  server-side" — the UTC/Mountain trap has appeared **eight** times and
  reached a write path in K1. The resolution: a fetch window is a **range**,
  not a calendar day, so it is allowed to be built server-side **provided it
  is padded generously enough (≥1 day each side) to absorb the offset**, and
  provided **which day each event renders on is still decided in the browser,
  exactly as it is today.** Say explicitly in the report which side decides
  what. Validate the param semantically, not lexically — the round-trip check
  K1's C8 note already specifies (`toDateParam(parse(d)) === d`), so
  `2026-02-30` is rejected rather than rolling over to Mar 2.
- **`canStepToPeriod` must stop disabling the arrows.** That predicate was
  correct for a fixed window and is wrong for a moving one. `isOutsideWindow`
  and the not-loaded glyph **stay** — with a period-following window every
  visible cell is normally loaded, so the state becomes rare rather than
  routine, which is what it was always meant to be. Do not delete the honesty
  machinery; retire only its use as a wall.
- **Fold in Captain's C2-1 recommendation, which this contract makes
  unavoidable anyway:** extract `CalendarViews.tsx:163-214`'s window/paging
  block to **`src/lib/calendarPaging.ts`**. It is entirely pure over
  `(view, anchor, weekStart, today, windowStart, windowEnd)` — no clock read,
  no state, no DOM — and its C7 direction-of-travel and skewed-clock
  invariants are today verified **only by adversarial browser runs, with not
  one `node:test` case pinning them.** Extracting makes them testable for the
  first time; **red-then-green on both** is a done criterion. Also takes
  `CalendarViews.tsx` off its 347/350 ceiling.
- **Verification:** navigate **+18 months and −18 months** and land on correct,
  consecutive months with real events rendering; **Nov 2026 becomes reachable
  in the running app for the first time** — screenshot its 30 consecutive
  dates, closing the item Strange correctly refused to claim. Deep-link a far
  future month directly by URL. Confirm reload and back/forward behave.
  Full gauntlet both timezones; red-then-green for the two extracted
  invariants.
- **Open question for Bryce, not for the builder to decide:** whether the
  calendar reopens on the last-viewed period or always on today. **Default to
  today** (Google's and Apple's behaviour, and what he asked for) unless he
  says otherwise.

### C8 — Vision's blocker: the resync effect cancels every optimistic step
- **Status:** DONE (2026-09-02), awaiting the authorized final gate round.
  **Fury verified the blocker itself is dead, in the running app:**
  - **Double tap, 60ms apart, no throttling** (the exact case that failed
    before) from March 2028 → **May 2028**, URL `?date=2028-05-15`. March + 2.
  - **Single tap → no revert**: exactly two transitions (March → April),
    `revertedMidFlight: false`, where the bug produced April → March → April.
  - **Optimistic flip measured at 26ms** on a warm route; the 349/614ms seen
    on other runs is `npm run dev` recompile, not design cost. **Vision's
    prod-build figure (107–192ms) is the honest number** — and Fury's earlier
    1213ms claim was measuring the bug, as Vision established.
  - Gauntlet: tsc 0, eslint 0, **180/180** under `npm test` *and* under the
    direct `TZ=UTC node --import tsx --test …` invocation, build 0.
- **The builder exceeded the contract, correctly, and found two real failures
  the contract's own suggestion would have shipped.** Implementing Vision's
  literal "remember the pushed search string in a ref" passed Vision's
  1500ms-latency acceptance test but failed twice under stress testing the
  builder did on its own initiative: (1) **unthrottled double-tap at 60ms** —
  Next does not reliably cancel the first in-flight navigation, so both
  commit independently and the *earlier, superseded* one reverts local state,
  reproducing the original bug; and (2) **Forward navigation** — the stale
  string matched a URL the browser returned to via history, so a genuine
  external navigation was **silently swallowed** and the page stayed on the
  wrong month until reload. Replaced with a `pendingSelfNav` counter that is
  *decremented* on an out-of-sync commit and cleared the instant local state
  is observed back in sync, so it cannot linger and eat a later real change.
  5/5 clean re-runs. **Found and fixed inside budget rather than deferred** —
  and it means the acceptance test Vision wrote would have passed a fix that
  was still broken in two ways.
- Also landed: `?date=X&date=X` normalization (was 42 not-loaded glyphs, 0
  pills — now 0 glyphs, 42 cells), plus three of the mission's overclaiming
  comments corrected (`loading.tsx`'s false "fires on every navigation",
  `MonthCell.tsx:167`'s "~2 characters", `CalendarViews.tsx:184`'s false
  citation). `useCalendarPeriod.ts:229` was reported not fixed, correctly —
  off boundary.
- **⚠️ `CalendarViews.tsx` is now 348 of 350 — two lines.** Captain's pass-3
  finding that 11 lines "will not survive K3" is now acute: **its recommended
  extraction of the URL/navigation cluster (~57 lines, taking the file to
  ~285) should be K3's first contract and is no longer advisory.**
- The builder did not commit, noting the contract permitted but did not
  instruct it — the right reading of a standing rule. **Bryce authorized one more gate round (2026-09-02)
  after Fury surfaced the exhausted budget**, on the ground that this is a new
  blocker in new code with a precise diagnosis — not the same finding
  recurring, which is what the 3-pass cap exists to catch.
- **Boundaries:** `src/components/CalendarViews.tsx` (339),
  `src/app/(app)/calendar/loading.tsx` (154, comment only),
  `src/components/MonthCell.tsx` (218, comment only),
  `src/app/(app)/calendar/page.tsx` (117). Must not touch
  `src/lib/useToday.ts` (**the fresh-Date-per-call behaviour is correct and
  deliberate** — the consumer's dependency array is what is wrong), any lib
  module, `EventForm.tsx`, `EventCard.tsx`, actions, `prisma/**`.
- **The blocker.** `useToday()` returns `new Date(timestamp)` — a fresh object
  each call — and it sits in the effect's dependency array
  `[searchParams, today]`, so the URL→local resync runs on **every render**.
  After `step()` and before `router.push` commits, it compares the stepped
  anchor to the unchanged URL and `jumpTo`s back. **Two fast taps advance one
  period**, reproduced with no throttling at 60ms apart, and in Week view too.
- **Fix:** depend on **values, not identities** — read
  `searchParams.get("date")`, `searchParams.get("view")` and
  `today?.getTime()` into locals, depend on those, parse inside the effect.
  **Recommended on top:** record the search string `navigateTo` just pushed in
  a ref and skip the resync while `searchParams.toString()` matches it, so two
  in-flight pushes cannot bounce May→April→May.
- **Cheap notes to fold in, all comment-only except the last:**
  - `loading.tsx:13-27` claims the skeleton "fires on every real navigation".
    **Measured false** — `statusSeen: 0` across Prev/Next, Today and view
    switches, with and without 1.5s latency, because a same-route
    search-param push is a transition over an already-mounted Suspense
    boundary. **Seventh overclaiming comment this mission.**
  - `MonthCell.tsx:167`'s "~2 characters at 375px" — **measured 7** (Vision)
    / 8 (Strange). It is the stated rationale for the `md:` breakpoint, so fix
    it to the measured number. The `md:`→`sm:` *decision* is not a builder
    call; leave the breakpoint alone.
  - `CalendarViews.tsx:184` cites loading.tsx never needing a Month shape;
    C6 gave it one. `useCalendarPeriod.ts:229` says view becomes "month" only
    via `setView`; `jumpTo` can too (the safety property survives — it also
    routes through `withView` — but the sentence names the wrong mechanism).
    **`useCalendarPeriod.ts` is off-boundary**: report that one, don't fix it.
  - `page.tsx:36`'s `searchParams: { date?: string }` is a lie at runtime —
    Next hands `string[]` for repeated keys, and `?date=X&date=X` yields **42
    not-loaded glyphs and 0 pills**. Normalize `Array.isArray(d) ? d[0] : d`
    once so server and client agree. This is the one behavioural change here.
- **Verification (Vision's own acceptance test, verbatim):** double-tap Next
  under `Network.emulateNetworkConditions latency:1500`, taps 150ms apart →
  expect **May 2028**; Week view → **Mar 26 – Apr 1**. Also confirm the single
  tap no longer reverts (no "April→March→April" sequence), that the URL still
  commits, and that Back/Forward/reload still land correctly. Full gauntlet,
  both timezones via the **direct** `TZ=UTC node --import tsx --test …`
  invocation — `TZ=UTC npm test` silently runs Denver twice
  (`package.json:11` pins TZ inline).

### C4 — The one-source-of-truth repairs C2b's boundaries forced
- **Status:** QUEUED (Captain's ruling, C2-1). Dispatch with or after C3.
- **Objective:** undo the three compromises C2b's must-not-touch list forced,
  each of which needs a file that was off its boundary.
- **Boundaries:** may touch `src/components/EventCard.tsx` (**the reason this
  is a contract and not a comment**), `src/components/MonthCell.tsx`,
  `src/components/MonthGrid.tsx`, `src/components/Skeleton.tsx`,
  `src/app/(app)/calendar/loading.tsx`, and a new `src/lib/` module for the
  hoisted helper.
- **The three repairs:**
  1. **Hoist `hexToRgba` to `src/lib/`** — identical bodies at
     `MonthCell.tsx:35` and `EventCard.tsx:134`. Pure over its inputs, so it
     takes the `match.ts`/`duplicates.ts` standing with **no** `server-only`.
     Leave each call site its own band builder: `pillBackground` and
     `bandBackground` are genuine *variants* (hex vs colour-name input,
     different empty fallbacks), a fork rather than a copy.
  2. ~~**`VISIBLE_LANES` is declared twice**~~ — ✅ **STRUCK. Resolved for
     free by C5's B4 rewrite**, which made `MonthCell` derive from
     `slots.length`; Captain's pass-3 `grep` finds one declaration
     (`MonthGrid.tsx:11`). Nothing to do.
  3. **Move the Month skeleton out of `loading.tsx`** — and per Captain's
     pass 3, **move `MonthGridSkeletonRows` too, not just
     `MonthLoadingSkeleton`**: C6 factored the real markup into the former, so
     moving only the latter relocates an empty wrapper and leaves the markup
     behind. Still the only one of eight `loading.tsx` files with a second
     export, and its only plausible consumer (`CalendarViews.tsx`) would be a
     `components → app/` arrow **STRUCTURE.md does not sanction**.
  4. **⚠️ Re-measure the Month skeleton — it is measured against geometry C5
     changed hours earlier, while its own header claims it was "MEASURED
     against the real signed-in page … not guessed."** Two drifts Captain
     derived from source (it explicitly did *not* browser-measure and claimed
     no pixel figure): `loading.tsx:129` renders `gap-1` but C5's B2 removed
     the real grid's column gap (`MonthGrid.tsx:22`); and `loading.tsx:131`'s
     `h-[78.5px]` assumes three pill slots always render, which C5's B4 made
     conditional (`MonthCell.tsx:143`), so most real cells are now short.
     **This fires on every Prev/Next since C6**, not once at first load, and
     partly undercuts C6's own reason for making the file a Client Component.
     Also stale: `loading.tsx:72-75` renders two action circles; an admin
     session has rendered three since C5.
  5. **Route `src/app/(app)/calendar/new/page.tsx:43` through
     `parseDateParam`.** It validates the *same* `?date=` parameter, from the
     *same* producer, with a **shape-only** regex — so it **accepts
     `2026-02-30`** and hands it to `EventForm` to roll over client-side,
     exactly the case `parseDateParam` was written to reject and exactly K1's
     C8 note. C6 wrote the strict validator and could not fix this one because
     the file was off its boundary.
  6. **Fix `MonthCell.tsx:167`'s stale rationale and decide the breakpoint in
     the same pass.** It still reads "at 375px the pill can hold ~2
     characters" — the figure Strange corrected at pass 2 (B2 widened the pill;
     8 characters now fit). It is the stated argument for withholding labels
     below `md`, so the argument and its evidence currently point opposite
     ways. Decide `md:` → `sm:` (640) here. Also stale, both flagged by
     Captain: `CalendarViews.tsx:184` and `useCalendarPeriod.ts:229`.
- **Verification:** gauntlet green both timezones, equal test count; `grep`
  proves one definition each of `hexToRgba` and `VISIBLE_LANES` repo-wide;
  no `components → app/` import exists.

### C3 — Split `calendarDates.test.ts` and send the adopted test home
- **Status:** QUEUED (Bryce, 2026-09-02: "queue the split, apply Captain's
  amendment" — both were done; the amendment is live in `STRUCTURE.md`, this
  contract is the repair it points at). **Dispatch after C2b's gates**, so
  it can't churn files while the Month view is being gated. May equally ride
  along with K3, which already must split `EventForm.tsx` for the same
  too-big reason.
- **Objective:** `calendarDates.test.ts` sits at **349 of 350** — the reason
  `calendarDayDiff`'s own test had to be adopted by `monthLayout.test.ts` in
  the first place. Split it by concern so `calendarDayDiff`'s test can move
  home, emptying `STRUCTURE.md`'s adoption list.
- **Boundaries:** may touch `src/lib/calendarDates.test.ts` and
  `src/lib/monthLayout.test.ts` (to remove the adopted case), plus whatever
  new sibling test file the split creates. **Must not touch any source
  module** — this is test reorganization only, not a behavior change. If a
  test cannot move without editing the module it covers, that is
  `BLOCKED-ON-CONTRACT`.
- **The split must be by concern, not by line count** — per `STRUCTURE.md`'s
  own rule that the division is "by module under test", a numbered second
  file (`calendarDates2.test.ts`) is explicitly forbidden. `calendarDates.ts`
  covers several genuinely separate jobs (time-range formatting, all-day span
  math, window/paging predicates); a new file named for one of those concerns
  is the shape to aim for.
- **Verification:** the whole point is that nothing is lost in the move.
  `npm test` must report **exactly the same count before and after** (164 at
  time of queueing, plus whatever C2b adds) under **both** timezones, with
  zero failures — a moved test that silently vanishes is the only real risk
  here and the count is the instrument that catches it. Plus tsc, eslint,
  build.
- **⚠️ The new file MUST stay flat in `src/lib/` — Captain's C2-1 finding.**
  `package.json:11`'s test glob is a hand-enumerated two-directory list
  (`src/lib/*.test.ts src/lib/voice/*.test.ts`), **not recursive**, and
  `.github/workflows/ci.yml:46` runs it. A test file placed in any new
  subdirectory silently vanishes from `npm test` **and CI while the suite
  still reports green at a lower count.** Do not pioneer `src/lib/calendar/`
  here. If any future change does add a test directory, **the glob entry
  ships in the same commit.**
- **Also decide `canStepToPeriod`'s fate (Captain, pass 3).** C6 retired
  `periodWindowEdges`, which transitively left `calendarDates.ts:250`'s
  `canStepToPeriod` **exported, uncalled, and with no test in its own home
  file** — pinned only incidentally by a control assertion in
  `calendarPaging.test.ts:112`. C3 must either give it real cases at home or
  delete it alongside `periodWindowEdges`. It may not stay as it is.
- **The glob exposure grew 28% since this contract was written:** the five lib
  test files now hold **74 of 180 tests**, all reachable only through
  `package.json:11`'s hand-enumerated two-directory list. The stay-flat rule
  is more load-bearing, not less.
- **Done criteria:** every file under the 350 soft cap; `calendarDayDiff`'s
  test lives in a file named for `calendarDates.ts`, flat in `src/lib/`;
  `monthLayout.test.ts` contains only `monthLayout.ts`'s own tests;
  **`STRUCTURE.md`'s "live instances of the adoption clause" list is emptied**
  in the same change, since leaving a stale debt marker is its own small lie.

## Fury's pre-authorization for C2's extraction (2026-09-02, measured)

The C2 contract leaves `useCalendarPeriod.ts` conditional ("if still over
330 after the Month branch… report it rather than doing it silently").
Having read `CalendarViews.tsx:88-180`, that condition is near-certain to
fire, so **the boundary extension is granted in advance** — Stark should
extract rather than stop and report `BLOCKED-ON-CONTRACT` for it.

Why it's near-certain, counted rather than guessed: seven `view === "week"
? … : …` decision sites each need a third arm — `days`, `isCurrentPeriod`,
`title`, `step`, `placeholderCount`, `nextPeriodStart`,
`previousPeriodEnd` — at roughly 3–5 lines apiece (~25–35 lines), before
the Month render branch itself (~20). 307 + ~35 + ~20 ≈ **362**, over the
350 soft cap. The paging block is also the densest invariant-carrying code
in the file (C7's direction-of-travel rule, Vision pass-3's skewed-clock
case, the full-containment window predicate), so it is the right thing to
lift whole rather than to interleave a third view into in place.

**Granted boundary addition for C2:** `src/lib/useCalendarPeriod.ts` (new).
It must stay pure of `new Date()` — `today` continues to arrive from
`useToday()` at the call site, per the standing rule that no
calendar-meaningful date is ever constructed server-side. If the hook ends
up needing its own tests, they go in `src/lib/useCalendarPeriod.test.ts`,
never in `calendarDates.test.ts` (349, at cap).

## Post-C4 tree, measured 2026-09-02 (the numbers the contracts assume)

| file | lines | headroom to 350 |
|---|---|---|
| `EventForm.tsx` | 346 | **4** — K3's problem, not K2's; do not touch |
| `calendarDates.test.ts` | 349 | **1** — add no tests here |
| `CalendarViews.tsx` | 307 | 43 — the Month branch eats this |
| `calendarDates.ts` | 250 | 100 |
| `DaySection.tsx` | 196 | 154 |
| `EventDetailSheet.tsx` | 189 | 161 |
| `EventCard.tsx` | 168 | 182 (untouched by K2) |
| `page.tsx` | 118 | 232 |
| `CalendarHeader.tsx` | 100 | 250 |
| `types.ts` | 96 | 254 |
| `mealPlanDates.ts` | 85 | 265 |
| `ActionCircle.tsx` | 38 | 312 |

## Inherited from K1's gates — fold into C1/C2

**From Strange, C4 pass 2 (the last K1 gate):**
- **`body.scrollWidth`, never `documentElement.scrollWidth`**, is the
  correct instrument for horizontal overflow in this app — the html element
  clips and hides it. Strange caught itself under-reporting with the wrong
  one. Any K2 overflow check must use `body`.
- **The Starts/Ends row at 375 has ~10px of slack**, with the date input at
  its intrinsic floor. **No further control fits in that row.** (320 already
  overflows by 29px, pre-existing; the constitution's coverage width is 375
  and that is clean.)
- **Close the parser note cheaply if K2 touches the page:** the `?date=`
  regex is shape-only, so `2026-02-30` rolls over to Mar 2. A round-trip
  check — reject unless `toDateParam(parse(date)) === date` — makes the
  validation semantic rather than lexical, at the cost of one comparison.

**From Captain, C4 pass 1:**

- **`CalendarEventView.createdByName: string | null`** in `src/lib/types.ts`
  replaces K1's `createdByNames` map (`page.tsx`, `CalendarViews.tsx`,
  `EventDetailSheet.tsx` adjust). C2 owns this since it touches those files.
- **Collapse the four `YYYY-MM-DD` formatters**: export
  `toLocalDateString(date)` from `mealPlanDates.ts` and `calendarDayDiff`
  from `calendarDates.ts`; replace the copies in `PantryItemEditSheet.tsx:20`,
  `EventForm.tsx:40`, `CalendarViews.tsx:302` (`toDateParam`), and
  `EventForm.tsx:56` (`daysBetween`). C1 exports; C2 replaces the calendar
  copies (the pantry one is out of K2's scope — a note for whoever touches
  it next).
- **New date tests go in `monthLayout.test.ts`**, never into
  `calendarDates.test.ts` (349, one under the cap; tests are not exempt).
- **If Month cells reuse any empty-state card**, extract
  `NoEventsCard`/`NotLoadedCard`/the skeleton row into
  `CalendarEmptyStates.tsx` rather than importing `DaySection` for its
  private components.
- **Make `DaySection.onOpenEvent` required** on the non-loading branch (its
  own comment already says "required").

## Fury's own finding on C1, handed to Vision (not a blocker call yet)

**The lane-continuity claim is overstated, and I proved it false rather
than reasoning about it.** Both `monthLayout.test.ts`'s comment ("continuity
isn't hardcoded, it falls out of sorting by the event's real `startAt`") and
Stark's report assert a general guarantee. It holds only on the
**single-day** branch of `compareCandidates`, which is the only branch the
"lanes continuous" test exercises. The **multi-day** branch sorts by *length
first*, so a longer event starting in the continuation row outranks the
continuing one.

Counterexample, run against the real module (`npx tsx`, scratch script):

```
A = all-day Nov 6 → Nov 11 (covers Nov 6,7 in row 1; Nov 8,9,10 in row 2)
B = all-day Nov 8 → Nov 15 (covers all 7 of row 2 — strictly longer there)

row1 A lane: 0
row2 A lane: 1   row2 B lane: 0
→ LANE JUMP across the week break
```

**Why this is probably not a correctness blocker:** the contract granted
"lanes stay continuous across the split *where possible*", the gauntlet is
green, and per-row re-packing is what Google Calendar itself does — it keeps
rows dense, where reserving lanes across rows would waste vertical space.
The *behavior* is defensible.

**Why it still must not ship as written:** the comment claims a guarantee
the code does not provide, and that is a documented, repeating defect class
in this repo — K1's own lesson records "the page's own comment claimed the
guarantee it lacked", and `findOrCreateTag` and `AvatarBadge` were both
caught the same way. The concrete downstream risk is **C2**: its renderer
draws the week-break continuation, and an author who reads "lanes
continuous" may draw a connector that assumes lane alignment. C2 must be
told the truth, and the comment corrected to state the real, weaker
property.

Vision owns the severity call. Fury's recommendation: **NOTE on behavior,
required doc fix before C2 dispatches.**

## Vision, C1 pass 1 — PASS (0 blockers, 7 notes)

Re-ran the whole gauntlet independently (tsc 0, eslint 0, 146/146 under
both zones, build exit 0) and confirmed `calendarDates.test.ts` identical to
HEAD via `git diff --quiet`. Findings, all routed:

**On the lane-continuity finding — Vision agrees with Fury's severity call
(NOTE + required doc fix), and corrected Fury's framing.** The module
*header* (`monthLayout.ts:21-28`) is already honest: it says continuity
"normally" holds and "may not". The overclaim lives **only** in the test's
title ("lanes continuous") and its comment at `monthLayout.test.ts:111-113`.
Vision reproduced the counterexample independently:
`row1: A@L0` → `row2: B@L0, A@L1`. Not a blocker because no data is wrong —
every span is non-colliding, nothing is dropped, and per-row re-packing is a
legitimate policy the contract's "where possible" wording permits.

**Four findings that become binding constraints on C2's renderer:**

1. **A continuing bar may change lane number at a week break.** The
   continuation treatment must therefore be **per-row (open/closed bar
   ends), never a connector that assumes lane alignment.**
2. **A cell can legitimately show 2 pills and "+1 more" with a visibly
   empty third slot** — greedy per-row lanes mean a hidden bar can be
   blocked at lane 2 by a *different* column (Vision's probe 4b: col 4
   `visible=2 overflow=1`). The count is arithmetically correct (same as
   Google Calendar), but **a renderer that asserts "3 pills whenever
   overflow > 0" would be wrong.**
3. **`isOutsideWindow` is C2's job, not the lib's** — neither C1 return
   shape has a slot for an out-of-window mark, so there was nowhere for the
   library to put one. C2 calls it per cell, as `CalendarViews.tsx` already
   does. **A bar passing through an out-of-window cell needs a rendering
   decision the library does not make.**
4. Overflow arithmetic verified by a **3000-trial randomized property
   check** — 0 violations against ground truth from `daysEventCovers`.

**One finding routed forward to K4, genuinely valuable:** determinism holds
for unique ids (3000 shuffled trials identical) but **fails for duplicate
ids** — two events sharing an `id` swap lanes when input order reverses.
Unreachable today (ids are DB cuids), but **K4's recurrence expansion will
produce several instances of one `rrule` row** and must give each a distinct
id (e.g. `` `${id}:${occurrenceDate}` ``) before calling `assignLanes`.
Wants a line in `MonthLayoutEvent.id`'s comment and in K4's plan.

**The DST test is genuinely timezone-sensitive, not vacuous** — proven, not
asserted: Vision fed a deliberately millisecond-based grid to the same
consecutive-days check; it **fails** under `TZ=America/Denver` (`gaps:[1],
dup:true`) and **passes** under `TZ=UTC`. So the Denver run is the one that
catches DST and the UTC run is vacuous for DST *by nature* — fine, because
the `TZ=` pin lives inside `package.json:11`'s script and
`.github/workflows/ci.yml:46` runs `npm test`, so the pin cannot be lost in
CI the way K1's was.

**Honest limitation recorded:** Stark's red-then-green claim is **not
verifiable from artifacts** — C1 is uncommitted, so no history shows the red
state. The collision test does assert the property, so the claim is
plausible; it is simply not evidence. Not a blocker.

## Captain, C1 pass 1 — PASS (0 blockers, 9 notes)

Import graph verified by grep, not by trusting the header:
`monthLayout → {mealPlanDates, calendarDates}`, `calendarDates →
mealPlanDates`, `mealPlanDates → ∅`. No `app/`, `components/`, `db`,
`prisma`, `react`, env read, or cycle. Gauntlet re-run independently:
146/146 both zones. No cap crossed — `calendarDates.test.ts` byte-identical
at 349. `server-only` correctly absent (pure, same standing as
`match.ts`/`duplicates.ts`).

`toLocalDateString` confirmed **character-for-character output-equivalent**
to all three copies it replaces — a safe drop-in, not a subtly different
reimplementation.

### The two findings that change C2's shape — act on both

**1. `offsetDays` structurally cannot express month paging.** This is the
big one, and Captain demonstrated it against the real state model rather
than reasoning about it. `CalendarViews.tsx:89` holds
`useState(0)` for `offsetDays`, stepped by `view === "week" ? 7 : 1`. A
month is 28/29/30/31 days, so the only available third arm is "add
`daysInMonth(anchor)`" — anchor-dependent, therefore neither reversible nor
month-faithful:

```
Next ×5 from Jan 31 2026:  Jan 31 → Mar 3 → Apr 3 → May 3 → Jun 3 → Jul 3
months shown: Jan, Mar, Apr, May, Jun, Jul     ← February skipped entirely

Prev/Next round trip from Mar 31:  Mar 31 → Feb 28 → Mar 28   ← 3 days lost
```

The drift also leaks across a view switch (Month → Day opens a different day
than the user started on). **So `useCalendarPeriod.ts` is upgraded from
Fury's line-count contingency to a correctness requirement**, and it must own
a **typed period cursor** (`{ view, anchor }`, or a month-offset distinct
from a day-offset) — never a scalar day count. Placement is legal by direct
precedent: `src/lib/useToday.ts` is already a `"use client"` hook in
`src/lib/`.

**2. C2's boundary omitted `mealPlanDates.ts`, and Month cannot be built
without it.** Two vocabulary items Month needs do not exist anywhere in the
repo: `isSameMonth` (`grep` returns nothing) and **any full month name** —
`mealPlanDates.ts:56`'s `MONTH_NAMES` is the *abbreviated* set, and "Done
means" requires the title to read "September 2026". With no legal home, a
builder would inline a private `MONTH_NAMES_FULL` in a component —
**creating a fifth date-vocabulary duplicate in the very mission that spent
a whole contract collapsing four.** `mealPlanDates.ts` (99 lines, 251
headroom) is added to C2's boundary, append-only.

### Other notes, all routed

- **`EventForm.tsx:126`'s `daysBetween` → `calendarDayDiff` swap closes a
  latent hang**, not just a duplicate: `daysBetween` normalizes neither end
  and walks *forward only*, so `b < a` loops forever. A saved degenerate row
  — the exact shape `calendarDates.ts`'s V2 clamp exists to survive — hangs
  the render today. `calendarDayDiff` is signed and normalizes both ends.
  Identical for every non-degenerate input. **(K3 owns `EventForm.tsx`.)**
- **`monthLayout.ts:10`'s purity claim is literally false** — "no
  `new Date()`" while line 43 reads `new Date(anchor.getFullYear(),
  anchor.getMonth(), 1)`. The *code* is fine (component construction from a
  parameter is house discipline) and the `server-only` exemption is not at
  risk, but it is the same overclaiming defect class. Fix to "no
  zero-argument `new Date()`, no `Date.now()` — this module never reads the
  clock." Batched with the lane-continuity doc fix as **C1a**.
- **Build `MonthCell.tsx` from the start**, don't wait for it to "earn" a
  file: day number + today circle + adjacent-month muting + up to 3
  pills/bars with up to 3 bands each + ended dim + "+N more" + not-loaded
  glyph + ≥44px target is 80–120 lines. Folding it in produces the exact
  interleaved shape `DaySection`/`EventCard` were split to avoid.
- **`CalendarEmptyStates.tsx` — probably skip.** Captain's K1 note was
  conditional and the condition looks unlikely to fire: an empty Month cell
  is blank, not a `NoEventsCard`, and the out-of-window treatment is "the C4
  glyph, *smaller*" — a different rendering, not a shared component. A
  shared file with one consumer is worse than a private one. C2b reports
  which way it went rather than pre-committing.
- **Watch item, no action:** `src/lib/` will hold four calendar-ish modules.
  STRUCTURE.md permits a `src/lib/calendar/` subdirectory (`src/lib/voice/`
  the precedent). Flat is right at three or four; group at six, not now.

### Projected post-C2 tree (Captain's)

`CalendarViews.tsx` **~250–280, down from 307** — the extraction is
net-negative on that file, regaining the headroom Captain's standing K3
prediction says it will need. `useCalendarPeriod.ts` ~90–120,
`MonthGrid.tsx` ~70–90, `MonthCell.tsx` ~90–120, `mealPlanDates.ts` ~115.

## Fury's finding on C2b — the floating + occludes a real day cell

**Measured, reproducible, and it fails a stated "Done means" criterion:
"tapping a day number opens that day in Day view."**

At **scroll position 0 — the position the user lands on when opening Month
— Sunday Sep 27 is 65% covered by the `FloatingAddButton`, and its centre
tap point is intercepted by the button, not the cell.** `elementFromPoint`
at that cell's centre returns the FAB's own SVG path. Two October padding
cells (4, 5) are likewise centre-unreachable though barely covered.

```
scrollY 0 :  day 27 → 65.0% covered, centre NOT reachable   ← real September day
             day 28 →  5.2% covered, centre reachable
             day  4 →  1.3% covered, centre NOT reachable
             day  5 →  0.1% covered, centre NOT reachable
```

**The methodological point, which matters more than the bug.** My *first*
measurement was taken at the scrolled-to-bottom position, and it reported
**zero** unreachable cells — 9.6% and 0.8% cosmetic overlap on two padding
days, nothing more. Had I stopped there this would have shipped. The defect
exists only at the default scroll position. **Measure at the scroll position
the user actually arrives at, not merely at a convenient one.**

**Why C2b's own verification missed it, and it is not carelessness.** The
builder measured tap targets for **size** (min 44.42 × 78.5px — correctly
clearing the 44px floor) and the grid's clearance from the bottom nav (55px).
Both are true. Neither asks whether something is drawn *on top of* a target.
**Size and reachability are different properties, and this repo's tap-target
rule only ever named the first.** A 44px target under a floating button is
still a 44px target and still untappable.

**Fury's recommended severity: BLOCKER** — a stated done-criterion
demonstrably fails for at least one real day. **Strange owns the call and
the remedy**, since the fix is a layout decision with several honest options
(bottom-*right* for Month only — the A–Z rail reason for bottom-left is a
Recipes constraint that does not apply here; bottom padding on the grid so
the last row clears the FAB; or the FAB scrolling with content rather than
floating). Do not treat the list as prescriptive.

**Related, and worth Strange also ruling on:** the same FAB sits over Week
and Day views, where cards are full-width and tall, so the collision has
been harmless until now. Month is the first 7-column grid in the app, which
is why this surfaces here rather than being a K1 regression.

## Captain, C1a+C2a+C2b pass 1 — PASS (0 blockers, 11 notes)

Boundary audit clean against **HEAD** (the correct ruler — `main..HEAD` is 10
K1 commits, so `main` would be the wrong baseline). Every must-not-touch file
byte-identical, including `EventForm.tsx`, `EventCard.tsx`,
`calendarDates.test.ts`, actions and `prisma/**`. Gauntlet re-run: 164/164
both zones.

### The finding that must not be lost: the CI test glob is not recursive

```
package.json:11   "test": "… --test src/lib/*.test.ts src/lib/voice/*.test.ts"
.github/workflows/ci.yml:46   run: npm test
```

That glob is a **hand-enumerated two-directory list**. Moving any calendar
test into a `src/lib/calendar/` subdirectory would silently drop it from
`npm test` **and from CI**, and **the suite would still report green at a
lower count.** This repo has already been bitten four times by the gap
between "it ran" and "it's committed" (`recipeFilters.test.ts`) and once by a
TZ pin lost in CI. **Rule: the glob entry ships in the same commit as any new
test directory.** Folded into C3, which must stay flat rather than pioneer
the subdirectory as a side effect of a split.

### Captain disagrees with C2a on one premise, and it changes K3

C2a left the window-edge block in `CalendarViews.tsx` because moving it
"would risk a real regression" to the hardened C7 and skewed-clock
invariants. Captain's counter: **those invariants are today verified only by
adversarial browser runs — there is not one `node:test` case pinning them.**
`CalendarViews.tsx:163-214` is entirely pure over `(view, anchor, weekStart,
today, windowStart, windowEnd)` — no clock read, no state, no DOM. So
extracting it to `src/lib/calendarPaging.ts` is mechanical *and* makes those
invariants unit-testable for the first time: **lower risk than leaving them,
not higher.**

**Accepted, and recorded as K3's first contract** — standalone, before any
filter code, with red-then-green for the C7 direction-of-travel and
skewed-clock cases. Takes `CalendarViews.tsx` to ~285.

### The duplication ledger — net duplication did not fall

| target | status |
|---|---|
| `CalendarViews.tsx` `toDateParam` | ✅ collapsed (C2a) |
| `EventForm.tsx` `toDateInputValue` | deferred (K3) |
| `EventForm.tsx` `daysBetween` | deferred (K3) — **still carries the `b < a` infinite loop** |
| `PantryItemEditSheet.tsx` copy | out of scope, correctly |
| `hexToRgba` | **new, +1** (C2b) |

One collapsed, three deferred, one created. Ruling: **acceptable as shipped
— the duplication was forced by a boundary Fury wrote** (`EventCard.tsx`
must-not-touch, and it never exported the helper) and the builder documented
it in place rather than hiding it. But it **requires a follow-up contract**,
not a comment, because the fix must touch `EventCard.tsx`. Queued as C4.

### Fury's own miscount, corrected

Fury reported three files over the soft cap. There are **five**:
`recipes.ts` (437) and `pantry.ts` (372) were missing. All five are
pre-existing and untouched by K2, so nothing here is K2's — but the claim as
written was incomplete. `prisma/schema.prisma` (568) is exempt by rule.

### Fury's contract sizing, criticised fairly

Four boundary-forced compromises in one contract — `hexToRgba` copied,
`VISIBLE_LANES` doubled, the skeleton misplaced, and `openDay` walking
`step(±1)` in a loop because `useCalendarPeriod.ts` was off-boundary. Each is
individually defensible by a builder who flagged rather than hid. **Together
they say C2b's must-not-touch list was drawn one file too tight in three
places.** That is feedback on how Fury sizes boundaries, not on the builder.
The cheapest repair — `goToDay(day)` on the hook, replacing the step loop —
is one function.

### Other notes

- **The amendment says what Captain intended**, and the live-instances list
  is accurate at one entry. Verified `monthLayout.test.ts:185`'s
  `isOutsideWindow` case is **not** a second adoption — it's an integration
  test of C1's own output shape. C3 judged a sufficient repair.
- **`CalendarEmptyStates.tsx`: the builder's no was right**, verified rather
  than accepted — `NotLoadedCard` is a bordered card with 16px icon and two
  lines of prose; `MonthCell` renders a bare 10px glyph with no text. Genuinely
  different renderings sharing an icon import. The condition didn't fire.
- **`useCalendarPeriod.ts` placement legal**, `useToday.ts` precedent holds
  exactly; import graph is a DAG with no backward arrow; `server-only`
  correctly absent.
- **`src/lib/calendar/` still not yet** — calendar-only *modules* are three;
  `mealPlanDates`/`useToday` are shared and belong flat. Group at six modules.
- **C1a's fixes verified honest**; `createdByNames` gone repo-wide; C2a used
  *less* of its boundary than granted (`EventDetailSheet.tsx` needed no edit)
  — the right direction to miss in.

## Vision, C1a+C2a+C2b pass 1 — BLOCK (1 blocker, 6 notes)

Gauntlet re-run: 164/164 both zones, build 0. Boundary audit clean across all
four contracts. Every one of Fury's and the builder's numeric claims
spot-checked and **matched** (44.42×78.5px targets, 55.5px nav clearance,
347 lines, `calendarEvent` 3 / `user` 5).

### BLOCKER — the FAB, worse than Fury measured

Fury found that at 375×812 the *cell centre* of Sep 27 was intercepted while
the day number still worked. **Vision reproduced that and then found the real
failure one device-size down.** At **375×667 (iPhone 8/SE)**, the day
**number itself** is unreachable — and the tap does something actively wrong
rather than nothing:

```
375×667, Month, scrollY 0, real CDP Input.dispatchMouseEvent on "20" at (31,586)
elementFromPoint → Add
result → {"title":"September 2026","dialog":"Add"}
        ↳ the Add sheet opens. Day view never does.
```

Proven with a **real hit-tested click**, not `elementFromPoint` alone and not
`.click()`. Affected: 375×667, 375×812, 320×568, 1024×768. **Unaffected:**
768×1024 (the wall tablet — the FAB sits 137px below the grid) and kid
sessions (no FAB at all). Recoverable by scrolling, but a tap on a real
current-month day number opening the wrong sheet is wrong behaviour on the
household's primary device class, against the single criterion that makes
Month a navigation surface.

**Acceptance test for whatever remedy Strange chooses** — Vision's wording,
to be written into the fix contract verbatim:

> at scrollY 0, for **375×667, 375×812 and 320×568**, `elementFromPoint` at
> the centre of every in-viewport cell's **day number** must return that cell.

Reusable script: `scratchpad/fab.mjs`. Vision also suggests Captain consider
extending the tap-target rule with **"and unoccluded at the arrival scroll
position"** — size and reachability are different properties.

### Everything else in "Done means" verified

Switcher, six-row grid with muted adjacent months and the today circle, ≤3
pills + "+N more", the 3-day bar continuous **across a week break**
(`Sep 11 [L-] → Sep 12 (cont)[--] → Sep 13 [-R]`), ≤3 colour bands, ended-event
dimming, month paging with window-edge honesty (Prev disabled at July, Next at
October, Jun 30 and Nov 1 glyphed, Jul 4 correctly *not* glyphed), nav
clearance 55.5px, `body.scrollWidth === innerWidth` at 320/375/768/1024, and
Nov 2026's 30 consecutive dates.

**C2a's cursor re-verified in the running app now that Month uses it:**
Prev∘Next returned **42 identical labels**; Month→Day→Week→Month→Day preserved
Sep 15 throughout; Day still +1, Week still +7.

### Notes

- **`openDay`'s step-walk is correct** — simulated against the real pure
  functions modelling React's functional-update queue across **every day of
  2026 × 7 month offsets × all 42 cells = 107,310 taps, 0 failures**, both
  timezones. Max |delta| 41, so at most 42 queued updaters. The only misfire
  needs two taps in **one JS task**; with even a `setTimeout(0)` between them
  the Month cells are already unmounted, so no human can produce it. A
  `goToDay(date)` on the hook would remove the loop and the closure
  dependency — folded into C4.
- **Stale comments, the repo's tracked overclaim class again** —
  `useCalendarPeriod.ts:47-50,200-202` ("no UI offers Month yet", "headless
  plumbing only"), `CalendarViews.tsx:71`, `page.tsx:26-27` ("no Month view
  yet"). All false as of C2b. The hook was off C2b's boundary, so a C1a-style
  doc-only contract is the right vehicle. **This is the third time this
  mission has hit this class.**
- **`MonthLoadingSkeleton`'s reachability argument is TRUE** — verified
  independently, including a citation from Next's own docs that
  `router.refresh()` preserves state without remounting, so the post-delete
  refresh never re-shows the fallback. The comment is honest; the export is
  still dead. **Wire it behind a persisted view or delete it** — C4 moves it.
- `pillBackground`'s comment says "Up to THREE" but the cap actually lives in
  the caller (`MonthCell.tsx:128`'s `slice(0,3)`). Behaviourally fine,
  mildly misleading comment.
- **Vision's own light-mode screenshots came out dark** — the Mac is in dark
  mode and its driver only forced dark, never light. Measurements are
  theme-independent, but **Strange's light/dark pass genuinely still needs
  doing.** Recorded because an unflagged "I checked both themes" would have
  been exactly the overclaim this mission keeps catching.

## Strange, C2b pass 1 — BLOCK (4 blockers, 8 notes)

**Theme was set explicitly in both directions** via `Emulation.setEmulatedMedia`,
never inherited from the host OS, and Chrome's `--force-dark-mode` (which
Vision's driver used) was deliberately **not** used — it inverts the app's own
theme and gives a false reading. Proof the runs differ: light `body`
`rgb(246,240,232)` / `--surface #fff`; dark `rgb(28,27,22)` / `#262420`. This
is the light/dark pass Vision correctly said had not been done.

### B1 — the FAB. Strange tested all three floated remedies rather than picking one

| Candidate | Result (Vision's acceptance test, 5 viewports) |
|---|---|
| Bottom-**right** (Month-only or Calendar-wide) | **FAILS** — 375×667: `Saturday, Sep 26` → `Add`. The FAB is 56px, **wider than a 44.42px cell**, so it reaches the number's x-range even in the rightmost column. The "day numbers are top-left so a right-hand button misses them" intuition is simply false at phone width. |
| 200px bottom padding on the grid | **FAILS**, unchanged. A `position: fixed` overlay sits at a fixed *viewport* y; **document padding cannot move what is under it at scrollY 0.** The intuitive fix, and structurally incapable of working. |
| No floating overlay on this surface | **PASSES** — 0 day-number failures at all five viewports, both themes. |

Month-only placement also **rejected on principle**, citing `DESIGN.md`'s own
nav rule ("its tabs never change as you move — only which tab is lit"): an Add
affordance that jumps left→right between Day and Month is the dishonesty Fury
asked about. The bottom-left rule's stated reason — Recipes' A–Z rail owning
the right edge — is a Recipes constraint that neither justifies nor forbids
anything here.

**Remedy (implementable without further design judgement):** remove
`FloatingAddButton` from the **Calendar branch, all three views**; add a third
`ActionCircle` to `CalendarHeader.tsx` (`Plus`, label "Add", rendered only when
a new `canManage` prop is true, so kid sessions still show two circles and
`justify-center` stays balanced). `FloatingAddButton.tsx` itself is
**unchanged** — Recipes and Family keep it. No new component; `ActionCircle` is
already the branch's header vocabulary. Measured on the rendered remedy: three
56px circles with `gap-10` = 248px inside a 288px row at 320px; no overflow at
320/375/768; **0 hit failures everywhere.** Cost stated plainly: Add leaves
thumb reach and scrolls with the header — the right trade on a reading
surface, and the only option measured to work.

### B2 — the multi-day bar is NOT one continuous bar (a "Done means" failure Vision's check could not see)

Vision verified the **rounding logic** (`[L-] → [--] → [-R]`) and it is
correct. **The pixels are what fail.** Measured at 375px: each segment is
**36.4px wide, separated by 11.9px of page background — a 33% break** — from
`ROW_CLASS`'s `gap-1` plus each cell's `p-1`.

Also a semantic falsehood, not merely an unmet criterion: three week-long
events render as **21 discrete chips**, and since only a span's leftmost
column carries a label, **18 are unlabelled colour**. A parent looking at Sep 24
sees three anonymous blocks. The UI says "three separate somethings"; the
truth is "one event, continuing."

Fix: drop the horizontal gap on the day-row `ROW_CLASS` (keep the vertical
gap), and give `MonthCell`'s slot track `-mx-1` so pills reach the cell edges
while the day number and "+N more" keep their padding. Side benefit: pill
width 36.4 → ~53px, which materially helps B3.

### B3 — a title renders **2 characters** at 375px, and that defeats the lane-jump defence

Measured against the real rendered font: at 375px only **2 characters** fit —
`"Temple" → "Te…"`, `"Camping Trip" → "Ca…"`, `"Ledger Pre-School" → "Le…"`.
At 768px 9–10 fit and the design genuinely works. `DESIGN.md`'s coverage rule
is **375px always**; the phone is a primary device, not a fallback.

**This is also Strange's ruling on the lane jump Fury and Vision flagged.**
The jump is **honest in principle** — `MonthCell`'s own comment justifies
re-labelling at the start of every row "so a family scanning a continuation
row isn't left guessing which bar is which." But Strange staged and
photographed the jump: two different bars both render as `"ZZZ …"`.
**Truncation destroys the exact mechanism that makes the jump readable.** Two
events sharing a two-letter prefix ("Ledger Pre-School" / "Ledger soccer")
become indistinguishable — worse than an unlabelled bar, because it looks
like information.

Fix (builder's choice, both honest): (a) at phone width, a colour bar with no
text, letting "+N more" and the day tap carry identification — what Google and
Apple do on a phone month grid; or (b) render the title only when the pill can
hold a useful minimum (~6 chars), falling back to (a). **Do not shrink the
font** — 9px is already the smallest type in the app.

### B4 — the empty trailing slot reads as a rendering bug (answering Fury's question: yes)

Reproduced at Sun Sep 20 / Mon Sep 21: two pills, a 16px hole, then "+1 more"
— directly beside Sep 22 where all three are filled *and* it also says "+1
more". The count is right and `monthLayout.ts` is not challenged. But in dark
mode, where pills are visibly raised chips, the missing chip reads as a hole.
Fix in `MonthCell.tsx` alone, touching no lane arithmetic: **stop reserving
trailing empty slots** so "+N more" sits under the last pill. **Interior gaps
must still render**, or bars would slide vertically between columns.

### Notes

- **Ended-event treatment honours the K1 instruction, with one gap:** past
  `--muted` + band alpha 0.05, live `--fg` + 0.10, no opacity, no
  `line-through`. But `font-weight` is **500 for both** — `EventCard` drains
  600→500 and Month has nothing to drain. Consider `font-semibold` on live
  pills to restore the same delta.
- **Contrast passes AA everywhere** (worst case light past **5.00:1**, dark
  past 5.80:1; "+N more" 4.75:1 light). **Do not "fix" truncation by lowering
  contrast.**
- **`text-[9px]` is now the smallest type in the app** (previous floor 10px).
  Relevant to a wall tablet at arm's length.
- **The 135° two-band gradient reads as an artifact at pill size** — at
  36×16px the diagonal becomes a triangular wedge that looks like broken
  graphics. Correct alphas inherited from `EventCard`, but that component is
  full-width and tall where a diagonal reads as a sash. Consider vertical
  bands or a left-edge stripe at this size.
- **Three states: honest and legible, keep as-is.** Staged an Oct 28 → Nov 3
  event against a window ending Nov 1: Nov 1–3 carry **both** a bar segment and
  the glyph, Nov 4–7 the glyph alone, in-window empties blank.
- **The Nov 2026 DST month is not reachable in the running app** — `page.tsx`
  fetches ±60 days and takes no `searchParams`, so Next is correctly disabled
  at October. The Brief's DST item is a **library-level claim (C1's tests)**,
  not something any gate can screenshot today. Strange: "I could not
  photograph it and am not claiming I did."
- **320×568 cells are 36.56 × 78.5px**, under the 44px floor on one axis —
  outside `DESIGN.md`'s stated 375px coverage width and unfixable with seven
  columns without horizontal scroll. Recorded, not blocking.
- **No horizontal overflow** at 320/375/768/1024, both themes, measured with
  `body.scrollWidth`.

### Proposed `DESIGN.md` amendment (Strange's constitution, Strange's to draft)

> **A target must also be unoccluded.** At the scroll position a user arrives
> at, `elementFromPoint` at the centre of every visible interactive control
> must return that control. Size and reachability are different properties — a
> 44px target under a floating button is still 44px and still untappable.
> (Month, mission-9: the grid's day numbers passed every size check while one
> of them opened the Add sheet.)

## Vision, C5 pass 2 — PASS (0 blockers, 5 notes). Blocker RESOLVED.

The pass-1 blocker is dead: at **375×667** the real hit-tested click on
"Sunday, Sep 20" that previously opened the Add sheet now opens **Day view**;
same at 375×812 (Sep 27) and 320×568, **both themes**, **0 occlusion failures
across all 42 in-viewport cells**. Theme proven per run by body background
(light `rgb(246,240,232)`, dark `rgb(28,27,22)`), and Vision's own driver
passes no `--force-dark-mode` at all this time.

**The FAB-removal regression hunt — the riskiest part of C5 — came back
clean across three branches.** Manager end-to-end through the new trigger:
Add circle → sheet `{Event, Meal}` → `/calendar/new` → typed → saved →
appears in Week *and* in Month's Sep 2 cell. Kid session, all three views:
`circles ["Today","Month"]`, `addByText 0, addByAria 0, plusSvgs 0` — **no Add
control in the DOM at all**, not CSS-hidden — and a direct `GET
/calendar/new` as the kid **redirects to `/calendar`**. Recipes and Family
both still render their own 56×56 FAB, `elementFromPoint` returns it, and a
real click opens each sheet.

**B4 confirmed to be rendering-only**, on a deliberately staged row:
`Sep 13 → [Week Bar (L0), {SPACER}, Two Day (L2)]` — **interior gap
rendered**; `Sep 19 → [Week Bar]` — **trailing empties dropped**; and lane-2
vertical alignment identical across the gap (y 497.5 vs 497.5), so bars do
not slide between columns. `monthLayout.ts` byte-unchanged.

### Notes

- **The accessibility gap is real, confined, and a NOTE.** Verified against
  Chrome's own accessibility tree, not inferred: at 375px the number of
  non-ignored AX nodes naming "Camping Trip" in Month is **0** (Week view: 9);
  at 768px the title *is* exposed. Concrete scenario: a VoiceOver user on a
  phone hears "Open Thursday, Sep 3, button" for every cell and **cannot tell
  a day with three events from an empty one** without opening each. Severity
  NOTE — no gauntlet, boundary, or "Done means" failure, and the same class as
  K1's delivered Week-swatch note. Cheapest remedy shape (**Strange's call**):
  fold event count/titles into the cell's existing `aria-label`; no new DOM.
- **With titles gone below 768px, a pill's only signal is a 0.10-alpha tint**,
  and in the light-theme 375 screenshot the bars read faint against
  `--surface`. Strange measured contrast for the *text*, which no longer
  renders at that width — so whether a text-free bar at that alpha reads
  clearly is an open **Strange** question, not a correctness failure.
- `scratchpad/cdp.mjs` (tooling, not source) still passes `--force-dark-mode`
  on its dark path. Vision probed it side by side against a clean driver:
  both read `rgb(28,27,22)`, so the flag was harmless *here* (Chrome skips
  auto-dark on a page that already honours `prefers-color-scheme`) and the
  builder's dark evidence stands — but the flag should be deleted before it
  misreads a page that doesn't.
- **Vision caught this file's danger register still carrying K1's stale
  "local throwaway Postgres, port 5433" text.** Fury had corrected it earlier
  in the session, announced it as done, and the correction was **lost to a
  later write** — never re-verified. No agent was actually misled (Fury's
  dispatch briefs carried the correct environment every time), but the claim
  was false while it stood. **Rewritten again at pass 2, louder, naming the
  stale markers so a future reader can detect a reverted copy — and verified
  by grep after writing this time.** Same claimed-but-not-durable defect class
  this repo has hit five times; this instance was Fury's.
- `CalendarHeader.tsx:87`'s Add circle has no `aria-label` (its accessible
  name comes from the visible "Add" span, which is fine) — but
  `helpers.js`'s `fab()` selector (`button[aria-label="Add"]`) now matches
  nothing on Calendar, so future scripts reusing it would silently report
  "no FAB" rather than "FAB removed".

**Test-data accounting:** 9 rows created, all `ZZZ`-prefixed, all deleted
**by id** (never by broad title match); `User` untouched at every read; final
`{calendarEvent: 3, user: 5, zzzStrays: 0}` by two independent reads.

## Strange, C5 pass 2 — BLOCK (2 new blockers). All four pass-1 blockers RESOLVED.

B1 resolved (0 FABs; three 56×78 header circles; 0 occlusion failures at the
**terminal** scroll position, all three viewports, both themes). B2 resolved
and measured on a staged 7-day bar: **all six inter-segment gaps exactly 0**,
segment width 36.4 → **47.86 (+31%)**. B3 resolved. B4 resolved with both
halves proven — trailing empties dropped, and a forced interior gap kept lane
alignment identical across columns (y 723.75 vs 723.75).

### B5 — the text-free pill fails contrast. BLOCKER.

Strange sampled the **rendered pixels of all 55 visible pills**:

| theme | worst | best | below 3:1 |
|---|---|---|---|
| light | **1.00:1** | 1.06:1 | **55 / 55** |
| dark | 1.17:1 | 1.24:1 | **55 / 55** |

In light theme a 10%-alpha mid-tone over `#fff` lands at **the same relative
luminance as the cream page** — only hue separates them. **This is the exact
defect the rebrand session already fixed once**, when Inventory's Out and Low
badges were separated by hue alone at 1.20:1.

**Why it is this contract's:** the fill is now the *sole* carrier of "an event
exists here". WCAG 1.4.11 wants 3:1 for a graphical object needed to
understand content. Before C5 the title carried it at a measured 5.00:1, so
the faint fill was cosmetic — **B3 promoted the fill to load-bearing without
re-measuring it in its new job.** Nor is it phone-only: only a span's leftmost
segment is labelled, so a 7-day bar on the **768 wall tablet** is one label
plus six segments at 1.00:1.

**Two dead ends already measured, so no pass is wasted on them:** raising fill
alpha fails (**1.51:1 even at α 0.40**), and `--line` is 1.24:1 light.

**Fix, prototyped and re-measured:** a **1px solid border at full opacity** —
`border-y` always, `border-l`/`border-r` gated on the **existing**
`roundLeft`/`roundRight` flags, so continuity is preserved for free (gaps
re-measured **still exactly 0**, height still 16px under `border-box`).
`border-fg` live (**6.96:1** light / 15.23:1 dark), `border-muted` past
(4.75 / 6.81). Bonus: this restores K1's ended-event dimming to something
*visible* at phone width, which today is a 0.05-vs-0.10 alpha delta — i.e.
invisible without text. **Do not use the person's own colour at full
opacity: four of the eight `AVATAR_COLORS` fail on the dark background**
(purple 2.63, slate 2.49, red 2.85, teal 2.95).

### B6 — the accessibility blackout is a regression C5 introduced. BLOCKER.

Strange **departs from Vision's NOTE**, with a reason:

| surface | AX nodes naming an event |
|---|---|
| Month @ 375 | **0** |
| Month @ 768 | 24 |
| Week @ 375 | 24 |

Pass 1 measured titles *rendering* at 375, so they were in the DOM. C5 wrapped
them in `hidden md:inline`, and `hidden` is `display:none`, **which strips them
from the accessibility tree**. All 43 cell nodes read `Open <weekday>, <date>`
— byte-identical for an empty day and a five-event day. The interface asserts
sameness where there is difference.

Grounded in `DESIGN.md`'s own settled position, quoted: **"Every action button
is real markup — reachable without the gesture (keyboard, screen reader)."**
Strictly worse than K1's delivered Week note, which lost *who*, not *what*.

**Fix — one class, no new DOM, cheaper than an `aria-label` rewrite:**
`hidden md:inline` → **`sr-only md:not-sr-only md:inline`**. `sr-only` is
absolute + clip, contributing nothing to layout, so **the phone view stays
pixel-identical** while the title returns to the AX tree at every width.

### Strange corrected its own pass-1 measurement — worth noting

Its pass-1 "only 2 characters fit" was measured on the **pre-B2 36.4px** pill.
B2 widened it to 47.84, and nobody re-measured the premise the breakpoint was
chosen against. Now:

| width | cell | chars |
|---|---|---|
| 375 | 47.84 | **8** |
| 430 | 55.7 | 10 |
| 744 | 100.6 | 17–20 |

**375px now clears Strange's own "~6 char" threshold** — forced on at 375,
"Temple" renders in full. So `md` (768) withholds usable labels across the
whole 375–767 band, **including iPad mini portrait at 744px**. Kept a **NOTE,
not a blocker**, on the principled ground that withholding information is not
asserting a falsehood and Strange authored option (a) itself. Recommendation:
move the breakpoint `md:` → **`sm:` (640)**.

### Notes

- **The 135° two-band gradient is now the entire pill** and reads as broken
  graphics — at 47.86×16 the diagonal is a triangular wedge resembling a
  hatched/disabled pattern rather than "two people". Honest, so a NOTE, but it
  belongs in the same pass as the border fix. Consider vertical bands or a
  left-edge stripe at this size.
- **Dark theme reads materially better than light** (1.17–1.24 vs 1.00) — and
  **light is the default the family sees in a bright kitchen**.
- 320×568 cells are 40×82px, under the 44px floor on one axis — unchanged,
  outside the 375 coverage width, unfixable at seven columns. Recorded.
- No horizontal overflow at 320/375/768, both themes.

### The `DESIGN.md` amendment, revised — Strange found its own pass-1 wording over-triggered

A fixed bottom nav occludes below-fold content at scrollY 0 on *every*
scrollable page here, which is normal. The distinguishing measured fact: at
the **terminal** scroll position the nav clears the last cell by 55px, whereas
at 375×812 `maxScroll` was **1px** and the FAB still occluded Sep 27 — there
was nowhere to scroll to. Revised text:

> **A target must also be unoccluded.** For every interactive control, there
> must exist a scroll position the user can actually reach at which
> `elementFromPoint` at the control's centre returns that control. A fixed
> overlay the page reserves no room for — a floating action button, a toast, a
> sticky banner — fails this even at 44px, because no amount of scrolling
> moves what sits at a fixed viewport y. The bottom nav passes because the
> page reserves bottom padding for it (measured: 55px clearance at 375 and
> 320). Size and reachability are different properties.

**Strange argues C5 makes the amendment MORE necessary, not less:**
`FloatingAddButton` still ships on Recipes and Family, so the same collision
recurs the day either grows a dense grid. **The remedy fixed one instance; the
rule prevents the class.**

## Captain, C5+C6+C7 pass 3 (final) — PASS (0 blockers, 11 notes)

Gauntlet re-run independently, **including a genuinely-UTC run**: tsc 0,
eslint 0, build 0 (`/calendar` still `ƒ` dynamic), **180/180** both ways.

**Methodological catch worth keeping:** `package.json:11` pins `TZ` *inside*
the script, so **`TZ=UTC npm test` silently runs Denver twice.** The
both-timezones claim only holds via the direct
`TZ=UTC node --import tsx --test …` invocation — which is what Fury and the
builders ran, so the claim stands, but future reports should name the exact
command rather than saying "both timezones".

**Boundary audit clean across all three contracts**, separated by mtime
windows: C5 = `MonthGrid` 15:22 / `CalendarHeader` 15:23; C7 = `MonthCell`
16:40 **only**; C6 = exactly its six granted files. `EventForm.tsx` (350, at
the cap) and `EventCard.tsx` are byte-identical to HEAD **across the entire
branch**, not merely these contracts.

### Ruling 1 — `periodWindowEdges` is dormant, not the same as `MonthLoadingSkeleton`, and it orphaned a third thing nobody noticed

`periodWindowEdges` is dead in the app — and so, **transitively, is
`calendarDates.ts:250`'s `canStepToPeriod`**: a public lib export with **no
application caller and no test in its own home file**. Its only assertion
anywhere is a control case in `calendarPaging.test.ts:112`. A reader opening
`calendarDates.ts` cannot learn it is dormant; the honesty note lives two
files away.

Not the same category as `MonthLoadingSkeleton`, which is dead **and
misplaced** (a route-segment file's second export whose only plausible
consumer would create an illegal `components → app/` arrow). `periodWindowEdges`
is dead but **correctly placed, pure, fully tested**, with a documented
revival path. `STRUCTURE.md` has no rule against dead exports, so neither can
back a BLOCKER — and Captain already routed `MonthLoadingSkeleton` to C4 as a
NOTE, so consistency requires the same here.

**Captain parts company with the builder on one point, and is right to.** The
contract said *"`isOutsideWindow` and the not-loaded glyph stay … retire only
its use as a wall."* The machinery still live is `isOutsideWindow`
(`MonthGrid.tsx:128`, `CalendarViews.tsx:273`) — correctly preserved.
**`periodWindowEdges` *is* the wall**, so retiring its use as a wall is
retiring it. The builder over-preserved. Defensible (it is exactly what a
future hybrid needs, and it is now tested for the first time) but it needs an
expiry rather than drift.

### Ruling 2 — the client `loading.tsx` is legal, verified against Next's own docs

`node_modules/next/dist/docs/…/loading.md:34` explicitly permits
`"use client"` in a `loading.tsx`, and the `useSearchParams` build caveat
does not apply because `/calendar` is `ƒ` dynamic — confirmed by build output,
not asserted. It remains the only client `loading.tsx` of eight and the only
one with two exports; the illegal-arrow risk is **unchanged, not worsened**,
and C6 actually made the eventual repair cleaner by factoring
`MonthGridSkeletonRows` out. **But C4's repair #3 as written now moves an
empty wrapper and leaves the real markup behind — its text needs updating.**

### Ruling 3 — 339 is acceptable; 11 lines will not survive K3

Under the 350 soft cap, so no rule is violated, and reporting the real number
rather than the hoped-for one was right. But Captain's standing 350–380
prediction now reads optimistic. The natural seam is **the URL/navigation
cluster C6 itself added** — `navigateTo`, the URL→local effect, `handleStep`,
`handleToday`, `handleSetView`, `openDay` (~57 cohesive lines composing
`useCalendarPeriod`'s pure functions plus `router`/`searchParams`; a client
hook in `src/lib/`, precedented by `useToday.ts` and `useCalendarPeriod.ts`).
That yields ~285 and hands K3 **65 lines instead of 11**. Recommended as
**K3's first contract**, standalone before any filter code — the same shape
that worked for folding Captain's C2-1 recommendation into C6.

### Ruling 5 — the duplication ledger moved BOTH ways

- ✅ **`VISIBLE_LANES` resolved for free by C5** — `grep` finds one
  declaration (`MonthGrid.tsx:11`); B4's rewrite made `MonthCell` derive from
  `slots.length`. **Strike repair #2 from C4.**
- ❌ **New duplication, and not cosmetic:** the same `?date=` parameter is
  validated twice, by the same producer.
  `calendarPaging.ts:61` is strict (shape **+ semantic round-trip**);
  `src/app/(app)/calendar/new/page.tsx:43` is **shape-only** and therefore
  **accepts `2026-02-30`**, handing it to `EventForm` to roll over
  client-side — the exact case `parseDateParam` exists to reject, and K1's own
  C8 note. C6 wrote the strict one and left the weak one because
  `new/page.tsx` was off its boundary — identical shape to `hexToRgba`, so
  identical ruling: acceptable as shipped, documented not hidden, **needs a
  contract**. Routed to C4.
- Placement of `parseViewParam`/`buildCalendarSearch`/`buildFetchWindow`
  confirmed correct; dependency direction holds; `server-only` correctly
  absent (both a Server and a Client Component import it, and it is pure).

### Ruling 6 — flat at four modules; the glob exposure grew 28%

Calendar-only modules are now four. Threshold unchanged: flat at four, group
at six (K3's filters make five). But the test-glob trap is **more**
load-bearing: the five lib test files now hold **74 of the 180 tests**. A
`src/lib/calendar/` directory introduced without the matching
`package.json:11` glob entry would silently drop all 74 **and the suite would
still report green at a lower count.**

### Ruling 7 — live-instances list still accurate at one entry

`calendarPaging.test.ts:112`'s `canStepToPeriod` assertion is a **control
case**, not a second adoption. But **`canStepToPeriod` has no dedicated test
in its own home file** — pinned only incidentally from another module. C3
must either give it real cases at home or delete it alongside
`periodWindowEdges`. It should not stay exported, uncalled, and untested where
it lives.

### Three more stale comments — the "reasoning that outlived its evidence" class

- `MonthCell.tsx:167` — the ~2-characters rationale Fury flagged; **C7 did not
  take it.** C4 touches this file: fix it there and decide `md:` → `sm:` in
  the same pass, rather than leaving the argument and the evidence pointing
  opposite ways.
- `CalendarViews.tsx:184` — cites "loading.tsx's own Week-shaped fallback
  never needs a Month shape"; C6 gave it one in the same contract. The
  conclusion still holds; the cited reason is contradicted by its sibling.
- `useCalendarPeriod.ts:229` — "`view` only ever becomes 'month' through
  `setView`"; C6 added `jumpTo`, which can too. The safety property survives
  (`jumpTo` also routes through `withView`) but the sentence names the wrong
  mechanism.

### ⚠️ The finding Captain most wants acted on before K3

**The Month skeleton is measured against geometry C5 changed hours earlier —
in two places** — while `loading.tsx`'s own header asserts every height is
*"MEASURED against the real signed-in page … not guessed."*

1. **Column gap:** `loading.tsx:129` renders `grid grid-cols-7 gap-1 px-1`;
   the real `ROW_CLASS` (`MonthGrid.tsx:22`) is `grid grid-cols-7 px-1` —
   **C5's B2 removed that gap deliberately.** Skeleton cells are narrower than
   real ones.
2. **Cell height:** `loading.tsx:131` uses `h-[78.5px]`, derived from "three
   16px pill slots" always rendering. **C5's B4 made that conditional**
   (`MonthCell.tsx:143`), so a day with no events now renders the day-number
   row alone. With three real events in the household, most of a real month is
   short cells; the skeleton is 42 cells at a pre-C5 tall height.

Captain explicitly did **not** measure this in a browser and claims no pixel
figure — it is derived from the two cited source lines, but the direction is
unambiguous. It now fires on **every** Prev/Next rather than once at first
load, and it partly undercuts C6's own stated reason for making the file a
Client Component. **Vision or Strange should size it; the repair belongs in
C4**, which already owns `loading.tsx`.

Cheaper and related: `loading.tsx:72-75` renders **two** action circles; since
C5 an admin session renders **three**. Row height is pinned either way so
there is no shift, but that provenance is stale too.

### Proposed `STRUCTURE.md` amendment (Captain's, for Bryce to approve)

> **A lib export with no application caller is dormant, not dead — but it
> must say so.** Keeping one is allowed when a named future consumer
> justifies it; the export carries a comment naming why it is dormant and
> what would revive it, and any function it in turn orphans carries the same
> note at its own definition. Two consecutive missions with no caller means
> delete it and its tests; a hypothetical consumer that never arrives is not a
> reason to maintain code.

## Vision, C6+C7 pass 3 (final) — BLOCK (1 blocker). ⚠️ GATE BUDGET EXHAUSTED.

**C7 passes on its own evidence.** Independently confirmed: 0 of 11 pills
below 3:1 (light worst border 4.75:1, dark 6.81:1); AX nodes naming an event
at 375px **8** (was 0); all pill heights `[16]`; inter-segment gaps `0` with
`br:0 / bl:0` on shared edges; label spans `absolute/1×1` at 375 and
`static/inline` at 768. Boundary verified by diffing the live file against the
builder's own pre-edit copy: **exactly two class strings changed**, plus
comments.

### BLOCKER — C6's resync effect cancels every optimistic step

`CalendarViews.tsx:132-139` with `useToday.ts:45`. `useToday()` returns
`new Date(timestamp)` — **a fresh object on every call** — and that object sits
in the effect's dependency array `[searchParams, today]`. So the URL→local
resync effect runs on **every render**, not only when the URL changes.
Immediately after `handleStep` calls `step()`, and *before* `router.push`
commits, the effect compares the already-stepped local anchor against the
**unchanged** URL, finds a mismatch, and `jumpTo`s back.

Measured (`TZ=UTC` prod build, 375px):

```
single tap: {t:4,  "April 2028", url ?date=2028-03-15}
            {t:6,  "March 2028", url ?date=2028-03-15}   ← reverted 2ms later
            {t:1518,"April 2028", url ?date=2028-04-15}   ← only when the server answers
```

Nothing on screen changes for the whole round trip — so the tap looks dead
and **invites a second tap**, which recomputes from the *old* period:

```
double tap, 1500ms latency, 150ms apart → "April 2028"   (one step lost)
double tap, NO throttling,    60ms apart → "April 2028"   (still lost)
Week view, two Next taps                 → "Mar 19–25"    (+1 week, not +2)
```

Against Vercel from a phone (200–600 ms RTT) an ordinary double-tap lands
inside this window **every time**.

**Fix:** key the effect on *values*, not identities — read
`searchParams.get("date")`, `searchParams.get("view")` and
`today?.getTime()` into locals and depend on those, parsing inside the effect.
Recommended on top: record the search string `navigateTo` just pushed in a ref
and skip the resync while it matches, so two in-flight pushes can't bounce
May→April→May. **`useCalendarPeriod.test.ts` cannot catch this** — it is a
React-integration bug in pure-function-correct code.

### ⚠️ Fury's timing numbers were measuring this bug, not the design

Fury reported **1213 / 240 / 763 ms** per month step and told Bryce it was a
real performance tradeoff of C6's design. **It did not reproduce as design
cost.** Vision measured: dev RSC payload ~0.10 s, prod build ~0.095 s, the
Neon range query alone `[283 cold, 67, 66, 66, 68, 66] ms`, and
browser-perceived URL change per step on the prod build **107 / 124 / 192 ms**.
Fury's figures were the *revert-then-wait* window this blocker creates.

**Vision's timing judgment: acceptable, not worth blocking, once the blocker
is fixed** — the tap then renders instantly from local state and the round
trip only refreshes events, and the previous window already covers the
adjacent period (the grid reaches ±37 days inside a ±61-day window), so even a
stale payload is correct for one step. If a step-locally hybrid is ever
wanted, Next documents `window.history.pushState` integrating with
`useSearchParams` **without** a server render
(`node_modules/next/dist/docs/…/04-linking-and-navigating.md:343-362`) — that,
not `router.push`, is the mechanism.

### Notes

- **`loading.tsx:13-27`'s comment is false — the seventh overclaiming comment
  this mission.** It claims the skeleton "now ALSO fires on every real
  navigation … (Prev/Next, Today, a view switch)". Measured with a
  MutationObserver across all three, with and without 1.5 s latency:
  **`statusSeen: 0` every time.** A same-route search-param push is a
  transition over an already-mounted Suspense boundary; React keeps the old
  UI. **This materially softens Captain's skeleton-drift finding** — the drift
  is real but the skeleton does not in fact fire on paging.
- `MonthCell.tsx:167` — measured live: inner width **38px**, `500 9px Inter`,
  **7 characters fit at 375** (20 at 768). So the "~2 characters" rationale is
  false by either measure (Strange said 8, Vision 7). Fix to the measured
  number; the `md:`→`sm:` decision is Strange's/Bryce's, not a gate call.
- `page.tsx:36`'s `searchParams: { date?: string }` **is a lie at runtime** —
  Next hands `string[]` for repeated keys. `?date=X&date=X` makes the server
  coerce to `"X,X"`, fail the regex and centre on today, while the client's
  `.get()` takes the first → **42 not-loaded glyphs, 0 pills**. Hostile input
  only and self-healing on the next tap. Cheap fix: normalize
  `Array.isArray(date) ? date[0] : date` once, so both sides agree. **This is
  also the live proof that `isOutsideWindow` and the glyph survived
  `periodWindowEdges`' retirement** — 0 glyphs on every legitimate step.
- A far deep link costs one day-by-day loop: `9999-12-31` ≈ 2.9M iterations,
  ~320 ms in Node / ~100 ms page wall, once. Years 0100–0999 are rejected by
  accident (`toLocalDateString` doesn't pad the year). Recording the bound.
- **Validation held against everything else thrown at it:** `2026-02-30`,
  `2026-04-31`, `2026-13-01`, `2026-00-10`, `2026-01-00`, trailing `\n`,
  `%0A`, `../../etc/passwd`, `'; DROP TABLE--`, `275760-09-13`,
  `view=bogus` — all rejected cleanly. Back/Forward/Reload each landed on a
  title matching `?date=`, with no remount. Under the UTC server, a Friday
  7–9:30 PM event (01:30 UTC Saturday) still rendered under **Fri 4** — the
  browser is deciding the day, exactly as C6 claimed.
- **The "red" in C6's red-then-green was module-not-found**, which proves only
  that the import resolves. What makes those tests load-bearing is the inline
  naive-formula sanity assertions beside each. Adequate — but say that rather
  than "red-then-green".
- **Every K2 file (C1–C7) is still uncommitted** — 11 modified + 9 untracked,
  and `origin/main..HEAD` holds only mission-8 commits. Not a C6/C7 defect,
  but the exact finished-but-uncommitted trap this repo has hit four times.

## Vision, C8 pass 4 (Bryce-authorized extra) — BLOCK. Original blocker RESOLVED.

**The pass-3 blocker is dead.** Value-keying works: on a **prod build** a
single tap flips in **2–4 ms** with no revert (Fury's 26 ms was dev-server
cost), and every multi-tap case lands right — double @60ms → May 2028, triple
@40ms → June, quad @30ms → July, URL agreeing each time. Acceptance test
verbatim under 1500 ms latency: **May 2028**; Week → **Mar 26 – Apr 1**.
`?date=X&X` → 0 glyphs / 42 cells. Boundary clean; `useToday.ts` and
`useCalendarPeriod.ts` untouched.

### BLOCKER — the `pendingSelfNav` counter drifts and swallows Back

`CalendarViews.tsx:119-123, 144-147`. The counter is incremented per push but
only decremented inside an effect that runs on a **search-param value
change** — so **a push that produces no value change never consumes its
increment**, and each stale increment silently swallows one later external
navigation. Cumulative.

**Trigger 1 needs no timing at all.** `RadioSheet.tsx:72-75` fires `onSelect`
for the *already-checked* option, so picking "Month" while on Month pushes an
identical URL, Next adds no history entry, and the effect never runs:

```
after picking Month while already on Month: title "March 2028", hlen 30
after Back:  search "?date=2028-02-15"  BUT title still "March 2028"
```

Back visibly does nothing, and the URL and page now disagree. Three same-view
picks then four Backs: the first three Backs are eaten, the fourth finally
moves. Two more triggers reproduced (Next-then-Prev inside the round trip;
Back inside the round trip after Next — page shows April while the URL and
the server's fetch window say February, masked by the ±61-day window).

**The deeper finding: Next is unreliable in *both* directions.** Sometimes it
**discards** a superseded push (`ACTION_RESTORE`,
`app-router-instance.js:143-154`); sometimes **both** commit in order, even
under 1500 ms latency. The counter accounts for only one of those.

**Vision's prescribed fix (~10 lines, same file):** (a) in `navigateTo`,
return **without pushing or incrementing** when the computed search equals the
current one — a no-op navigation is nothing to guard, which kills trigger 1
outright; (b) replace the count with **compare-and-clear**: a `Set<string>` of
search strings this component pushed — in sync → `clear()`; URL in the set →
`delete` and skip (consume once); otherwise **`clear()` then `jumpTo`**, since
an external navigation discards every in-flight own push anyway. Residual, to
be stated in the comment rather than hidden: a push Next discarded leaves its
string until the next mismatch or sync.

### Notes

- The 12-line comment claims the counter is "cleared once state is synced";
  the logs show the effect **never ran at all** after a same-URL push, so that
  is not a guarantee the code can make. **Eighth overclaiming comment.**
- **"Could have been smaller": that comment block is the largest single C8
  addition to a 348/350 file. Vision's verdict — Captain's extraction of the
  URL/navigation cluster is now *prerequisite* to fixing this, not optional.**
  Two gates have now independently reached that conclusion.
- The value-keying fix itself is correct and minimal; `todayTime` via
  `getTime()` is exactly the stable primitive `useToday.ts` already documents.
- `page.tsx`'s repeated-key normalization verified correct; the
  `string | string[]` annotation is now honest.
- Process: two gates shared debug port 9333. Vision could not fully rule out
  that one CDP session reached Strange's idle `about:blank` tab; it verified
  no cookie remained there and cleaned up. **Gates sharing a browser debug
  port must pick distinct ones.**

## C9 — the counter removed, not replaced (Bryce's call, 2026-09-02)

Presented with three options after both gate budgets were spent, Bryce chose
**revert the counter, ship K2, and make Captain's extraction K3's opening
move.** Fury implemented it directly — both gate budgets are exhausted, the
change is a **removal** rather than an addition, and it is verifiable
end-to-end in the running app.

**Why removal fixes Vision's trigger 1 outright rather than merely mitigating
it:** the drift existed because increments were never consumed by pushes that
produced no search-param change. With nothing incremented, there is nothing
stale to swallow a later Back.

**Verified by Fury on one build, all three behaviours:**

| case | result |
|---|---|
| Re-pick the already-active view ×3, then Back | **March 2028**, title and URL agree — Vision's trigger 1 dead (it previously ate three Backs) |
| Double tap, 60 ms apart, no throttling | April → **June 2028** (+2) — C8's value-keying intact, not regressed |
| Single tap | **no revert**, `transitions: 2`, flip **25 ms** |

Gauntlet: tsc 0, eslint 0, **180/180** under `npm test` and under the direct
`TZ=UTC node --import tsx --test …` invocation, build 0.

**The accepted residual, stated plainly rather than hidden:** when two fast
taps both commit, the earlier commit can briefly show the intermediate period
before the later one lands — a flicker that settles correctly. That is
strictly milder than a swallowed Back, and strictly better than the
pre-C8 state where two taps advanced one period.

**Two things Fury got wrong in its own edit and caught before committing:**
the first version left `useRef` imported but unused, and the explanatory
comment pushed `CalendarViews.tsx` to **359 — over the cap** — which is
exactly the failure this whole thread is about. Trimmed to **350, at the cap
with zero headroom**, which only sharpens the case for the extraction.

**The in-code comment carries a "do NOT add a pending-navigation guard here"
warning** naming what C8 tried, why it drifted, and where the real repair
belongs — so the next session doesn't re-derive the same broken idea.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| C1-1 | Vision | **PASS** | 0 | 7 notes; gauntlet re-run 146/146 both TZs; boundary audit clean |
| C2-1 | Vision | **BLOCK** | 1 | FAB occlusion confirmed and sharpened; 6 notes; all other "Done means" items verified |
| C5-2 | Vision | **PASS** | 0 | blocker RESOLVED; 5 notes; FAB-removal regression hunt clean across 3 branches |
| C5-2 | Strange | **BLOCK** | 2 | all 4 pass-1 blockers RESOLVED; 2 NEW, both downstream of the B3 remedy |
| C1-1 | Captain | **PASS** | 0 | 9 notes; two change C2's shape; 1 proposed STRUCTURE.md amendment |
| C2-1 | Captain | **PASS** | 0 | 11 notes; found the CI test-glob trap; 1 Fury miscount corrected |
| C5/6/7-3 | Captain | **PASS** | 0 | final pass; 11 notes; skeleton measured against pre-C5 geometry; new `?date=` duplication |
| C6/7-3 | Vision | **BLOCK** | 1 | C7 passes; C6's resync effect cancels every optimistic step — two taps advance one month |
| C8-4 | Vision | **BLOCK** | 1 | Original blocker RESOLVED; the counter C8 added *on top* drifts and swallows Back |
| C9 | — | resolved by removal | 0 | Bryce chose revert-not-replace; Fury implemented and verified directly (both gate budgets spent) |
| — | Strange | HELD | — | its last pass withheld: gating code that is about to change would waste it |
| C2b-1 | Strange | **BLOCK** | 4 | tested all 3 FAB remedies and measured them; 8 notes; 1 DESIGN.md amendment proposed |

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-09-02 — File drafted by Fury while K1's C4 was still building, so K2
  can start the moment K1 delivers. Contracts are DRAFT: boundaries assume
  C4 lands `CalendarHeader.tsx` and `ActionCircle.tsx` and keeps every file
  under 350 lines; re-check against the real tree before dispatching C1.

## Delivery

- **Shipped:** Calendar K2 — the Month view, a typed period cursor, and
  **unbounded navigation** (Bryce's own ask; the ±60-day wall is gone and the
  calendar reaches 2028 and beyond). 9 contracts, 11 gate passes, three
  gates. Tests 135 → **180**, green under both timezones.
- **Deliberate leftovers, routed not dropped:**
  - **K3's first contract, now prerequisite rather than advisory** (both
    Captain and Vision independently): extract `CalendarViews.tsx`'s
    URL/navigation cluster (~57 lines → ~285) **before any filter code**, then
    apply Vision's compare-and-clear `Set` + no-op-push guard there. The file
    is at 350/350.
  - **C3** (split `calendarDates.test.ts`, 349/350; decide `canStepToPeriod`'s
    fate) and **C4** (hoist `hexToRgba`; move the Month skeleton *and*
    `MonthGridSkeletonRows`; re-measure the skeleton against post-C5 geometry;
    route `new/page.tsx` through `parseDateParam`, which today accepts
    `2026-02-30`; fix `MonthCell.tsx:167`'s stale rationale and decide
    `md:`→`sm:`).
  - **The all-day timezone defect** — deferred by Bryce, recorded in
    `calendar-v1.md` with its reproduction and with the plan's own wrong rule
    annotated.
  - Two proposed constitution amendments awaiting Bryce: Captain's on dormant
    exports, Strange's on unoccluded targets.
  - `useCalendarPeriod.ts:229`'s stale comment (off every boundary so far).
  - **Nine overclaiming comments surfaced across this mission** — worth its
    own note in project memory.
- **Shipped check:** —
- **Deliberate leftovers:** —

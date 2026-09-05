# Mission: CV3 — Schedule, the continuous list

**Project:** family-hub (Marshee)
**Status:** DELIVERED — all three gates PASS (Vision 4, Strange 3, Captain 2)
**Started:** 2026-09-04 · **Updated:** 2026-09-05

## ⚠️ This is the first mission since the calendar went LIVE

The five-PR stack merged today. **Emily has Week, Day and Month on her
phone right now.** Anything this mission removes is removed from an app a
real family is using — which changes one of the plan's own instructions.
See D1.

## Brief

- **Goal:** a Schedule view — one continuous list of days that scrolls
  endlessly backward and forward, today always present. Google's
  "Schedule", and the answer to *"what's coming up?"*
- **Done means:**
  1. Schedule is selectable and renders real events **and tasks**.
  2. Scrolling up loads earlier days; scrolling down loads later ones;
     **the viewport does not jump** when earlier days are prepended.
  3. Scrolling never touches the URL. Today scrolls if loaded, navigates
     if not.
  4. A guard failure stops that direction rather than looping forever.
  5. Gauntlet green in all three timezones; database at exact baseline.
- **Out of scope:** the hour timeline (CV4 — **do not touch
  `src/lib/timelineLayout.ts`**, CV4 is its first consumer), Month text
  pills / Year (CV5), the month dropdown and swipe paging (CV6), drag
  (CD1), filters (K3), recurrence (K4).

## Decisions — don't re-litigate

- **D1. Schedule is ADDED. Week and Day are KEPT.** The plan says
  *"Picker: Week and Day removed here, Schedule added."* That was written
  when nothing was merged. It is now a live app, and Banner found the
  removal carries a trap the plan did not anticipate:
  **`DEFAULT_CALENDAR_VIEW` is `"week"`** (`calendarViewVocabulary.ts:101`),
  so unbuilding Week makes the fallback name an unbuilt view — every
  rejected `?view=` and every stale saved preference would resolve to
  something that cannot render.
  Adding is the safe half; removing is the opinionated half and is **one
  record's worth of flips** whenever Bryce says. Building it removed and
  then restoring it is rework.
  **✅ CONFIRMED by Bryce, 2026-09-04: keep Day and Week.** No longer a
  default standing in for an answer — the picker ends this mission with
  **four** views (Schedule, Day, Week, Month), and Week/Day become hour
  timelines in CV4 rather than disappearing first.
- **D2. `fetchCalendarEvents` is this file's first data-returning guarded
  action**, so it sets a precedent. It is a **public POST** — cap the scan
  (`MAX_FETCH_SPAN_DAYS = 124`), validate the `Date`s, require
  `end > start`, and return the typed empty value on a guard failure so a
  client loop stops rather than retries.
- **D3. The window is built from browser-local midnights**, so there is
  **no timezone pad** here — unlike `page.tsx`, whose ±8-day pad exists to
  tolerate the server clock. The client knows its own midnight; the server
  does not.
- **D4. `scheduleWindow.ts` is pure and tested before any UI consumes it** —
  the `monthLayout`/`timelineLayout` precedent. Scroll anchoring is the
  part that cannot be unit-tested; the merge/chunk/row maths is the part
  that can, and it is where the bugs will be.

## Danger register (absolute)

- **The app is LIVE.** A regression here reaches the family.
- Never `npm run db:seed` / `db:reset`; never a Neon branch reset. Scoped
  `db:seed-tasks` / `db:clean-tasks` / `db:seed-calendar` /
  `db:clean-calendar` only — all carry discriminators.
- **No committed script may create, update or delete `User` rows.**
- **Do not edit any existing migration.**
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`.
  **`CalendarEvent` must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles and counts, never
  names or titles.**
- **Never `git add -A` / `git add .`.**
- **Fury: do not commit while a gate is running.** Three mid-gate commits
  happened last mission; Vision caught the third.

## Gauntlet

`npx tsc --noEmit` · `npx eslint .` · `npm run build` · `npm test` (252
baseline, pins Denver) · the direct `TZ=UTC` and
`TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts
src/lib/voice/*.test.ts` legs.

## Standing constraints

- **`CalendarViews.tsx` is at 280/350.** Captain's pass-2 ruling: *"still
  ~2 missions of headroom; no action now"*, and the next extraction is the
  **sheets block** (`CalendarViews.tsx:215-277`, ~62 lines, taking it to
  ~225) — **not** the render switch, which is structurally unable to move
  (it imports `MonthGrid`/`DaySection`, so `src/lib/` would be a
  dependency-direction violation). *(Banner's brief misattributed this to
  an `EventForm` extraction — corrected here.)* If CV3 approaches the cap,
  extract the sheets block first.
- `src/lib/mealPlanDates.ts` owns local-calendar-date string conversions;
  a new private copy in a component is a **BLOCKER** (Bryce approved this
  today). Trip conditions are keyed to **definitions**, never importers.
- `line-through` means *done* (`GroceryRow`, `TaskCard`); a **past** item
  must never use it.
- Three states — loading, genuinely empty, outside the loaded window —
  must never be mistakable for each other.
- Two STRUCTURE.md amendments still await Bryce (membership guard form;
  the data-migration exception).

## Assembled

- **Stark + Vision** — always.
- **Strange** — a whole new view; scroll behaviour is felt, not read.
- **Captain** — three new modules and a new action shape.
- **Banner** — done; brief accepted with one correction (above).
- **Gate models:** Vision `fable`, Strange `opus`, **Captain on `fable`
  for this mission — ✅ CONFIRMED by Bryce, 2026-09-04.** The experiment
  exists because there is **no** Fable data to reason from: Fable's limit
  was exhausted during missions 13 and 14, so every gate in both ran on
  Opus. CT2 is the baseline — Captain there BLOCKED on a real duplication,
  retired one of its own rules as unenforceable, and declined to block on
  a fifth copy to stay predictable. **The comparison to make is whether
  Fable-Captain finds structural problems of that calibre**, not whether
  it passes.

## Contracts

### C1 — `calendarEventQuery.ts` + the first data-returning guarded action
- **Status:** PENDING
- Extract `page.tsx`'s select + mapper into `server-only`
  `src/lib/calendarEventQuery.ts` (precedent: `personInfo.ts` — a constant
  `SELECT` record plus a field-by-field mapper, never a spread, so a
  `passwordHash` cannot ride along if the select is widened later).
  `page.tsx` then uses it, unchanged in behaviour.
- Add `fetchCalendarEvents(windowStart, windowEnd)` to
  `actions/calendar.ts`: null-returning `getVerifiedSession()` guard,
  `Date` validity checks, `end > start`, `MAX_FETCH_SPAN_DAYS = 124`.
  Returns the typed empty value on any refusal.
- **Boundaries:** may touch `src/lib/calendarEventQuery.ts` (new),
  `src/app/actions/calendar.ts`, `src/app/(app)/calendar/page.tsx` ·
  must not touch components, `src/lib/timelineLayout.ts`, `prisma/**`.
- **Evidence:** the extraction proven behaviour-identical (page output
  unchanged); the action's guard quoted; **the cap proven** by requesting
  125 days and showing refusal, positive control first; **tasks fetched
  too, or an explicit statement that CV3's action is events-only and why.**

### C2 — `scheduleWindow.ts`, pure and tested
- **Status:** PENDING
- `mergeWindow` (overlap-merge into a `Map<id>` so a multi-day event seen
  twice is stored once **and a deleted one drops**), `nextBackwardChunk` /
  `nextForwardChunk` at **30 days**, `scheduleRows` → months →
  days-with-events, **plus today always**.
- **Boundaries:** may touch `src/lib/scheduleWindow.ts` (new) and
  `src/lib/scheduleWindow.test.ts` (new) · must not touch anything else.
  Keep the test file **directly in `src/lib/`** — the glob is
  hand-enumerated in **three** places (`package.json` + two CI steps) and a
  new directory silently drops from all three.
- **Evidence:** tests must **rise** above 252. Cover: a multi-day event
  seen in two chunks stored once; a deleted event dropping on re-merge;
  today present when it has nothing; both 2026 DST transitions; chunk
  boundaries not double-counting or gapping a day.

### C3 — `useScheduleWindow` + the Schedule renderer
- **Status:** PENDING (depends on C1 + C2)
- Thin hook: re-merges the seed on identity change (so `router.refresh()`
  after an edit flows in), **one in-flight ref per direction**, and `[]`
  from a guard failure **stops that direction rather than looping**.
- **Manual scroll anchoring** — WebKit has no `overflow-anchor`: record
  `scrollHeight` before a prepend, add the delta to `scrollTop` in
  `useLayoutEffect`. Sentinels via `IntersectionObserver`
  (`rootMargin: "100% 0px"`).
  **Precedent worth reading first:** `RecipeList.tsx` is this repo's only
  `IntersectionObserver`/`useLayoutEffect`/`ResizeObserver` user, and
  mission-R2 learned there that `scrollIntoView` does **not** reliably
  scroll a `position: sticky` target, and that `"instant"` beat `"smooth"`
  for gesture-tracking.
- Reuses `DaySection`/`EventCard`/`TaskCard`. Week-range dividers;
  "Nothing planned. Tap to create." → `/calendar/new?date=`.
- **Boundaries:** may touch `src/lib/useScheduleWindow.ts` (new),
  `src/components/ScheduleView.tsx` (new) · must not touch
  `DaySection.tsx`, `EventCard.tsx`, `TaskCard.tsx`, `CalendarViews.tsx`.
- **Evidence:** **the prepend must be proven not to jump** — record
  `scrollTop`/`scrollHeight` before and after three prepends and show the
  viewport held. A guard failure must be shown **stopping**, not looping.

### C4 — Wire it up: picker, header, initial scroll
- **Status:** PENDING (depends on C3)
- `BUILT_VIEWS.schedule → true`. **Week and Day stay `true`** (D1).
- `CalendarHeader` gains `showArrows`; Schedule hides them (its cursor
  `step` is 0, so paging is already a no-op). Today scrolls if loaded,
  else navigates. Schedule takes `initialDay` as a **prop** — only the CV0
  hook reads `useSearchParams`.
- **Boundaries:** may touch `src/lib/calendarViewVocabulary.ts`,
  `src/components/CalendarViews.tsx`, `src/components/CalendarHeader.tsx`,
  `src/lib/calendarViewConfig.ts` (schedule's PROVISIONAL row) ·
  must not touch `useCalendarPeriod.ts`, `calendarPaging.ts`.
- **Evidence:** `wc -l src/components/CalendarViews.tsx` — **report it**;
  if it approaches 350, extract the sheets block first and say so.
  Week, Day and Month must be **provably unchanged**.

### C6 — Vision's four blockers
- **Status:** DISPATCHED
- **B1** re-arm the sentinels after a load settles (record `isIntersecting`
  in a ref; re-check in an effect keyed on the window/hasMore state, **not**
  in `finally`, where the refs are still stale).
- **B2** `TaskDetailSheet.onSaved` passes the updated record up; refresh the
  **old and new** due days when they differ, and re-seat `selectedTask`.
- **B3** separate refusal from emptiness — **Fury's call, flagged to
  Bryce**: `null` = refused (stop), `[]` = empty (**advance** the
  boundary), plus a bounded cap on consecutive empties so termination stays
  guaranteed. This amends **D2**, which conflated the two.
- **B4** Fury fixes the mission record; not a builder's job.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain (**Fable**) | **BLOCKED** | 2 | 10 notes, 4 amendment drafts — the experiment's result |
| 1 | Vision | **DIED — session rate limit**, mid-report | — | Its fragment named a real bug; Fury reproduced it (below) |
| 2 | Captain (**Fable**) | **PASS** | 0 | 8 notes; finalised 4 amendments — all now in STRUCTURE.md, plus a 5th Bryce approved |
| 1 | Vision (fresh run) | **BLOCKED** | 4 | 6 notes; found three real user-facing failures |
| — | C6 fix batch | dispatched | — | — |
| 1 | Strange | **BLOCKED** | 3 | 3 notes; all three blockers trace to Fury's design calls |
| — | C8 fix | DONE `2e3e1ae` | — | all three closed on a production build; tests 297 → 302 |
| 2 | Vision | **DIED — session limit** (Fury's), mid-run | — | Was genuinely on `claude-fable-5-1`. No verdict. Third Vision instance to die this mission. |
| 3 | Captain (Fable) | **BLOCKED — budget exhausted** | 1 | 7 notes; blocker is a test file over the HARD cap, fix is mechanical |
| — | C9 | DONE `25a7a4b` | — | test-only split, 768 → 488 + 371; `withTimeZone` stays at 4 |
| 1 | Vision (4th instance) | **BLOCKED** | 1 | The gesture retries a refusal — D2 defeated. 4 notes. B1/B2/Today/teardown verified closed. |
| 2 | Strange | **BLOCKED** | 2 | 5 notes; corrected C8's record on the 54px residual; B2 and B3 genuinely fixed |
| — | C10 + C11 | DONE `6598c0b` | — | extend gated on `isStoppedByEmptyCap`; extremity+direction gating; reset on anchor change; 54px; 65px band; scoped `preserveScroll` |
| 3 | Vision (5th instance) | **BLOCKED — budget exhausted** | 2 | 4 notes. B1 *narrowed, not closed*: a refused **reopen** leaves the edge reopenable. B2: C10's reset races an in-flight load — Today can fail to arrive. **Mission STOPPED → Bryce.** |
| 3 | Strange | **PASS** | 0 | 3 notes. Both pass-2 blockers closed and *felt*; 54px proven fixed with a paired control (0 vs 54); 65px band exact |
| — | C12 | DONE `4b10184` | — | Both blockers closed; both pre-fix controls reproduce Vision pass 3's own numbers exactly |
| **4** | **Vision** (Bryce-authorized, outside the 3-pass budget) | **PASS** | **0** | 8 notes. Re-ran all three legs; enumerated the edge's reachable states rather than sampling; reproduced both controls and Strange's walk |

### Vision, pass 4 (Bryce-authorized) — PASS, zero blockers

Gated `6598c0b..483ed2f` at HEAD `483ed2f`. **All three legs re-run:**
tsc, eslint, build clean; **310** under Denver and LA, 303 + 7 skipped
under UTC. Boundary clean — a diff of the delta restricted to every
must-not-touch path is **empty**. Baseline `Task 0, TaskPerson 0,
CalendarEvent 4, User 5` before *and* after. No `User` writes: the
ghost-cookie technique only, cookies minted to files and never printed,
`grep -c "session=" *.log` → none.

**Item 1 settled by ENUMERATION, not sampling** — which is the answer to
the "each fix closed the case in front of it" pattern that produced three
blockers in a row. Per direction, `(hasMore, streak)` has exactly five
reachable classes: `(true, 0..cap-1)` open; `(true, ≥cap)` reopened (only
via `reopenAfterEmptyStreak`); `(false, ≥cap)` empty-cap stop (only via
`[]`); `(false, 0)` refusal (only via `null`); `(true, 0)` reset.
**`(false, 1..cap-1)` is unreachable** — a `[]` below the cap keeps
`hasMore` true. So `isStoppedByEmptyCap` false with `hasMore` false is now
exactly "refused", **from every path**, not just the two we had found. The
reset costs nothing on `refreshDay`/`applyRefresh` (neither reads the
streak) and nothing on a refuses-then-succeeds edge (after a refusal
nothing calls that loader until a window reset, which rewrites the streak
anyway). All 4 named comments and the 7 new ones checked against the code
they describe — accurate.

**Measured, shipped vs. pre-fix control, both on production builds in
isolated worktrees on separate ports:** item 1 — valid cookie at the top
`[2,2,2]` (instrument proven live first), ghost cookie → reopen `2` then
six gestures **`[0,0,0,0,0,0]`**, touch `[0,0]`, forward `[2,0,0,0]`;
control on `6598c0b` → **`[2,2,2,2,2,2]` = 12**, matching pass 3's own
number. Item 2 — deep link +200d, first mount POST held 4000ms, Today
tapped at 580ms → row at **`top 536`**, Today **disabled by 2.35s, during
the hold**, and unmoved after release at 4.6s; every post-tap chunk tiles
outward from today, **nothing beyond the pre-tap frontier ever
requested**; control → Today **enabled**, `scrollTop 0`, 9 of 11 post-tap
POSTs in the far window walking on to `2027-05-23`. A third variant (a
stale *forward* load held across the reset) settled identically with
`refJump 0`. **Both edges answered a gesture afterward — no stranded
in-flight flag.**

**Strange's PASS survives the delta**, re-driven through the real UI:
picker → Month → Next ×6 → picker → Schedule → Today → row present, Today
disabled at **524ms**, 16 POSTs; 12 genuinely mid-page gestures → **all
0**, `scrollHeight` 1383 → 1383, no skeletons.

**Non-vacuity reproduced independently:** a scratch copy with only the two
null-branch lines reverted → **28 pass / 3 fail**, the three being exactly
the new C12 tests; restored 31/0.

**The effect-order claim was checked against React's source**, not
accepted: `pushSimpleEffect` appends to the tail of the circular list and
`commitHookEffectListMount` walks from the head — declaration order, as
the comment says.

**NOTES (8), all recorded, none blocker-class:** `refreshDay` carries no
generation guard — harmless today (`applyRefresh` touches no boundary and
`scheduleRows` walks only the window, so a stale entry is invisible and
reconciled by the next covering chunk) and **queued into the explicit
per-direction `status` refactor**. `useScheduleWindow.ts` 431/350 —
Captain's, not Vision's, to block on. **C12's "Next serializes the mount's
four Server-Action calls" is only partly true** — in one run the fresh
POSTs dispatched at 760ms while the held one stayed outstanding to
4612ms; serialization is not a property to rely on, the settled state is.
**For whoever re-measures item 2:** the shipped tree shows *3* far-window
POSTs after the tap (the mount's already-queued siblings) whose results
are discarded — **count chunks past the pre-tap frontier (shipped 0), not
raw far POSTs, or the fix reads as a regression.** "Mid-page" on this
1383px page is narrower than it looks — three +120 wheels reach the true
bottom and legitimately reopen; ±40–60px is genuinely mid-page (Vision's
own instrument, not the app). A same-document double reset is unreachable
in Schedule (no Prev/Next by design, Back is a cold document reload, and
Today either scrolls or is disabled) — the guard is an order-independent
integer compare and would hold regardless. **Pre-existing, outside the
delta:** a page GET with a DAL-refused cookie returns **200**, not 307 —
the streaming shell around a redirect inside the Suspense boundary; body
verified to contain no calendar markup, recorded so nobody reads it as a
leak. And earlier passes left minted session tokens in the shared
scratchpad — **swept by Fury at delivery; zero JWT-shaped strings
remain.**

### Vision, pass 3 (the last) — BLOCKED, two blockers; the budget is spent

On `6598c0b`, scope `25a7a4b..6598c0b`. Gauntlet re-run: tsc, eslint,
build clean; **307/307** under Denver and LA, 300 + 7 skipped under UTC.
Boundary audit clean — exactly the seven declared files plus the mission
file. `preserveScroll` reaches exactly one call site
(`CalendarViews.tsx:163`). Baseline restored exactly. The new
`isStoppedByEmptyCap` tests were proven non-vacuous (flipping `>=`→`>`
turned 2 red).

**B1 — the predecessor's blocker is narrowed, not closed.**
`extend` is now gated on `isStoppedByEmptyCap`, so a *refusal*-stopped
edge with `streak < cap` is a genuine no-op (measured: 4+4 gestures →
`[0,0,0,0]`). But an **empty-cap-stopped** edge (`streak >= cap`)
reopens, loads, and if that load is **refused**, `applyChunkResult`'s null
branch deliberately leaves the streak untouched — so the edge is still
`!hasMore && streak >= cap`, still reopenable, and the same refused chunk
re-fetches on every gesture, forever. **Measured on the actual null
branch** (a valid-signature cookie the DAL refuses — the deactivated-
member case, which passes `proxy.ts` and reaches `getVerifiedSession()`):
6 gestures → **12 refused POSTs**, identical range, flat 2/gesture, no
ceiling. Confirmed three ways (pure trace, real empty window, ghost
cookie). This is the retry loop D2 exists to prevent, on a path C10 did
not close. Vision's prescription: the null branch resets the streak to 0
alongside `hasMore = false`, so *any* refusal leaves the edge
refusal-stopped — reversing that branch's documented "never touch the
streak" invariant, which is precisely the invariant that opened the gap.

**B2 — C10's reset is new state-machine surface, and a load in flight
during the reset writes a stale boundary back.** The reset effect (on
`initialDayTime` change — tapping Today from far away) resets the window,
`hasMore` and streak refs and `setState(fresh)`, but **not**
`backwardInFlight`/`forwardInFlight`, and it neither cancels nor ignores a
load started before it. Sequence: an old far-away backward load is in
flight → Today tapped → reset → the fresh initial `loadBackward()` is
**skipped** (in-flight flag still true) → the old load resolves and
applies its far chunk over the fresh state → `windowStart` becomes the
stale far value, far entries merge into the near-today window, and the
re-arm effect keeps loading around the old position. **Pure trace,
deterministic:** fresh `windowStart 2026-09-05` → `2027-02-22`. **Browser,
two gated runs** (2.5–4s latency, tapped only with Today enabled and a
backward load in flight): URL flips to today, reader never arrives, Today
stays **enabled**, `scrollTop 0`, ~11 wasted far-away POSTs. Recoverable
with a second tap after loads settle; still a concrete, reachable failure
of the exact behaviour C10/C11 guarantee, on the slow force-dynamic loads
that are C11's own premise. Prescription: reset the in-flight flags too,
and make a pre-reset load unable to apply (generation token captured at
load start, checked in the updater).

**Notes (4):** the 54px skeleton shift is genuinely fixed — `refJump 0`
across 7 real mid-list loads on a production build, with the instrument
control (native anchoring forced on) producing 1479px + the +54 residual.
The 65px `rootMargin` sits only on the today-visibility observer; the
fetch-ahead observer (`100% 0px`) is separate, no interference. The
direction+extremity gating works: TOP wheel-down ×3 → 0 POSTs, BOTTOM
wheel-up ×3 → 0, a mid-list flick → 1 legitimate fetch-ahead (vs. +6
before). And the five new unit tests test the predicate in isolation —
they pass while B1 stands, because the defect is in how `extend` and
`applyChunkResult` compose across a refused reopen; **a state-machine-
level test (empty-cap-stopped → reopen → refusal → gesture → zero loads)
would have caught it.**

### Strange, pass 3 (the last) — PASS

On `6598c0b`, production build in an isolated worktree on its own port,
real headless Chrome at 375×812 (the built-in pane runs hidden — Strange
measured `IntersectionObserver` and `requestAnimationFrame` as NEVER
firing there, so it is structurally incapable of this pass). Theme
proven both directions. Zero database writes; counts exactly baseline.

**B1 — CLOSED, and the arrival is felt.** Its own walk, no typed URL:
picker → Month → Next ×6 → picker → Schedule (today's row genuinely not
loaded — the fallback branch `preserveScroll` is passed from) → Today.
Today's row settles at `top 94` by **371ms**, Today disables at
**493ms**, flat through 7s; `minScrollTop` never returns to 0 — no
flash. On the 4-event list the row lands at `top 536` and holds 11s.
Pass 2 was 3687px away, permanently. **Week/Day/Month unchanged, now
non-vacuously:** at 812px Day and Month don't scroll, so the first
0→0 reading proved nothing; re-measured at 375×500 where they do —
Month `243 → 0` after Next, `145 → 0` after Today; Week likewise.

**B2 — CLOSED, on wheel and touch.** Full matrix on the settled real
page: mid-page down/up → **0 POSTs** on both inputs, no skeleton, no
message change, height fixed over 3.5s; at the true top, downward →
**0**; at the true top, upward → one chunk. Extremity and direction
gating each independently observable. The reopen reads as asking: the
message goes absent for **191ms** with one skeleton, then returns;
nothing shifts.

**NOTE (its own record correction) — the 54px is genuinely fixed, and
the control proves it.** Per-animation-frame, mid-list, `maxDeviation 0`
across 270 frames through a full insert-and-replace cycle; **paired
control with native anchoring forced back on: `maxDeviation 54`, never
recovers.** Its first two attempts returned zero *including the control*
and were rejected — the metric was rebuilt rather than a clean number
reported unearned. **NOTE — the 65px band is exact:** nav occupies y
747–812 (height 65); a row with 2px visible above the nav → Today
disabled; 0px → enabled. **NOTE — Day lands at `scrollTop 5`, not 0**,
after Next and Today (Month at exactly 0) — pre-existing, not from this
delta, imperceptible, recorded only so nobody reads "verified at 0" into
this evidence. **NOTE — a touch flick at the boundary grants more chunks
than a wheel flick** (up to four rounds vs one; a 15s sustained gesture
spent 92 POSTs) — within the documented "one more chunk per gesture"
intent and visually stable, flagged for whoever tunes the burst.

### C12 — Vision's two pass-3 blockers (DONE; Bryce-authorized 4th Vision pass next)
- **Status:** DONE `4b10184` — **Bryce authorized C12 and a 4th Vision pass,
  2026-09-05** ("C12 + one more Vision pass"), explicitly extending the
  doctrine's 3-pass budget by his decision.
- **Report:** both defects closed, **both pre-fix controls reproducing
  Vision's own numbers exactly.**
  **Item 1** — the null branch resets `emptyStreak<Direction>` to 0, so a
  refusal always reads `streak 0 < cap` however it was reached. Live, on
  the household's naturally empty-cap-stopped edge with a ghost cookie
  (valid signature, DAL refuses): one reopening gesture → 2 refused POSTs
  establishing the refusal-stop, then **6 further gestures → `[0,0,0,0,0,0]`,
  zero POSTs.** Pre-fix control (null branch reverted, rebuilt, restarted):
  **`[2,2,2,2,2,2]` = 12** — Vision measured 12.
  **Item 2** — a `windowGeneration` ref bumped by the reset effect, which
  now also clears both in-flight flags; each loader captures the generation
  at start and re-checks it before `setState`, before the second
  `prepareAdjustment()`, **and inside `finally`** (Fury's named trap: an
  unguarded `finally` would clear the *fresh* load's flag mid-flight and
  let a third concurrent load start). Live: deep-link +200d, one mount POST
  held 4s in flight, Today tapped while held → today's row at
  `scrollTop 634`, Today **disabled**, headings read the current month,
  **confirmed after the stale far chunk was released at 3463ms** — the
  stale result was discarded, not applied. Pre-fix control (hook reverted
  only): Today **enabled**, `scrollTop 0`, POSTs drifting 290→110 days out
  long after the click.
  **Clean path unchanged** (Strange's PASS must survive this delta): Month
  → Next ×6 → picker → Schedule → settle → Today → `scrollTop 634`, Today
  disabled, 16 POSTs; 6 mid-page flicks → **0 POSTs.**
  **Non-vacuity:** reverting the 2-line null-branch change turned exactly
  the 3 new tests red (28 pass / 3 fail), restored 31/0.
  Gauntlet green: tsc, eslint, build; **310 tests** under Denver and LA,
  303 + 7 skipped under UTC. Baseline `Task 0, TaskPerson 0,
  CalendarEvent 4, User 5` confirmed before and after. Boundary clean —
  exactly the three permitted files, 204 insertions / 14 deletions.
- **Deliberate leftover (Fury's call, recorded not deferred silently):**
  `useScheduleWindow.ts` is **431/350** — over the soft cap, which
  STRUCTURE.md makes a NOTE and a split candidate, never a blocker. The
  contract forbade extracting mid-fix; the candidate is named — the two
  loaders → `useScheduleLoaders.ts`, the same shape as the
  `useScheduleSentinels.ts` and `useScrollAnchor.ts` extractions this file
  already produced. Captain's 3-pass budget is spent and a soft-cap
  crossing is not blocker-class, so this goes to the follow-up mission
  rather than buying a 4th Captain pass. `scheduleWindowState.ts` 493,
  `scheduleWindowState.test.ts` 630/650.
- **Instrument findings worth keeping** (both from the builder, both real):
  blanket `Network.emulateNetworkConditions` throttles the RSC navigation
  GET through the *same simulated pipe* as the Schedule's POSTs, so the
  Today tap's own navigation never completes and the test measures the
  instrument, not the app — a per-request `Fetch.enable`/`requestPaused`
  delay on POSTs only reproduces the race cleanly. And Next appears to
  **serialize** the mount's four Server-Action calls rather than firing
  them concurrently, so only one can be held genuinely pre-click; the
  durable evidence is therefore the settled state after the held chunk's
  release, not the raw request timeline.
- **Objective:** (1) a direction reopened after the empty cap and then
  REFUSED becomes refusal-stopped — no further gesture reopens it; (2) a
  load in flight when the window resets (`initialDayTime` change) can
  neither block the fresh window's own initial loads nor write its result
  into the fresh state.
- **Fix guidance** — the findings stand; the prescriptions must be
  *verified*, not assumed (mission-13: a gate's finding can stand while
  its prescription fails):
  1. `applyChunkResult`'s null branch resets `emptyStreak<Direction>` to
     `0` alongside `hasMore<Direction> = false`. **Rewrite the three
     comments that currently promise the opposite** — the null branch's
     own, `isStoppedByEmptyCap`'s header ("left wherever it was"), and
     `reopenAfterEmptyStreak`'s "never advances the streak" paragraph. An
     overclaiming comment is this project's named defect class. The
     existing refused-state test (`emptyStreakBackward: 0`) stays true.
  2. In the hook: a generation counter (or equivalent) bumped by the reset
     effect, which also clears `backwardInFlight`/`forwardInFlight`. Each
     loader captures the generation at start and, after its `await`,
     applies its `setState` **and clears its own in-flight/loading flags
     only if the generation still matches.** Trap, named by Fury: a stale
     load's `finally` clearing the in-flight flag unconditionally would
     clear the *fresh* load's flag mid-flight, letting a second fresh load
     start concurrently — the `finally` must be generation-guarded too.
     Effect order is load-bearing (the reset effect is declared before
     the initial-load effect; both key on `initialDayTime`) — say so in a
     comment where the next editor will stand.
  3. Tests, pure level, `scheduleWindowState.test.ts`: empty-cap-stopped →
     `reopenAfterEmptyStreak` → `applyChunkResult(…, null, null)` →
     `isStoppedByEmptyCap` is **false** and a second reopen is a no-op,
     both directions — the state-machine-level test Vision asked for.
     Prove it non-vacuous: revert the null-branch change, watch it go red.
     The race in item 2 has no pure surface; its evidence is the
     production-build measurement below.
- **Evidence required:** gauntlet green under all three timezone legs.
  **Item 1:** a browser run of Vision's T2 shape — an empty-cap-stopped
  edge, a refused reopen (a DAL-refused cookie, or a fetcher stub
  returning `null`), then ≥6 gestures → **zero** further POSTs; pre-fix
  control on the reverted file → 2 POSTs/gesture. **Item 2:** production
  build, 375×812, a backward load held in flight (throttled network or a
  delayed fetcher), Today tapped while it is in flight with the button
  enabled → today's row lands in the viewport, Today disables, and **no**
  POST after the tap carries a range outside the fresh window's own
  chunks; pre-fix control on the reverted file → Today stays enabled,
  far-away POSTs. **Clean path unchanged:** Strange's B1 walk tapped
  *after* settle still lands today's row, and mid-page flicks still
  produce zero POSTs — the delta must not disturb Strange's pass-3 PASS.
  **Counts:** `useScheduleWindow.ts` is at 348/350 and will cross the
  soft cap — report it; do NOT extract mid-fix; name the split candidate
  (the two loaders → `useScheduleLoaders.ts`) for Captain.
- **Boundaries:** may touch `src/lib/useScheduleWindow.ts`,
  `src/lib/scheduleWindowState.ts`, `src/lib/scheduleWindowState.test.ts`
  · must not touch `useScheduleSentinels.ts`, `ScheduleView.tsx`,
  `CalendarViews.tsx`, `useCalendarNavigation.ts`, `actions/**`,
  `prisma/**`.
- **Done criteria:** both pre-fix controls red on the reverted tree and
  green on the shipped tree; the pure tests red with the null-branch
  change reverted; gauntlet green; counts reported.
- **Gate plan if authorized:** Vision pass 4 on the delta only
  (`6598c0b..HEAD`), explicitly outside the doctrine's budget by Bryce's
  decision. Strange's PASS stands on `6598c0b`; the delta reaches its
  domain only in the race case, and Vision's re-check of the clean B1
  walk is the evidence that the PASS still covers the shipped tree.
- **Deliberate leftover to record at delivery, whatever Bryce decides:**
  the stop *reason* per direction is inferred from `(hasMore, streak)`
  rather than stored. Four fix contracts in a row (C6, C8, C10, C12) each
  opened a new edge in the same state machine. An explicit per-direction
  `status` (`open | refused | exhausted`) plus the generation token would
  make this class structurally impossible; queue it as its own contract
  before anything else builds on this hook — nothing in CV4/CV5 does.

### Strange, pass 2 — BLOCKED

**B1 — tapping Today navigates but never arrives.** Walked without a
typed URL: Month → Next ×6 → picker → Schedule → Today. URL becomes
`?date=today&view=schedule`, then 10s later, fully settled, today's row is
**3687px = 4.54 viewports away**, Today still enabled, and the circle has
scrolled itself 1839px off the top. Reproduced via +200d deep link,
byte-identical over 16s — not transient. **Cause:** `hasScrolledInitially`
(`ScheduleView.tsx:173`) is a one-shot ref; `goToToday()` changes the
`initialDay` prop **without remounting**, so the initial-scroll effect
returns immediately. `useScheduleWindow` *does* rebuild its window on the
same key — the data re-centres, only the scroll does not.
**C8's evidence verified the mechanism (navigation fired), not the
outcome (reader arrived). Fury accepted it. Named as a lesson.**
**Fix:** re-arm the one-shot on `initialDayTime` change, mirroring the
window rebuild already keyed on it.

**B2 — every ordinary flick reopens both stopped directions.** On the
real 4-event calendar the page is 1383px against 812, so with
`rootMargin: "100% 0px"` **both sentinels are permanently intersecting**
and the guard at `useScheduleSentinels.ts:167` never engages. One small
*downward* mid-page flick: "as far back" message vanishes, skeleton
appears, **+6 POSTs**, content shifts, ~2s later everything reverts
unchanged. Scrolling toward the future re-queries the past. Makes the
four-state vocabulary unstable in ordinary use. **Same root as Vision's
blocker — the extend gesture is under-guarded from two directions.**
**Fix:** gate `handlePossibleExtend` on the scroller genuinely being at
its extremity (`scrollTop ≤ ε` / `scrollTop + clientHeight ≥ scrollHeight − ε`),
not on sentinel intersection, which is page-height dependent; and gate on
gesture direction so a downward gesture can only extend forward.

**⚠️ NOTE that corrects the record — the 54px residual is NOT gone.**
C8 reported it as "the same root cause — gone." Paired control on
identical skeleton-insertion frames: native anchoring on → `refJump 0`;
**as shipped → `refJump +54`, `dScrollTop 0`**. Own cause:
`prepareAdjustment()` wraps only the *content* commit
(`useScheduleWindow.ts:228`); the `setLoadingBackward(true)` commit that
inserts the skeleton (`:221`) is uncorrected. Chromium's native anchoring
was the only thing absorbing it, and B2's fix switched that off. **WebKit
never had it, so this has always been live on the family's iPhones** —
C8 brought Chromium into line with the broken behaviour. Four ±30px
shifts inside 600ms on one flick. Kept a NOTE for consistency with pass-1
severity on the same magnitude; **the record must be corrected** — done
here, and the fix goes in C10.

**NOTE — B2 (the double correction) is genuinely fixed**, with an honest
instrument disclosure: Strange's first control was void because it
triggered prepends by jumping to `scrollTop: 0`, where Chromium
suppresses anchoring; re-taken mid-list: **ratio 1.00 / refJump 0** as
shipped across 8 prepends, **1.93–2.00 / up to −1298px** with native
forced back on. `overflow-anchor` restored to `auto` on unmount to Week
and on onward navigation to Kitchen.
**NOTE** — a ~65px band where Today still lies: the visibility observer
uses the layout viewport but the bottom nav covers the last 65px, so a
row fully behind the nav reads "visible" and Today disables. Not
reachable on the 4-event page; reachable on any longer list.
`rootMargin: "0px 0px -65px 0px"` fixes it. **NOTE** — the header with
the Today circle scrolls off on an endless list; on bounded views this
never bites. Pre-existing shared-header behaviour; **Bryce's call.**
**NOTE** — the month label renders twice ~65px apart at a fresh open.

**Re-verified passing:** B3's headline — **16 POSTs, last at 1878ms**,
from 100 / ~11s; reachability feels like asking, not fighting (one
sustained gesture carried Oct → Mar 2027); B1's two good paths; the
stopped message never shows early; 46 elements × 32 scroll positions at
375 and 320, both themes, zero under 44px, zero never-unoccluded, zero
overflow; picker exact; Week/Day/Month unchanged; both flagged comments
corrected accurately.

### Vision, final instance — BLOCKED

**The blocker is the acceptance question the dispatch asked verbatim**
(*"can a gesture reopen a direction stopped by a genuine refusal?"*) and
the answer is yes. `extend()` in `useScheduleWindow.ts:265-272` calls
`loadBackward()`/`loadForward()` **unconditionally** after
`reopenAfterEmptyStreak`; the pure function is correctly a no-op on a
refusal-stopped edge (its unit test passes), but the loaders have no
`hasMore` guard, so the refused chunk is re-fetched. **Failure scenario,
and it is this household's:** a sparse calendar sits with *both* edges at
the empty cap in ordinary use; if the session then lapses — expiry,
deactivation, or the documented `SESSION_SECRET`-rotation sign-out —
with a Schedule tab open, every scroll gesture at an edge re-fetches the
same refused chunk. **Measured: 5 wheel events → 20 POSTs, the same two
ranges repeated, unbounded.** That is precisely the retry loop D2 exists
to prevent. Harm is contract/resource, not data — the list stays
correctly stopped — but B3 is not closed on this path.
**Fix (Vision's, precise):** mirror `emptyStreak` in a ref as `hasMoreRef`
already is, and gate `extend`'s loader call on the same empty-cap
condition `reopenAfterEmptyStreak` uses — only reopen+load when
`!hasMore && emptyStreak >= MAX_CONSECUTIVE_EMPTY_CHUNKS`, so a
refusal-stopped edge is a true no-op on gesture. The re-arm effect at
`:312-319` already guards on `state.hasMore` and is unaffected.

**Verified closed:** B1 terminates on a short page at 375×812 (12 POSTs =
3+3 chunks, both "as far" messages, quiet-4s → 0 further); B2's
edit-then-delete case — the one the C7 builder named as where re-seating
actually matters — **ghosts without re-seating, removed correctly with
it**; Today disabled at rest / enabled scrolled away / navigates on
deep-link; both `IntersectionObserver`s torn down on unmount;
`overflow-anchor` restored to `""` on Schedule → Week. Seam sweep, 11
zones: zero drops at or west of UTC.

**NOTES:** the B4 record gap (now backfilled above); five empty `sgx-*.ts`
files in the repo root are **Strange's in-flight probes** — untracked,
inert, must not be swept into any commit; the prepend ratio could not be
independently reproduced on now-sparse data (Strange's 1.00 / 2.00
control stands as the measurement); east-of-UTC one-day-early placement
is the documented, scoped limitation, not new.

### C10 — the extend gesture, from both gates, plus Today and the 54px
- **Status:** 4 of 5 DONE — see `git log`; item 3 **BLOCKED-ON-CONTRACT**
  (Fury's boundary error, the third this mission) → C11.
- **Report:** items 1, 2, 4, 5 measured on a production build, positive
  and negative controls each. **Item 3 turned out to be two bugs**: stale
  `currentWindow`/`hasMoreRef`/`emptyStreakRef` not reset on anchor
  change (today's row *never loaded* — `months` came back empty), fixed;
  and **Next's documented default scroll-to-top after `router.push`**,
  which fires after the slow `force-dynamic` round trip and undoes the
  scroll-to-today. Proven by a reverted experiment: with `{ scroll:
  false }` the row lands at `top 536`, Today disables. The fix lives in
  `useCalendarNavigation.ts:191` — **not in C10's boundary.** Builder
  stopped, correctly.
  Item 1's live evidence scoped honestly: the clean `null` path is behind
  `proxy.ts`'s own gate for a Server Action POST, so it proved
  *boundedness* after a real session lapse (16 → 20, flat) rather than
  the exact branch; the pure tests cover the predicate.
  **Lesson for the checklist:** grepping what a file *exports* before
  forbidding it was not enough here — the question is *which file the
  fix actually lives in*, and a scroll-after-navigation bug lives in the
  navigation hook, not the view.

### C11 — Today must arrive: preserve scroll on Schedule's navigation only
- **Status:** DONE — see `git log`.
- **Report:** `preserveScroll` option on `navigateTo`/`goToToday`; passed
  from exactly one call site, Schedule's not-loaded fallback. **Outcome
  measured, production build, Chromium 375×812:** Month→Next×6→picker→
  Schedule→Today and a +200d deep link→Today both land today's row at
  `top 536`, Today **disabled**, **one** navigation, flat over an 11s
  poll. **Pre-fix control on the same walk:** `scrollTop` → 0 at t=2s,
  row at `top 1083` — Strange's defect reproduced on demand. Week/Day/
  Month: `scrollTop === 0` after Next and after Today, unchanged; Week
  HTML byte-identical after normalising build hashes. No unit test — the
  effect is what reaches `router.push`, which the existing test file's
  own header already scopes out as needing a real router; the builder
  declined to invent a mock that would test its own wiring.
- **Fix:** the builder's experiment was a *blanket* `{ scroll: false }` on
  `useCalendarNavigation.ts:191`. **Not acceptable as-is**: Week, Day and
  Month are live and paging them *should* start at the top. Scope it:
  `navigateTo`/`goToToday` gain an optional `{ preserveScroll?: boolean }`;
  `CalendarViews.handleToday`'s **Schedule branch** passes it; every other
  caller is untouched. Then `ScheduleView`'s re-armed scroll-to-today (C10)
  is no longer undone.
- **Evidence:** the outcome, not the mechanism — Month → Next ×6 → picker
  → Schedule → Today, and a +200d deep link → Today: today's row `top`
  inside the viewport, Today **disabled**, no further navigation, on a
  production build at 375×812. **And** Week, Day, Month: after Next and
  after Today, `scrollTop === 0` — provably unchanged.
- **Boundaries:** may touch `src/lib/useCalendarNavigation.ts`,
  `src/components/CalendarViews.tsx`, `src/lib/useCalendarNavigation.test.ts`
  if it exists · must not touch `ScheduleView.tsx`, `useScheduleWindow.ts`,
  `useScheduleSentinels.ts`, `CalendarHeader.tsx`, `actions/**`, `prisma/**`.
  `CalendarViews.tsx` is at 325/350 — report the count.
- **Both gates blocked on the same under-guarded gesture, from two
  directions; one contract owns all of it:**
  1. **(Vision)** a gesture must never retry a **refusal**-stopped
     direction. Mirror `emptyStreak` in a ref; `extend` reopens+loads
     only when `!hasMore && emptyStreak >= MAX_CONSECUTIVE_EMPTY_CHUNKS`.
  2. **(Strange)** a gesture must fire only when the scroller is
     genuinely at that extremity **and** the gesture points that way —
     not on sentinel intersection, which is page-height dependent and
     permanently true on a short page.
  3. **(Strange)** Today must *arrive*: re-arm `hasScrolledInitially` on
     `initialDayTime` change so a client-side `goToToday()` scrolls.
  4. **(Strange, record correction)** the 54px skeleton-insertion shift:
     wrap the `setLoadingBackward` commits in `prepareAdjustment()` too,
     or reserve the skeleton's height. **Live on iPhones today.**
  5. **(Strange NOTE, cheap, same file)** `rootMargin: "0px 0px -65px 0px"`
     on the today-visibility observer so a row behind the bottom nav does
     not read as visible.
- **Regression tests** for 1 and 2 at the pure level where possible; for
  3 and 4, production-build measurement in Chromium **and** the outcome,
  not the mechanism — the reader's row must land on screen.
- **Boundaries:** may touch `useScheduleWindow.ts`, `useScheduleSentinels.ts`,
  `scheduleWindowState.ts`, `scheduleWindowState.test.ts`,
  `scheduleWindowStateRefresh.test.ts`, `ScheduleView.tsx` · must not
  touch `CalendarViews.tsx`, `CalendarHeader.tsx`, `actions/**`,
  `prisma/**`, `globals.css`, `layout.tsx`.
- **Budget:** after this, **Vision and Strange each get one pass — their
  last.** If either blocks, the mission stops and surfaces.

### C10 (first draft — SUPERSEDED) — Vision's blocker: a gesture must not retry a refusal
- **Status:** SUPERSEDED — folded into the five-item C10 above once
  Strange's pass 2 landed. Kept only as the record of what Vision's
  blocker looked like before Strange's findings were batched with it.
- **Fix:** per Vision above. Plus a regression test: a refusal-stopped
  direction receives a gesture → zero loader calls; an empty-cap-stopped
  direction receives a gesture → exactly one reopen and one load.
- **Boundaries:** may touch `useScheduleWindow.ts`, `useScheduleSentinels.ts`,
  `scheduleWindowState.ts`, `scheduleWindowState.test.ts` · must not touch
  `ScheduleView.tsx`, `CalendarViews.tsx`, `actions/**`, `prisma/**`.
- **Budget note:** Vision has produced two verdicts (both BLOCKED) across
  four instances; the next is treated as **pass 3, the last**.

### Captain, pass 3 — BLOCKED, and the 3-pass budget is spent

**The blocker:** `scheduleWindowState.test.ts` is **768 lines** — 118 over the
**650 hard cap**, with no justification in its header. It was 419 at pass
2 (a soft-cap NOTE); C7 and C8 grew it 349 lines without the split the
constitution names as the remedy. Only file in the repo over 650.
**Fix:** split at line **497** — the retained file keeps the pure
transforms (primary concern, bare name); a new
`scheduleWindowStateRefresh.test.ts` takes `refreshChunkFor`, the DST
block, and the C5/C7 refresh regressions. **Two constraints Captain
checked:** that cut leaves `withTimeZone` entirely in the moved half, so
the count stays at **four** and no fifth copy appears (which would be its
own BLOCKER under the clause Bryce approved); and no new directory, so
none of the three hand-enumerated globs changes.
**Captain's own ruling on re-gating:** the fix touches **no application
source**, so it *"cannot invalidate Vision's correctness verdict… does
not need a correctness re-gate — only a confirmation that the suite count
is unchanged and the DST cases still skip under UTC."*

**Fury's brief was wrong three times:** `useScheduleSentinels.ts` was
described as 134 → 179 and "a precedent you accepted" — it was **added**
in this scope, Captain had never seen it; the test file was 419 → 768 not
362 → 689; `scheduleWindowState.ts` was 319 → 445 not → 384. All three
were numbers copied from C7's report instead of re-measured — the
checklist item that already existed. Captain gated the real tree anyway.

**NOTES worth carrying:** `ScheduleView.tsx` **406** — split candidate
`ScheduleMonthSection.tsx` (~110 presentational lines, the part CV4/CV5
will touch); `scheduleWindowState.ts` **445** — split candidate is the
render projection, mirroring the test split; `ScheduleView.tsx:8-11`
still says the view is not wired in — **delete**; `actions/tasks.ts` 426.
**Inline per-member differences beside `VIEW_CONFIG` went 1 → 3** —
Captain did *not* block, with reasoning on record: the members those
ternaries would mislabel (`threeDay`, `year`) are unbuilt *and* fall
through to the correct answer, so the harm the clause names does not
obtain. It declined to force a discriminated `todayCircle` shape on one
data point because CV4 may want a third sourcing mode; **trip condition,
keyed to definitions: a second per-member difference for the Today circle
forces the discriminated shape. CV4 owns this.**
**Its four amendments all hold against the tree** — no upward imports in
either new hook, still two span-cap copies, still four `withTimeZone`,
nothing of the renamed-file class. **But one now misdescribes the code**:
the read-action clause says refuse with the empty value; C6 made refusal
`null` to fix a real bug. Captain wants the *rule* corrected, not the
code — text drafted, **awaiting Bryce**.

### C9 — the hard-cap split, and the stale header
- **Status:** DISPATCHED
- Split `scheduleWindowState.test.ts` at line 497 per Captain, verifying
  `withTimeZone` stays at four definitions and the test count is
  unchanged; delete `ScheduleView.tsx:8-11`.
- **Boundaries:** may touch `src/lib/scheduleWindowState.test.ts`, new
  `src/lib/scheduleWindowStateRefresh.test.ts`, `src/components/ScheduleView.tsx`
  **comment lines 8–11 only** · must not touch any other file, any
  application logic, `package.json`, `.github/**`.

### Strange, pass 1 — BLOCKED

**It re-measured its three decisive findings against a PRODUCTION build**,
because two could have been dev-only artifacts. One was — the dev build
exaggerated B2, and it reported the honest production number instead.

**B1 — the Today circle is permanently disabled on Schedule, asserting
"you are already on today" while the screen shows two months away.**
`isCurrentPeriod: (anchor, today) => isSameDay(anchor, today)` — and
scrolling deliberately never moves the anchor, so it is true forever.
Measured `disabled:true, opacity:0.4` at rest *and* scrolled to the last
loaded day. Shipped Week is the contrast: disabled on the current week,
enabled the moment you page away — **so the family has already learned
that a greyed Today means "you're here."** There is no way back to today
but a reload. **Fury's gap:** the contract asked for "Today scrolls if
loaded, else navigates" without checking `isCurrentPeriod` could express
it.

**B2 — the viewport lurches 696px up on prepend in Chromium, and the
cause is a correct comment with a wrong conclusion.**
`useScheduleWindow.ts:202` says *"WebKit has no `overflow-anchor`"* —
true — and manually corrects. But **Chromium's native anchoring is on**,
so the correction lands **twice**: measured `dST` is exactly `2 × dH` on
every run, 3/3, net **−696px**, 86% of an 812px viewport, in under half a
second. Decisive control: injecting `*{overflow-anchor:none}` gives
`dST == dH` and `refJump 0.00`.
**⚠️ iOS Safari is unaffected — this reads fine on a phone and fails on
laptop and Android. Do not "verify" the fix on an iPhone alone.**

**B3 — 100 POSTs and ~11 seconds of skeletons on every open, on the
household's real data, to display 4 rows.** Production build, zero
interaction: 10 posts at 1s, 32 at 3s, 64 at 6s, settling at **100** with
both skeletons up until ~11s. Cause: `MAX_CONSECUTIVE_EMPTY_CHUNKS = 24`
× 30 days × **both directions** ≈ 720 days scanned unprompted.
**This is Fury's number, chosen in C6 without asking what it means on a
sparse calendar — and a sparse calendar is this household's normal
case.** My own comment beside it claims the cap is *"not a limit anyone
should expect to hit in practice"*; the real data falsifies that on every
single open. It also has a correctness face — 100 unprompted calls to a
public POST endpoint per view open — which Vision should own.

**NOTES:** the sticky month header **does not stick** (`globals.css:125`'s
`overflow-x: hidden` on `body` makes `position: sticky` inert app-wide —
**pre-existing**, the shipped Week header measures the same), but
`calendarViewConfig.ts:134` justifies freezing the header title *on the
belief that it works*; a residual **54px** jump when a skeleton is torn
down in the same commit as a prepend, which survives the B2 fix; and
`TodayEmptyRow` still hand-copies `DaySection`'s gutter.

**Passed, measured:** the **four-state distinguishability holds** — the
mission's sharpest design question. Loading (grey bars), empty-today
(dashed box + CTA), outside-window (solid + `CalendarOff`), and
direction-stopped (centred muted prose, 4.75:1 / 6.81:1) are mutually
unmistakable, and the boundary messages are gated on `!loading` — at
t=1s both read false with skeletons up. No overflow at 375 or 320; no tap
target under 44px; **reachability scanned across every scroll position,
not one** — its first pass flagged a Week card as occluded and that was
its own instrument measuring a single position, the exact error DESIGN.md
warns about. Week/Day/Month unchanged. And Schedule **does** read as a
distinct view, not Week unwalled.


### C6 — Vision's B1 and B3 (sentinel re-arm; refusal vs. emptiness)
- **Status:** DONE — in `6d06e7b` (with C7)
- **Boundaries:** may touch `useScheduleWindow.ts`, `scheduleWindowState.ts`,
  `scheduleWindowState.test.ts`, `actions/calendar.ts`, `actions/tasks.ts`,
  new `useScheduleSentinels.ts` (cap extraction, Captain's named candidate)
  · must not touch `TaskDetailSheet.tsx`, `ScheduleView.tsx` (C7's),
  `scheduleWindow.ts`, `CalendarViews.tsx`, `page.tsx`, `prisma/**`.
- **Report:** B1 proven 4 → 102 requests, flat for 6s, on real data with
  zero manual scroll. B3: actions return `null` on refusal / `[]` on
  empty; `applyChunkResult` stops only on `null`. Cap set to 24 — **later
  found wrong by Strange (C8 cut it to 3).**

### C7 — Vision's B2 (task moved >7 days vanishes)
- **Status:** DONE — in `6d06e7b` (with C6)
- **Boundaries:** may touch `TaskDetailSheet.tsx`, `ScheduleView.tsx`,
  `scheduleWindowState.test.ts` · must not touch `useScheduleWindow.ts`,
  `scheduleWindowState.ts`, `actions/**`, `scheduleWindow.ts`,
  `CalendarViews.tsx`, `page.tsx`, `prisma/**`.
  **⚠️ Overlapped C6 on `scheduleWindowState.test.ts` — Fury's error;
  both sets of tests survived by luck, not design. Now a checklist item.**
- **Report:** `onChanged` carries the updated record; old and new day both
  refreshed; `selectedTask` re-seated. Builder declined to fabricate a
  failing second-edit case and named edit-then-delete as where re-seating
  matters — **Vision's final pass confirmed exactly that case.**

### C8 — Strange's three blockers
- **Status:** DONE — see `git log` for the hash (recorded after commit, per checklist)
- **B1** Schedule drives Today's disabled state from its own scroll
  position, not the anchor; `onToday` scrolls if loaded, navigates if not.
- **B2** `overflow-anchor: none` on Schedule's scrolling container — the
  manual mechanism requires being the *only* corrector. Correct the
  comment: WebKit's gap is real, the conclusion drawn from it was not.
- **B3** cut the empty-chunk cap to 2–3 and let a further scroll gesture
  extend it, rather than scanning ~720 days unprompted. Correct the
  comment that calls the cap unreachable.
- **Boundaries (as dispatched):** may touch `useScheduleWindow.ts`,
  `ScheduleView.tsx`, `CalendarViews.tsx`, `CalendarHeader.tsx`,
  `scheduleWindowState.ts`, `scheduleWindowState.test.ts`,
  `calendarViewConfig.ts` · must not touch `globals.css`, `layout.tsx`,
  `DaySection.tsx`, `actions/**`, `prisma/**`.
  **Boundaries (as shipped, per Vision's audit):** additionally
  `useScheduleSentinels.ts` (+45, the extend gesture — **undisclosed in
  the report's boundary line**) and new `useScrollAnchor.ts` (disclosed in
  prose, contract-required by the cap clause). Both Schedule work, neither
  dangerous; recorded so the next audit has the true list.
- **Report:** all three fixed, all three measured on a **production**
  build. **B2 proven with a control**: ratio 1.00 across three prepends
  as shipped; forcing native `overflow-anchor` back on reproduces exactly
  2.00. The 54px residual NOTE was the same root cause — gone. **B3 on the
  household's real 4 events: 100 requests / 14.3s → 16 / ~3s**; a distant
  event at +200 days still reached by continued scrolling (18 further
  requests, gesture-driven). **B1**: Today disabled at rest, enabled when
  scrolled away, disabled again after tapping; deep-linked 300 days out it
  *navigated* — the previously unreachable path. Week/Day/Month
  re-verified. Tests 297 → **302**. `CalendarHeader.tsx` untouched — the
  existing props sufficed.
  **Deviation, contract-required:** new `src/lib/useScrollAnchor.ts`
  (95) — `useScheduleWindow.ts` was at 349/350 and the fix had to sit
  beside the correction it interacts with; extracted the whole anchoring
  mechanism, per the `useScheduleSentinels.ts` precedent. **Captain must
  re-gate this** — a new file and a grown one (`ScheduleView.tsx` now
  **406**, over the soft cap) after its PASS.
  Two stale comments in `ScheduleView.tsx` (lines 8, 63) still say C4
  hasn't happened; C8 correctly left them — not among its three named
  fixes. **For delivery.**
  The builder also caught that Fury's dispatch named the wrong HEAD
  (`a6e6a86`; actual `6e496a1`) — second time this mission a gate or
  builder was handed a stale hash, *after* the checklist item was added.

### Vision, pass 1 (fresh run) — BLOCKED, four blockers, three of them things the family would hit

**It gated `b1c18af`, not the `eb3e67b` Fury's dispatch named** — the
dangling pre-amend commit — and said so. Captain caught the same thing
independently. That stale hash is Fury's empty-commit error propagating
into two gate dispatches.

**B1 — scrolling up never loads earlier days at 375×812, the app's target
viewport.** Verified on real data: four scroll-to-top gestures produced
**zero** backward requests and no "as far back" message; the list silently
ends. Mechanism, isolated: the top sentinel is *already inside*
`rootMargin: "100% 0px"` when the observer attaches, that single callback
is swallowed by `backwardInFlight` (the mount effect started the same
load), and `IntersectionObserver` only fires on **transitions** — on a
1781px page the sentinel never leaves the margin, so it never fires again.
At 300px (sentinel starts outside the margin) the first scroll worked.
**Fails Done #2 on the household's own data.**

**B2 — a task edited more than 7 days away vanishes until remount.** Same
class C5 just fixed. `ScheduleView.tsx:296` calls
`refreshDay(…selectedTask.dueDate)` with the **stale** record, so moving
Sep 10 → Sep 25 refreshes `[Sep 3, Sep 17)`, the fetch doesn't return it,
and `mergeWindow` reads overlapping-but-absent as deleted. A 3-day move
survives; that control is what makes it decisive.

**B3 — one empty 30-day chunk permanently walls off everything beyond it.**
Verified live: deep-linked to Oct 20, both directions stopped on their
first chunk and nine September items were unreachable — zero day rows, two
stop messages. Real scenario: today Sep 4, Thanksgiving on Nov 26, nothing
in between → forward stops at Oct 4 and Nov 26 is never reachable by
scrolling. **The root cause is D2**: refusal and emptiness both return
`[]`, so the hook cannot tell "you may not have this" from "there is
nothing here". Contradicts the plan's "endless".

**B4 — the mission record does not match what was authorised.** `fetchTasks`
was added in C3; Fury's *dispatch* authorised `actions/tasks.ts` but the
mission file's C3 contract does not list it, and **C3b and C5 have no
written contract at all** — so a boundary audit had nothing to audit
against. Third time this arc. Fury's.

**NOTES worth keeping:** the "structurally unable to disagree in ANY
timezone" comment **overclaims** — a full sweep of every day of 2026 found
zero drops at or west of UTC under both server zones, but drops *and*
extras strictly east of UTC with a UTC server; scope the claim.
**A kid reads every household event and task, and Vision ruled that
correct** — the page already renders everything to any verified user and
the plan's line is about mutation. Endpoint attacks all held: nonexistent
userId dies at the DAL with `200 []`, every malformed input refuses, the
cap holds at exactly 124 days + 1ms.

### 🧪 The Fable experiment — result

Captain ran on **Fable** this mission (Bryce's call) against CT2's Opus
baseline. It returned **BLOCKED with two real blockers, both of which Fury
missed**, and both verified rather than read:

1. **`useScheduleWindow.ts:33-34` imports Server Actions from
   `@/app/actions/`.** The layout map's `src/lib/` row says plainly what
   never lives there: *"Anything importing from `app/` or
   `components/`."* Captain grepped and confirmed it is the **only** such
   import in `src/lib/` — no precedent to shelter behind. Its fix is
   better than a patch: **inject the fetchers as parameters** from
   `ScheduleView` (a component, which *may* import actions). And it saw
   the consequence Fury did not: **that removes the root cause C3b worked
   around** — with fetchers injected the hook never reaches `dal.ts` at
   all. It still recommends keeping C3b's split on its own merits, but
   says the file's header must stop citing a chain that will no longer
   exist.
2. **`MonthLoadingSkeleton.tsx` still exists, and `STRUCTURE.md:289` says
   it "must not survive CV3."** This is CV3. Captain checked missions
   12–15 and confirmed nobody re-based that deadline — **and noted the
   builders could not have known, because Fury never carried it into the
   mission file.** Fury's omission, two-line fix.

**~~Verdict on the experiment: Fable held its own, and arguably better.~~
RETRACTED, 2026-09-04.** Bryce's `/usage` showed **Fable at 0%** after
both Captain runs that were dispatched with an explicit `model: fable`.
Two probes run afterward (a bare `general-purpose` with `model: fable`,
and a bare `vision` with no override) both reported `claude-fable-5-1` —
so both mechanisms resolve correctly **now**. But an earlier Vision run,
configured `fable`, died with an error naming `claude-opus-4-8`, and 0%
usage is not consistent with two real Fable gate runs. **Whether Captain's
CV3 verdicts were produced by Fable is therefore unverified**, and the
"held its own" conclusion was a claim whose evidence did not support it —
the exact failure the gates spent all day catching. What *can* be said:
a Captain run that was **asked** to be Fable found two real blockers. The
`claude-code-guide` agent has been asked how model resolution, rate-limit
fallback, and `/usage` accounting actually work; its answer goes here.
Until then the experiment is **unrun**, not passed.

**Follow-up, same day — three probes and a doc lookup:**
- `claude-code-guide` (from the docs): subagent model resolves
  per-invocation param → frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL` →
  parent model. **No 429 fallback is documented. Precedence between
  `~/.claude/agents/` and `.claude/agents/` is not documented.** `/usage`
  attribution of subagent tokens to a specific model allowance is not
  documented. Subagents receive CLAUDE.md + git status + tool schemas,
  **not** the conversation — so the ~90–160k per-dispatch floor is
  CLAUDE.md (5,100 lines) plus schemas, scaling with the agent's tool
  count (banner/haiku ≈ 90k, vision ≈ 119k, general-purpose ≈ 157k).
- Probe: `banner` with the **repo** copy set to `sonnet`, user copy
  `haiku` → reported **Haiku**. Ambiguous.
- Probe: **both** copies set to `sonnet` → **still Haiku.**
  **Conclusion: agent definition files are read once at session start.
  Mid-session edits have no effect until restart.** This is an
  undocumented drift vector: the 2026-09-03 model "fix" recorded in
  CLAUDE.md could not have taken effect in the session that made it.
  The repo-vs-user precedence question **cannot be answered without a
  restart** — set the copies to differ, restart, probe. Both files
  reverted; repo copy byte-identical to HEAD.
- **Consequence for the Fable mystery:** if the harness resolved
  `vision: fable` at session start while Fable's limit was exhausted and
  cached a fallback, every Vision run this session ran on it regardless
  of the file — consistent with the `opus-4-8` error and 0% Fable. Still
  a hypothesis; the docs are silent. Whether Captain's explicit
  `model: fable` bypassed the cache is likewise unverified — the probes
  that returned Fable ran only after the session's own model was switched.

Separately measured: a trivial probe subagent costs **~120–160k tokens**
with zero tool uses — the fixed cost of loading CLAUDE.md (5,100 lines)
plus tool schemas. At ~40 dispatches this session that is several million
tokens of overhead before any agent did anything. Worth a decision.

### 🛑 BLOCKER — a task silently vanishes. Found by Vision, reproduced by Fury.

Vision died to a session rate limit mid-report, but its fragment named the
finding: *"Sequence 3 matches exactly what I observed live (Sep 11 task
vanished after completing Sep 4's)."* `SendMessage` is unavailable in this
session, so Fury could not resume it — and reproduced it independently
instead.

**Mechanism, proven:** `taskToScheduleEvent`
(`scheduleWindowState.ts`) gives a task the span
`startAt = endAt = dueDate`, a **UTC-midnight** instant (CT1's
convention). `overlapsWindow` (`scheduleWindow.ts`) compares that against
**browser-local-midnight** window bounds. But `fetchTasks`
(`actions/tasks.ts`) converts those same bounds *to UTC midnight* before
querying. **In the gap between the two coordinate systems — exactly one
UTC offset wide — a task is "inside the window" to the merger and
"outside" to the fetcher.** `mergeWindow` then reads its absence as a
server-side deletion and drops it.

Reproduced deterministically:

| TZ | merger says overlaps | fetch returns it | survives |
|---|---|---|---|
| `America/Denver` | **true** | false | **❌ dropped** |
| `America/Los_Angeles` | **true** | false | **❌ dropped** |
| `UTC` | false | false | ✅ |
| `Asia/Tokyo` | false | false | ✅ |

**It only bites west of UTC — the entire household — and is invisible in
UTC, which is where CI and Vercel's server run.** A family member
completes any task and a task roughly a week out disappears from their
view until reload. **BLOCKER.**

This is the *second* bug at the UTC-midnight/local-midnight seam this
mission (C3 caught the first). The seam itself is the finding: CT1's
storage convention and D3's unpadded local window are each correct and
meet badly wherever the two are compared without conversion.

## Handoff log

- 2026-09-04 — Opened on `claude/calendar-cv3-schedule` from `main` at
  `34496f9` (the merged calendar). Banner reported; brief accepted with
  one correction (it misattributed Captain's extraction ruling). **D1
  departs from the plan deliberately** — the app is live now, and removing
  Week/Day would make `DEFAULT_CALENDAR_VIEW` name an unbuilt view.
- 2026-09-04/05 — C1–C11 built and gated across two session limits (see
  the ledger; every verdict is recorded there). HEAD `6598c0b`, tree
  clean. **Final gates, both on `6598c0b`: Vision pass 3 BLOCKED (2),
  Strange pass 3 PASS, Captain pass 2 PASS (pass 3's blocker fixed by C9,
  count-checked by Captain, 4th pass declined pending Bryce).** Per the
  doctrine the mission STOPPED; C12 is drafted above with the evidence and
  boundaries it needs, and waits for Bryce to authorize a 4th Vision pass.
  **Also found and fixed in this file:** a 126-line block (the ledger,
  Strange pass 2, Vision final instance) had been duplicated by an earlier
  insertion — deleted; the first-draft C10 it exposed is marked
  SUPERSEDED. **A fresh session resumes from:** the Status line, the C12
  contract, and `git log` — trust git over prose.
- 2026-09-05 — Bryce chose "C12 + one more Vision pass" over ship-as-is
  and stop. C12 dispatched to Stark. Next: Vision pass 4 on the delta
  only, then delivery (push, PR, CLAUDE.md, merge).
- 2026-09-05 — C12 DONE `4b10184`, both pre-fix controls reproducing
  Vision's own numbers. Fury audited the diff: boundary clean (3 files),
  the generation guard traced by hand including the `finally` case, all
  three overclaiming comments rewritten. **Vision pass 4 dispatched on the
  delta `6598c0b..4b10184`.** Nothing commits while it runs.

## Delivery

- **Shipped:** the Schedule view — one continuous list of days, endless in
  both directions, today always present, events **and** tasks. Twelve
  contracts, **ten gate verdicts** (Captain 3, Vision 4, Strange 3; two
  further Vision instances died to rate limits before reporting). Tests
  **252 → 310**, green under Denver, UTC and Los Angeles.
- **Final verdicts, all on the shipped tree:** Vision pass 4 **PASS**
  (`483ed2f`, zero blockers, 8 notes); Strange pass 3 **PASS**
  (`6598c0b`, zero blockers, 3 notes); Captain pass 2 **PASS** plus a
  count-check on C9's test split — **Bryce accepted the count-check over a
  4th Captain pass, 2026-09-05.**
- **The budget extension, on the record:** Vision blocked three times and
  the doctrine stopped the mission. Bryce chose "C12 + one more Vision
  pass" over shipping with two blockers open or abandoning the branch.
  C12 closed both, with pre-fix controls reproducing pass 3's own numbers.
- **Deliberate leftovers, each routed:** `useScheduleWindow.ts` 431/350
  (soft-cap NOTE; split candidate the two loaders → `useScheduleLoaders.ts`)
  → follow-up mission. The explicit per-direction stop `status` +
  generation refactor — **four fix contracts in a row each opened a new
  edge in this state machine (C6, C8, C10, C12)**; the state machine
  *infers* why an edge stopped instead of recording it, and `refreshDay`'s
  missing generation guard folds into the same refactor → its own contract
  before anything builds on this hook (nothing in CV4/CV5 does). The
  grandfathered-debt migrations (3 `toDateInputValue`, 4 `withTimeZone`,
  2 span-cap copies, the duplicated task SELECT+mapper). The sticky month
  header — **root cause now measured**: `globals.css:123-126` sets
  `overflow-x: hidden` on **both `html` and `body`**, which computes
  `overflow-y` to `auto` and makes `body` a scroll container that never
  scrolls, so **every `position: sticky` in the app is inert** — including
  `ScheduleView.tsx:267` and `RecipeList.tsx:206`, both already coded to
  stick. → follow-up mission F4, **Bryce-approved 2026-09-05** with his own
  refinement ("pinned… until it changes months") and Fury's sub-decision
  that the label lives in the pinned bar only, retiring the double label
  and the stale `calendarViewConfig.ts:134` comment that justifies freezing
  the title *on the belief that sticky works*.

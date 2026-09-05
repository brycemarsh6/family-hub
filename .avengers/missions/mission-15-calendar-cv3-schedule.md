# Mission: CV3 — Schedule, the continuous list

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-09-04 · **Updated:** 2026-09-04

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

### C10 — Vision's blocker: a gesture must not retry a refusal
- **Status:** PENDING — **waits for Strange's verdict, then batches with
  any Strange findings.** No dispatch while a gate runs.
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

## Delivery

_Pending._

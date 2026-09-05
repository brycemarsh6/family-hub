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

### C8 — Strange's three blockers
- **Status:** DISPATCHED
- **B1** Schedule drives Today's disabled state from its own scroll
  position, not the anchor; `onToday` scrolls if loaded, navigates if not.
- **B2** `overflow-anchor: none` on Schedule's scrolling container — the
  manual mechanism requires being the *only* corrector. Correct the
  comment: WebKit's gap is real, the conclusion drawn from it was not.
- **B3** cut the empty-chunk cap to 2–3 and let a further scroll gesture
  extend it, rather than scanning ~720 days unprompted. Correct the
  comment that calls the cap unreachable.
- **Boundaries:** may touch `useScheduleWindow.ts`, `ScheduleView.tsx`,
  `CalendarViews.tsx`, `CalendarHeader.tsx`, `scheduleWindowState.ts`,
  `scheduleWindowState.test.ts`, `calendarViewConfig.ts` · must not touch
  `globals.css`, `layout.tsx`, `DaySection.tsx`, `actions/**`, `prisma/**`.

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

**Verdict on the experiment: Fable held its own, and arguably better.** It
verified rather than read (grepped the import; ran both new test files in
isolation to prove no database in their graph), corrected the record on
C3b's rationale, declined to invent a rule where form (a) already covered
the case, and drafted four amendments while marking none a condition of
passing. Its sharpest note is about a **security number**: the 124-day cap
is now defined twice, once per endpoint, and *"the cap is a security
number for two public endpoints that must agree."*
It also caught an irony Fury missed: **the task select and mapper now
exist twice — created in the same mission whose C1 extracted the event
query to prevent exactly that.**
One data point, not proof; nothing here argues for putting Captain back
on Opus.

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

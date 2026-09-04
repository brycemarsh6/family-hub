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
  then restoring it is rework. **Awaiting Bryce; default is keep.**
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
  for this mission** — Bryce's experiment to get a real comparison against
  CT2's Opus baseline on this same codebase.

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

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Handoff log

- 2026-09-04 — Opened on `claude/calendar-cv3-schedule` from `main` at
  `34496f9` (the merged calendar). Banner reported; brief accepted with
  one correction (it misattributed Captain's extraction ruling). **D1
  departs from the plan deliberately** — the app is live now, and removing
  Week/Day would make `DEFAULT_CALENDAR_VIEW` name an unbuilt view.

## Delivery

_Pending._

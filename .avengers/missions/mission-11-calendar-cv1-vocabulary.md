# Mission: Calendar CV1 — the view vocabulary, the picker, and last-used persistence

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (two serial contracts — they share files, so they cannot run in parallel)
**Started:** 2026-09-03 · **Updated:** 2026-09-03
**Plan:** `.avengers/plans/calendar-v2.md` — phase CV1
**Branch:** `claude/calendar-cv1-vocabulary`, stacked on `claude/calendar-cv0-extract` (which is stacked on K2's PR #10, itself on K1's PR #9 — **four deep, none merged**, by Bryce's decision to hold production until the Calendar is genuinely usable)

## Brief

- **Goal:** teach the calendar the six view names Calendar v2 needs
  (**Schedule / Day / 3 Day / Week / Month / Year**) without building any of
  the new views, and close the gap Captain found in CV0's totality
  mechanism first. No visual change beyond the picker's contents.
- **Done means:** `VIEW_CONFIG` covers **all five** per-view differences, not
  two, so a new view cannot silently inherit Day behaviour;
  `CalendarPeriodView` holds six names with **explicit** `stepPeriod` /
  `periodAnchor` / `withView` arms for each; the picker still offers only
  views that actually render; opening `/calendar` with no `?view=` restores
  the last view used **on that device**; `loading.tsx` no longer decides its
  skeleton from a hardcoded string. Week / Day / Month behave **exactly** as
  they do today, proven by the same trace method CV0 used.
- **Out of scope:** Schedule, 3 Day and Year *renderers* (CV3/CV4/CV5), the
  timeline library (CV2), tasks (CT1), the month dropdown and swipe (CV6),
  and any change to how events are fetched.

## Danger register

⚠️ **`DATABASE_URL` is the Neon `dev` branch** — a copy-on-write clone of
production holding a **real snapshot of family data, password hashes
included**. Isolation is not privacy.
- **Never print `.env`**, and **never quote a real event title** into a
  report — both happened once in this arc.
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- Test data only via `db:seed-calendar` / `db:clean-calendar`; restore
  `calendarEvent` **4** and `user` **5** (4, not 3 — Bryce added a real
  event), confirmed by direct read.
- **Never create, update, or delete `User` rows.** Minting a session cookie
  for an *existing* user is permitted (the Phase-1e pattern).
- Migrations: **none in this mission.** A contract wanting one is
  BLOCKED-ON-CONTRACT.
- **Never `git add -A` or `git add .`** — stage by explicit path. Fury swept a
  parallel builder's in-flight work into a documentation commit in mission 10
  doing exactly this.
- Never push or open a PR without Fury. Builders may commit their own
  contract on this branch.
- **Nothing is currently serving the repo** — a stale `next dev` was killed at
  the end of mission 10. Start your own; pick a Chrome debug port distinct
  from 9222/9333/9444/9555.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins `TZ=America/Denver` **inside the script** — so
  `TZ=UTC npm test` silently runs Denver twice and proves nothing)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  — **the direct invocation is the only honest second-timezone run**
- `npm run build`

Baseline **182/182**. Each contract reports its own delta; Fury reconciles.

## Assembled

- Stark ×2 (serial — both contracts touch `CalendarViews.tsx` and
  `useCalendarPeriod.ts`, so they cannot be parallel) + Vision.
- **Captain** — this mission exists partly to close *its* CV0 Ruling 2, it
  widens a type the whole branch keys off, and it decides where the
  last-used-view preference lives. Captain's call.
- **Strange — not assembled.** The only visible change is the picker's
  contents. If a gate sees anything else move, that is a BLOCKER and Strange
  comes in.
- Banner — not needed; CV0's gate reports cite every seam.

## Contracts — serial, C1 then C2

### C1 — Close Captain's Ruling 2: all five per-view differences into `VIEW_CONFIG`
- **Status:** PENDING (dispatch first)
- **Why first:** CV0 shipped a `Record<CalendarPeriodView, ViewConfig>` whose
  totality is compiler-proven — but Captain probed it and found it covers
  only **2 of 5** per-view differences. `days` (`CalendarViews.tsx:131`),
  `isCurrentPeriod` (:140) and `title` (:150) are still ternaries with a
  trailing `: <day behaviour>` catch-all, so **adding a view compiles clean
  and silently renders a Day title over a single-day array.** That is the
  `stepPeriod` catch-all-else hazard `calendar-v2.md` already names,
  reproduced one file over. Closing it **before** C2 widens the union is what
  makes the widening safe.
- **Objective:** promote `title`, `days` and `isCurrentPeriod` into
  `ViewConfig` as functions, so the totality check covers every per-view
  difference. Pure refactor on today's three views — **no new view names.**
- **Shape:** the builder's, but the natural form is
  `title: (anchor: Date, today: Date) => string`,
  `days: (anchor: Date) => Date[]`,
  `isCurrentPeriod: (anchor: Date, today: Date) => boolean`, with the
  null-guards staying in the component (they are about `today` not having
  resolved, not about the view). Keep `CalendarViews.tsx`'s existing comment
  honest: it currently claims "a new view ADDS A ROW, it doesn't add a branch
  to three separate expressions" — **true of 2 differences today, false of
  3.** After this contract it becomes true; say so rather than leaving the
  claim ahead of the code.
- **Also in scope, both CV0 leftovers in files you already touch:**
  - `CalendarHeader.tsx:44` hand-writes `"week" | "day" | "month"` instead of
    importing `CalendarPeriodView`. It is a compile tripwire (it errored in
    Captain's probe), so C2 would be forced to touch it anyway — fix it here.
  - `MonthLoadingSkeleton` (the **wrapper**, not `MonthGridSkeletonRows`) has
    **zero callers repo-wide** and its comment justifies it with a
    speculative future caller that does not exist and is not planned (CV4
    replaces that skeleton). Under STRUCTURE.md's dormant-export rule this
    reaches the two-mission threshold now. **Delete it**, or give it a dated
    expiry — state which and why.
- **Boundaries:** may touch `src/components/CalendarViews.tsx` (267),
  `src/components/CalendarHeader.tsx` (128),
  `src/components/MonthLoadingSkeleton.tsx` (76). **Must not touch**
  `useCalendarPeriod.ts`, `useCalendarNavigation.ts`, `calendarPaging.ts`,
  `calendarDates.ts`, `monthLayout.ts`, `EventForm.tsx` (**350, at cap**),
  `MonthGrid.tsx`, `DaySection.tsx`, `page.tsx`, actions, `prisma/**`.
- **Verification:** the gauntlet, both timezones, **182 unchanged** (a pure
  refactor moves no test). Then **the trace**, the same method CV0 proved
  twice: pin a worktree at this branch's base, capture a multi-step
  Week/Day/Month walk (load, Next ×2, Prev ×2, Today real and inert, view
  switch, Month day-cell tap, Back, Forward) recording header title,
  `location.search`, arrow labels and disabled states, card/cell counts and
  the views container's full `innerText`, run it before and after, and
  **`diff` must be empty**. Include a **positive control** — deliberately
  change one rendered string, confirm the trace moves, revert — because an
  empty diff from a harness that cannot see the change proves nothing.
- **Evidence required:** `wc -l` before/after (all under 350); the empty
  trace diff with its md5s and the positive control's line delta; both
  timezone counts; a `tsc` probe showing that adding a member to
  `CalendarPeriodView` now errors on **all five** fields, not two.
- **Done criteria:** the probe errors on five fields; empty trace diff;
  gauntlet green; `MonthLoadingSkeleton`'s fate decided and stated.

### C2 — The six view names, explicit cursor arms, the picker, and last-used persistence
- **Status:** PENDING (after C1 — shares files)
- **Objective:** widen `CalendarPeriodView` to
  `"schedule" | "day" | "threeDay" | "week" | "month" | "year"`, give every
  view an explicit arm in the cursor math, gate the picker to views that
  actually render, and restore the last-used view per device.
- **⚠️ The design tension this contract must resolve, and state its
  reasoning for:** the union widens to six, but only three views render.
  `parseViewParam` currently falls back to `"week"` for anything unknown, so
  a deep link to `?view=year` today would need *something* to render.
  **Fury's guidance, not a mandate — argue if you disagree:** widen the
  *vocabulary* (union, `VIEW_CONFIG` rows, cursor arms — all real, testable
  data a view will need) but keep a single `BUILT_VIEWS` gate that
  `parseViewParam` and `VIEW_OPTIONS` both read, so an unbuilt view
  normalizes to the default and never reaches a missing renderer. Each later
  phase flips one entry when its renderer lands. **This is the plan's
  "no stubs" rule honoured** — the config rows are data, not placeholder UI,
  and nothing appears in the picker that does not work when tapped.
- **Explicit arms, no catch-alls** (`useCalendarPeriod.ts`): `stepPeriod`
  currently reads `view === "week" ? 7 : 1` — a catch-all that would silently
  step `threeDay` by **one day**. Every view gets a named arm: schedule (no
  step — it scrolls), day 1, threeDay 3, week 7, month `monthOffset ± 1`,
  **year `monthOffset ± 12`**. Year uses **no new offset** —
  `periodAnchor("year")` reuses `monthAnchor` and `withView("year")` is the
  Month arm, which keeps `useCalendarPeriod.test.ts`'s round-trip property
  tests intact rather than needing new state.
- **Last-used view**, via the `lastStore.ts` `useSyncExternalStore` pattern
  (never `useState`+`useEffect` — this project's lint rules correctly forbid
  it, for hydration-mismatch reasons documented in CLAUDE.md). **Read it only
  when `?view=` is absent.** The URL stays the source of truth; a stored
  preference that fights the resync effect would re-invent the C8/C9 drift
  CV0 just spent four contracts killing. Belongs in `useCalendarNavigation`'s
  initial parse, not in the component.
- `loading.tsx:71` decides its skeleton from a **hardcoded**
  `searchParams.get("view") === "month"`. Unlike `CalendarHeader`, this
  produces **no compile error** when the union widens — the three new views
  would silently get the seven-row Week skeleton. Route it through
  `parseViewParam` and a per-view map so `calendar-v2.md`'s promise of a
  measured skeleton per view becomes enforceable rather than remembered.
- **Boundaries:** may touch `src/lib/useCalendarPeriod.ts` (275) + its test,
  `src/lib/calendarPaging.ts` (146) + its test,
  `src/lib/useCalendarNavigation.ts` (283) + its test,
  `src/components/CalendarViews.tsx`, `src/components/CalendarHeader.tsx`,
  `src/app/(app)/calendar/loading.tsx` (104). **Must not touch**
  `calendarDates.ts`, `monthLayout.ts`, `EventForm.tsx`, `MonthGrid.tsx`,
  `DaySection.tsx`, `page.tsx`, actions, `prisma/**`.
- **Verification:** gauntlet both timezones (the count **rises** — report the
  delta). Extend `useCalendarPeriod.test.ts`'s three cursor properties to
  the new views: **Prev∘Next is an exact identity** from every day of every
  month of 2026 for threeDay and year; **Next ×12 in year view visits 12
  distinct consecutive years**; **switching view preserves the anchored
  day**. Then in the running app: the picker still shows exactly the three
  built views; `?view=year` normalizes rather than breaking; picking Month,
  navigating away and returning to a bare `/calendar` restores Month; a
  `?view=` in the URL still wins over the stored preference. **And the C1
  trace again — Week/Day/Month must still diff empty.**
- **Evidence required:** the cursor-property test output; the picker's
  contents; the `?view=year` behaviour; the last-used round trip **and** the
  URL-wins-over-storage case; the empty trace diff; both timezone counts;
  `wc -l` on every touched file.
- **Done criteria:** all of the above, and a `tsc` probe showing a seventh
  view name still errors until it has a `VIEW_CONFIG` row — the mechanism
  must survive the widening it was built for.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Captain | — | — | — |

Budget: 3 passes per gate, then STOP and surface.

## Handoff log

- 2026-09-03 — Opened by Fury immediately after CV0 delivered. Two serial
  contracts (they share `CalendarViews.tsx` and `useCalendarPeriod.ts`).
  C1 closes Captain's CV0 Ruling 2 **before** C2 widens the union, so the
  widening lands on a totality check that actually covers everything.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

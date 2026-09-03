# Mission: Calendar CV0 — extract the navigation cluster; split the test file; the C4 repairs

**Project:** family-hub (Marshee)
**Status:** CONTRACTED (three disjoint contracts, dispatched in parallel 2026-09-02)
**Started:** 2026-09-02 · **Updated:** 2026-09-02
**Plan:** `.avengers/plans/calendar-v2.md` — phase CV0 (the prerequisite for everything after it)
**Branch:** `claude/calendar-cv0-extract`, stacked on `claude/calendar-k2-month` (PR #10, unmerged)

## Brief

- **Goal:** Make room. `CalendarViews.tsx` is at **350/350** and `EventForm.tsx`
  at 350/350; `calendarDates.test.ts` at 349/350. Both K2 gates ruled that
  the navigation cluster must be extracted before another line lands in
  `CalendarViews.tsx`, and Calendar v2 adds three views, a task entity and
  two gestures on top of it. This mission is **pure structural work with
  byte-identical behaviour**, plus the one-source-of-truth repairs K2's
  Captain queued as C4.
- **Done means:** `CalendarViews.tsx` under ~290 with header + a view switch
  only; a new `src/lib/useCalendarNavigation.ts` owning URL↔cursor sync with
  **Vision's compare-and-clear guard** (the C9 residual resolved);
  `periodWindowEdges` and `canStepToPeriod` deleted with their tests;
  `calendarDates.test.ts` split by concern with `calendarDayDiff`'s test at
  home and STRUCTURE.md's adoption list empty; one `hexToRgba`; the Month
  skeleton in `src/components/`; `new/page.tsx` rejecting `2026-02-30`.
  **Week / Day / Month paging behaves identically before and after**, proven
  by a DOM+URL trace, not asserted. Gauntlet green under both timezones.
- **Out of scope:** any new view, any vocabulary change (`threeDay`,
  `schedule`, `year` are CV1), any visual change, `EventForm.tsx`'s own
  extraction (CT1), tasks, drag.

## Danger register

⚠️ **`DATABASE_URL` is the Neon `dev` branch** — a copy-on-write clone of
production holding a **real snapshot of family data, password hashes
included**. Isolation is not privacy.
- **Never print `.env`** — an agent leaked a password fragment doing that in
  K2. Read env values by name only.
- `npm run db:seed` / `npm run db:reset` are **forbidden**.
- Test data only via `db:seed-calendar` / `db:clean-calendar`; restore
  `calendarEvent` **3**, `user` **5**, confirm by direct read.
- **Never create, update, or delete `User` rows.** Minting a session cookie
  for an *existing* user is permitted (the Phase-1e pattern).
- Migrations: **none in this mission.** A contract wanting one is
  BLOCKED-ON-CONTRACT.
- Never push or open a PR without Fury. Builders may commit their own
  contract on this branch with a clear message.
- **Gates that seed calendar data run serially** (their cleanups collide).
  Gates sharing a Chrome debug port must pick distinct ones (K2 lesson).

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins `TZ=America/Denver` inside the script)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  — **the direct invocation**; `TZ=UTC npm test` silently runs Denver twice
- `npm run build`

Baseline **180/180**. Expected after CV0: 180 − 5 (`periodWindowEdges` ×4 +
the `canStepToPeriod` control) + whatever C3 adds for `hexToRgba`. Each
contract reports its exact delta; Fury reconciles the sum.

## Assembled

- Stark ×3 (disjoint boundaries — see below) + Vision.
- **Captain** — new files, a deletion of exported API, a test-file split,
  and the constitution's adoption list. This is Captain's mission.
- **Strange — not assembled.** No visual change is intended; C3's skeleton
  move is a relocation. Vision's byte-identical trace is the check. If any
  gate sees a pixel change, that's a BLOCKER and Strange comes in.
- Banner — not needed; every seam is cited below from the K2 gate reports.

## Contracts — disjoint, run in parallel

Boundary map, so no two builders touch one file:

| file | C1 | C2 | C3 |
|---|---|---|---|
| `src/components/CalendarViews.tsx` (350) | **owns** | — | — |
| `src/lib/useCalendarNavigation.ts` (new) | **owns** | — | — |
| `src/lib/useCalendarNavigation.test.ts` (new, if headless parts exist) | **owns** | — | — |
| `src/lib/useCalendarPeriod.ts` (272, comment :229 only) | **owns** | — | — |
| `src/lib/calendarPaging.ts` (250) + `.test.ts` (228) | **owns** (delete `periodWindowEdges`) | — | — |
| `src/lib/calendarDates.ts` (256) | **owns** (delete `canStepToPeriod`) | — | — |
| `src/lib/calendarDates.test.ts` (349) | — | **owns** | — |
| new `src/lib/calendar*.test.ts` sibling(s) | — | **owns** | — |
| `src/lib/monthLayout.test.ts` (205) | — | **owns** (remove the adopted test) | — |
| `STRUCTURE.md` (adoption live-instances list) | — | **owns** | — |
| `src/components/EventCard.tsx` (170) | — | — | **owns** |
| `src/components/MonthCell.tsx` (222) | — | — | **owns** |
| `src/lib/color.ts` (new) + `.test.ts` | — | — | **owns** |
| `src/app/(app)/calendar/loading.tsx` (160) | — | — | **owns** |
| `src/components/MonthLoadingSkeleton.tsx` (new) | — | — | **owns** |
| `src/app/(app)/calendar/new/page.tsx` | — | — | **owns** |
| `EventForm.tsx`, `MonthGrid.tsx`, `DaySection.tsx`, `CalendarHeader.tsx`, `page.tsx`, actions, `prisma/**` | must not | must not | must not |

### C1 — Extract `useCalendarNavigation`; the view switch; delete the dormant predicate (Opus)
- **Status:** PENDING
- **Objective:** lift the URL↔cursor cluster out of `CalendarViews.tsx` into
  a lib hook, apply the compare-and-clear guard there, reduce
  `CalendarViews` to header + view switch, and delete the two dormant
  exports — with paging behaviour byte-identical.
- **What moves** (line refs at the branch point, post-C9):
  `navigateTo` (:118), the URL→local resync `useEffect` (:144), `handleStep`
  (:204), `handleToday` (:212), `handleSetView` (:218), `openDay` (:232), and
  the `useRouter`/`useSearchParams` reads (:103-104). The hook composes
  `useCalendarPeriod` and exposes `{ view, anchor, today, step, goToToday,
  setView, openDay }` (exact shape is the builder's; report it).
  **`useCalendarNavigation` is the only `useSearchParams` consumer** — Schedule
  (CV3) will take `initialDay` as a prop.
- **The guard, Vision's design (C8 pass 4), implemented here:** (a) in
  `navigateTo`, compute the next search string and **return without pushing
  or incrementing** when it equals the current one — a no-op navigation is
  nothing to guard (kills the re-pick-the-current-view trigger); (b) replace
  any counter with **compare-and-clear**: a `Set<string>` of search strings
  this hook pushed; in the effect, in sync → `clear()`; URL's normalized
  search is in the set → `delete` it and skip (consume once); else
  `clear()` then `jumpTo`. Residual stated in the comment, not hidden: a push
  Next discarded leaves its string until the next mismatch or sync.
  **Do not depend on object identities** (`searchParams`, `today`) — the C8
  value-keying stays.
- **The view switch:** `CalendarViews` renders `CalendarHeader` + one of
  `MonthGrid` / the `DaySection` list per `view`, plus the sheets. Move the
  seven-vs-one `placeholderCount` and the label ternaries into a small
  per-view config object so CV1 adds a row, not a branch.
- **Delete** `periodWindowEdges` (`calendarPaging.ts:204-250`, its four tests
  and the `canStepToPeriod` control assertion in `calendarPaging.test.ts`)
  and `canStepToPeriod` (`calendarDates.ts:250-256`). Both dormant since C6;
  Captain's dormant-export rule says two missions with no caller → delete.
  **`isOutsideWindow` stays** — it is live (`MonthGrid.tsx:128`,
  `CalendarViews.tsx:273`).
- Fix `useCalendarPeriod.ts:229`'s stale comment (`jumpTo` can also set
  `"month"`).
- **Boundaries:** per the map. `useCalendarPeriod.ts` is **comment-only**.
- **Verification:** the gauntlet, both timezones (report the exact delta:
  −5 expected). **The byte-identical trace:** before touching anything,
  script a run on the dev server that records, for each of Week / Day /
  Month: initial title+URL, Next ×2, Prev ×2, Today, a view switch, a
  day-number tap (Month), and Back/Forward — capturing `document.title`,
  the header title text, `location.search`, and the count of rendered
  cards/cells at each step. Run it again after. **The two logs must be
  identical.** Plus Vision's C8/C9 cases: double-tap Next 60 ms apart → +2
  periods; re-pick the current view ×3 then Back → lands on the prior
  period with title and URL agreeing; single tap never reverts.
- **Evidence required:** `wc -l` before/after on every touched file (target
  `CalendarViews.tsx` ≤ 290); the before/after trace logs and a `diff` of
  them (empty); both timezone counts; the hook's exported signature.
- **Done criteria:** empty trace diff; `CalendarViews.tsx` ≤ 290; no
  `useSearchParams` outside the hook (`grep`); `periodWindowEdges` and
  `canStepToPeriod` absent repo-wide (`grep`); gauntlet green.

### C2 — Split `calendarDates.test.ts` by concern; empty the adoption list (Sonnet)
- **Status:** PENDING
- **Objective:** `calendarDates.test.ts` (349/350) becomes two or three files
  split **by concern, never by number** (STRUCTURE.md forbids a numbered
  second file): e.g. `calendarDates.test.ts` (day/span math:
  `daysOfWeek`, `calendarDayDiff`, `daysEventCovers`, `isOutsideWindow`) and
  `calendarDatesFormat.test.ts` (`formatTimeRange`, `formatAllDayLabel`,
  `isPast`) — the builder names them for the concerns actually present.
  Move `calendarDayDiff`'s test **home** from `monthLayout.test.ts` and
  remove the adoption header comment there. Empty STRUCTURE.md's "Live
  instances of the adoption clause" list (leave the clause).
- **⚠️ Coordination with C1, running in parallel:** C1 is **deleting
  `canStepToPeriod`**. Do not write a test for it; if you find one, drop it
  and say so. Do not touch `calendarPaging.test.ts` — C1 owns it.
- **Boundaries:** per the map. **No source module changes** — a test that
  can't move without editing its module is BLOCKED-ON-CONTRACT.
- **Verification:** the test **count is the instrument** — `npm test` and the
  direct UTC run must report exactly the same total as C2 found at its
  start (C1's deletions may change the baseline mid-flight; report the
  count *of the files you own* before and after, which must be equal).
  Every file under 350; `monthLayout.test.ts` holds only `monthLayout`
  tests; `grep -c 'calendarDayDiff' src/lib/*.test.ts` finds it in exactly
  one calendarDates-named file.
- **Evidence required:** per-file `test(` counts before/after; `wc -l`; the
  STRUCTURE.md diff (list emptied, clause intact).
- **Done criteria:** the above, plus `git diff --stat` shows only owned files.

### C3 — The C4 repairs: one `hexToRgba`; the skeleton relocated; `new/page.tsx` validates semantically (Sonnet)
- **Status:** PENDING
- **Objective:** three one-source-of-truth fixes K2's Captain queued and two
  gates independently asked for.
  1. **Hoist `hexToRgba`** — byte-identical bodies at `MonthCell.tsx:35` and
     `EventCard.tsx:134` — to a new pure `src/lib/color.ts` (no
     `server-only`; the `match.ts`/`duplicates.ts` standing) with a small
     test. Leave each component its own band builder — `pillBackground` and
     `bandBackground` are genuine variants, not copies.
  2. **Move the Month skeleton out of `loading.tsx`** — both
     `MonthLoadingSkeleton` and `MonthGridSkeletonRows` (C6 factored the
     markup into the latter; moving only the wrapper leaves it behind) — into
     `src/components/MonthLoadingSkeleton.tsx`, with `loading.tsx` importing
     it back. Reason: it is a route-segment file's second export whose only
     plausible consumer would create a `components → app/` arrow
     STRUCTURE.md forbids. **Keep the measured heights and their comments;
     do not re-measure** — CV4 replaces this skeleton anyway.
  3. **Route `new/page.tsx:43` through `parseDateParam`** from
     `calendarPaging.ts`. It validates the *same* `?date=` parameter with a
     shape-only regex and **accepts `2026-02-30`**, handing it to `EventForm`
     to roll over to Mar 2 — the case `parseDateParam` exists to reject.
  Also correct `MonthCell.tsx:167`'s comment if C8 left any "~2 characters"
  residue; do **not** change the `md:` breakpoint (CV5 owns that).
- **Boundaries:** per the map. `MonthCell.tsx` and `EventCard.tsx`: **the
  import swap and comments only** — no behaviour or class change.
- **Verification:** gauntlet both timezones (report the delta from the
  `color.test.ts` cases); `grep -rn 'function hexToRgba' src/` → exactly one;
  `grep -rn 'MonthLoadingSkeleton\|MonthGridSkeletonRows' src/app/` → only
  the import in `loading.tsx`; `/calendar/new?date=2026-02-30` in the
  running app opens on **today**, not Mar 2 (state how you observed it);
  `/calendar/new?date=2026-09-15` still pre-fills Sep 15. A Month-view
  pill and a Week card render with **unchanged** computed `background`
  (sample `getComputedStyle` before/after on the same event).
- **Evidence required:** the greps, the two `?date=` observations, the
  before/after `background` strings, both counts.
- **Done criteria:** the above; `git diff --stat` shows only owned files.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | — | — | — |
| 1 | Captain | — | — | — |

Budget: 3 passes per gate, then STOP and surface. (K2 spent every pass; the
extra round was Bryce's explicit call, not a precedent.)

## Handoff log

- 2026-09-02 — Mission opened by Fury from `calendar-v2.md` CV0, immediately
  after plan approval. Branch cut from K2's head (`bcc23cb`). Three disjoint
  contracts written from the K2 gate reports' own citations; no Banner
  needed. Dispatching C1 (Opus), C2, C3 (Sonnet) in parallel.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

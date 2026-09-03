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
- **Status:** ✅ **DONE, committed `da915bc`.** Split by concern, not number:
  `calendarDates.test.ts` 349 → **266** (day/span math incl. `calendarDayDiff`
  moved home, and the V1/V2/V4 regression suites) + new
  `calendarDatesFormat.test.ts` **125** (label formatting).
  `monthLayout.test.ts` 205 → **195**, adoption header removed.
  **Test count 39 → 39** across owned files (15+15+9) — nothing lost, which
  is the whole instrument for a move like this. STRUCTURE.md's live-instances
  list emptied, clause intact. Gauntlet green, 183/183 both timezones.
  *(183 not 180 because C3's uncommitted `color.test.ts` was already on disk
  when C2 ran; C1's −5 had not landed. Fury reconciles the final total.)*
- **Judgment worth keeping:** it kept the V1/V2/V4 regression suites with the
  day/span file even though they assert on `formatAllDayLabel` output,
  because the bug and fix were about **day-boundary math**, not formatting.
  Split by what the test is *about*, not by what it touches.
- **Flagged, out of its boundary — someone must fix:**
  `src/lib/mealPlanDates.test.ts:9-14` still says "`calendarDayDiff`'s test
  stays in `monthLayout.test.ts` … moving that one test isn't in this
  contract's scope." **That is now false** — C2 moved it. Ninth-and-counting
  stale comment in this codebase's tracked overclaim class. Not C2's file, so
  correctly left alone. **Fold into C1's report or a CV1 sweep.**
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
  needed. Dispatched C1 (Opus), C2, C3 (Sonnet) in parallel.
- 2026-09-02, evening — **Bryce heading into the night; handoff written
  pre-emptively** because a session rate limit gives no warning (K1 lost
  ~6h45m to two of them, killing gates mid-run). Fury cannot see credit
  balance or usage — so this section is written while the builders are still
  running, not after.

## ⚠️ RESUMING THIS MISSION — read this first, trust `git`, not this file's prose

**The three builders are subagents of a session that may have ended. If it
did, they died with it.** Their work survives only where it reached disk.
Establish reality before doing anything:

```
git branch --show-current              # expect claude/calendar-cv0-extract
git log claude/calendar-k2-month..HEAD --oneline    # what actually committed
git status --porcelain                 # uncommitted = a builder was mid-flight
npx tsc --noEmit && npx eslint . && npm test && npm run build
```

**State at the moment this was written** (branch `claude/calendar-cv0-extract`,
cut from K2 head `bcc23cb`, 2 commits, C3's files uncommitted and in motion):

| contract | owner files | state then |
|---|---|---|
| **C1** — extract `useCalendarNavigation`, view-switch config, delete `periodWindowEdges`/`canStepToPeriod` | `CalendarViews.tsx`, `useCalendarNavigation.ts` (new), `calendarPaging.ts` + test, `calendarDates.ts`, `useCalendarPeriod.ts` (comment) | **not committed** — no trace in tree yet |
| **C2** — split `calendarDates.test.ts`, empty the adoption list | `calendarDates*.test.ts`, `monthLayout.test.ts`, `STRUCTURE.md` | ✅ **committed `da915bc`** |
| **C3** — one `hexToRgba`, relocate the skeleton, `parseDateParam` on `new/page.tsx` | `color.ts`+test (new), `MonthLoadingSkeleton.tsx` (new), `EventCard.tsx`, `MonthCell.tsx`, `loading.tsx`, `new/page.tsx` | **mid-write, uncommitted** |

**If C1 did not land:** its contract is written in full above and is
re-dispatchable verbatim to a fresh Stark. Nothing depends on partial C1
work; `CalendarViews.tsx` unchanged is a valid starting point.

**If C3's files are uncommitted and unfinished:** inspect them, then either
finish or `git checkout --` them and re-dispatch C3. Do **not** assume
half-written files are correct — `git diff` them against the contract's
three repairs.

**No gate has run.** Vision and Captain are assembled but undispatched.
Nothing in CV0 is verified beyond whatever a builder self-reported.

**Nothing here touched the database, and nothing should have.** If counts are
off baseline (`calendarEvent` 3, `user` 5), something went wrong — investigate
before continuing.

## Where the whole project stands (so a fresh session doesn't re-derive it)

- **K1** = PR #9, open, unmerged, `claude/calendar-app-planning-1l9jdl`.
  Bryce said he is happy with it but has not merged; merging deploys to the
  family's live app.
- **K2** = PR #10, open, unmerged, `claude/calendar-k2-month`, stacked on K1.
  Preview verified working:
  `https://family-hub-git-claude-calendar-k2-month-marsh-team.vercel.app`
- **CV0** = this mission, stacked on K2. Three PRs deep; nothing merged.
- **Next after CV0:** CV1 (view vocabulary), then **CT1** — the Task schema
  *and* the all-day timezone fix Bryce reversed his deferral on. Full order
  and every settled decision: `.avengers/plans/calendar-v2.md`.

## Awaiting Bryce, not blocking any build

1. Two constitution amendments: Captain's (dormant exports — **C1 is acting
   on its spirit already by deleting two**), Strange's (unoccluded targets).
2. Neon **dev-branch password rotation** — an agent leaked a fragment into a
   transcript during K2. Dev only; hygiene, not exposure.
3. Whether to merge PR #9/#10 to production, and in which order.

## Delivery

- **Shipped:** —
- **Shipped check:** —
- **Deliberate leftovers:** —

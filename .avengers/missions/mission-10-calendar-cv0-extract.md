# Mission: Calendar CV0 — extract the navigation cluster; split the test file; the C4 repairs

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES — all three contracts DONE and committed; Vision and Captain not yet dispatched (2026-09-02)
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

Baseline **180/180**. **Reconciled after all three contracts: 182.**
180 + 3 (C3's `color.test.ts`) − 7 (C1's deletion — the block held **six**
tests plus the `canStepToPeriod` control, not the four this section
originally guessed) + 6 (C1's `useCalendarNavigation.test.ts`, added
unprompted so the guard's reconciliation is unit-testable) = **182**.
Verified by Fury under both `npm test` and the direct `TZ=UTC` invocation.

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
- **Status:** ✅ **DONE, committed `03d5330`.** `CalendarViews.tsx`
  **350 → 267** (target ≤290); new `useCalendarNavigation.ts` (220) owns the
  whole URL↔cursor cluster; `calendarPaging.ts` 250 → 146,
  `calendarPaging.test.ts` 228 → 99, `calendarDates.ts` 256 → 233.
  Fury re-verified: tsc 0, eslint 0, **182/182 both timezones**, build 0,
  every cap clear, `periodWindowEdges`/`canStepToPeriod` gone from source
  (tombstone comments only).
- **The trace diff is empty — and the method is why it means anything.**
  620 lines each, **identical md5** (`fbb3645…`), 37 steps across Week / Day /
  Month covering initial load, Next ×2, Prev ×2, Today (inert and real), a
  view switch, a Month day-cell tap, Back and Forward — capturing header
  title, `location.search`, `document.title`, both arrows' labels and disabled
  states, section/cell/card counts, **and the full `innerText` of the views
  container**. Crucially the "before" run came from a **git worktree pinned at
  `88c317d`** with its own dev server, so C2's and C3's parallel commits sit
  on *both* sides and cannot pollute the diff. Plus a **positive control**:
  it temporarily flipped `prevLabel` and watched the SSR HTML follow
  (`"Previous week"` → `"Previous PROBE"` → restored), proving the "after"
  run was exercising the new code at all. That is the discipline this project
  keeps having to relearn.
- **`VIEW_CONFIG` is a total `Record<CalendarPeriodView, ViewConfig>`**, so
  **CV1 widening the union is a compile error until each new view has a
  row** — "a row, not a branch," enforced by the type system rather than by a
  comment asking nicely.
- **It improved on Vision's guard design, and said so.** Vision's (a) compares
  the next search string against the *URL*; under concurrency that is wrong —
  tap Next then Prev inside one push's flight and the URL still names the
  period Prev returns to, so the Prev push is skipped and cursor and URL
  settle **disagreeing with nothing in flight to fix it**. The comparison is
  now against `pushed.at(-1) ?? currentSearch`. Two further hardenings, both
  documented in the file: the current search is **normalized** through the
  same parse/build triple (so `?view=day` and `?date=<today>&view=day` compare
  equal — that is what makes the re-pick guard fire on a bare URL), and
  consuming a landed push **drops every entry pushed before it**, since those
  were superseded and are exactly how a stale entry swallows a Back.
  Measured discriminating: re-picking the current view now pushes nothing
  (`history 2 → 2`, URL unchanged) where before it pushed (`2 → 3`).
- **Two honest corrections to Fury's contract:** the deleted block held
  **six** tests plus the control, not four — so the delta is **−7, not −5**
  (arithmetic error in the mission's Gauntlet section, corrected below). And
  it **added 6 tests nobody asked for** by making the guard's reconciliation
  a pure exported `consumePushedSearch`, precisely so the part that has been
  wrong twice is unit-testable. **Fury keeps them** — that is the right
  instinct, not scope creep.
- **Flagged, correctly not touched:** `loading.tsx` still reads
  `useSearchParams` (C3's file; CV4 replaces that skeleton anyway) — the
  *navigation* cluster has exactly one reader as specified. And
  `DaySection.tsx:37` now carries a **doubly**-stale comment, citing
  `canStepToPeriod` (deleted here) and a refusal-to-page behaviour C6 retired.
  Must-not-touch, so left; one-line fix for CV1.
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
- **Status:** ✅ **DONE.** One `hexToRgba` (new pure `src/lib/color.ts`, no
  `server-only`, 3 tests); both `MonthLoadingSkeleton` **and**
  `MonthGridSkeletonRows` relocated to `src/components/` with their measured
  heights intact (`loading.tsx` 160 → **104**); `new/page.tsx` routed through
  `parseDateParam`. Gauntlet green, **183/183** both timezones, every file
  under cap.
- **The no-visual-change proof, done well without a browser.** This
  environment gave the builder no browser tool, so it extracted the *pre-C3*
  `EventCard.tsx`/`MonthCell.tsx` from commit `616d190`, rendered old and new
  side by side through `react-dom/server` with identical props, and diffed
  the inline `style` strings — the same value `getComputedStyle` would report,
  since the code deliberately overrides any class-based background. Both
  identical:
  `background:linear-gradient(135deg, rgba(65,112,140,0.1) 0%, … ), var(--surface)`.
  A colour refactor that silently shifts an alpha is exactly what this
  catches, and it found a way to catch it with the tools it had.
- **`?date=` verified at the RSC payload, not inferred:** `2026-02-30` →
  `initialDateISO:"$undefined"` (falls back to today); `2026-09-15` →
  `"2026-09-15"`. Confirmed by `curl` + grep.

## ⚠️ Fury's error, recorded: `git add -A` swept a builder's in-flight work

Commit `a28f535` was meant to be CLAUDE.md + AGENTS.md documentation. Fury
staged it with **`git add -A`** while C3 was mid-write, so it swept in seven
of C3's files plus two of its throwaway verification scripts. C3 caught this,
correctly **did not rewrite a commit that wasn't its own**, and removed the
strays in a clearly-labelled follow-up (`38f9a59`).

**Not being fixed by history rewrite** — the branch is pushed, the *tree* is
correct, and everything passes; rewriting is riskier than the mess. **The
habit changes instead: while parallel builders are running, Fury stages by
explicit path (`git add .avengers/ CLAUDE.md AGENTS.md`), never `-A`.**
Fury had been using scoped adds earlier in the session and reached for `-A`
on the documentation commit out of convenience. Same class as the K2
danger-register edit that was announced and then lost: the small convenience
that quietly costs correctness.

## Two things the gates should know before they run

1. **The `calendarEvent` baseline is now 4, not 3.** C3 read 4 on its first
   read-only query, before any writes, and made none. Almost certainly Bryce
   using the app himself — he has been adding real events all session, and one
   of the four reads as a genuine household entry. **Gates should restore to
   4, not 3**, and must not delete an event they did not create. `user` is 5,
   unchanged.
2. **A register slip to not repeat.** C3's report quoted a real family event's
   title back into its transcript while explaining the count discrepancy. The
   register says do not print personal rows; "isolation is not privacy" covers
   titles as much as hashes. Harmless here (a local transcript, Bryce's own
   data) and it was in service of an honest flag — but the right shape is
   "one of the four looks like a real entry", without the title. Worth a line
   in future gate briefs.
3. `prisma/tmp-c1/` holds a still-running builder's scratch (`mint-cookie.ts`,
   `probe.ts`). Leave it until C1 reports; it is gitignored.
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

### C4 — Fix contract: the guard's settle-blind spot (Vision's BLOCKER)
- **Status:** ✅ **DONE, committed `0fa8d5b`.** Every push now runs inside
  `useTransition`, and a **settle effect** (ordered after the URL-resync
  effect) empties `pushed` and lets the URL win once `!isNavigating`.
  `urlTarget()`/`isInSyncWith()` extracted so both effects answer "where does
  the URL point, is the cursor there" through **one** piece of code.
  `useCalendarNavigation.ts` 220 → **283** (cap 350). Fury re-verified: tsc 0,
  eslint 0, **182/182 both timezones**, build 0; boundary clean — the commit
  touches exactly its four permitted files.
- **The Next-docs check was inconclusive, so the builder measured instead of
  assuming.** The docs never state that `isPending` tracks `router.push`:
  `use-router.md` only hints a transition exists, and every `isPending` hit
  in the App Router docs is about Server Actions, while the one documented
  navigation-pending API (`useLinkStatus`) is `<Link>`-only. So it
  instrumented the real hook on Next 16.2.12 / React 19.2.4 and got the
  answer empirically:
  ```
  fast Next+Prev (40ms):  +11ms isPending=true  pushed=[09-17]
                          +50ms isPending=true  pushed=[09-17, 09-10]
                         +288ms isPending=false dateParam UNCHANGED
  ```
  **That last line is precisely the render the old guard never received** —
  the settle with no URL change. Branch 1 taken on evidence, not on the
  proposal's optimism.
- **Vision's literal S1 did not reproduce here, and the builder said so
  rather than closing the blocker.** At gaps ≤120ms on this machine the two
  pushes add *no* history entry at all, so Back leaves the calendar entirely
  — identically on all three builds. Vision's transcript shows an
  intermediate entry, so their round trip committed the first push before the
  second superseded it. The builder therefore constructed **S2**, which pages
  slowly first so history holds an entry the burst can strand, and it
  reproduces exactly the described defect. **Then it swept the whole 0–250ms
  band so neither machine's timing is load-bearing:**
  ```
  gap        0    5   20   40   80  120  150  250 ms
  pre-fix   BAD  BAD  BAD  BAD  BAD  BAD   ok   ok
  fixed      ok   ok   ok   ok   ok   ok   ok   ok
  base       ok   ok   ok   ok   ok   ok   ok   ok
  ```
  Confirmed in Day and Month too. Vision's note-1 case (three Next clicks in
  one 0ms task) also resolves to the base build's outcome.
- **The C8/C9 fix is not regressed** — double-tap sampler reads three titles
  with no revert flash on the fixed build, five with the flash on the base.
- **The 35-step sequential trace still diffs empty** — 1947 lines, identical
  md5, rebuilt from a worktree pinned at `bcc23cb` so all four contracts sit
  on the "after" side. **With a positive control**, on the stated ground that
  an empty diff from a harness blind to the hook is worthless: flipping one
  line of `openDay` moved **174 lines**; reverted, md5 returned identical.
- **No test added, and the builder explained why rather than faking
  coverage:** the fix lives in effect scheduling and needs a router; there is
  no renderer in devDependencies. It instead documented in the test file's
  header what the six `consumePushedSearch` cases **structurally cannot
  see** — they assume the reconciliation ran, and the blocker was that it
  doesn't. Vision's point made readable from the file itself.
- Both stale comments corrected; `grep` confirms the three remaining
  `canStepToPeriod` mentions are honest tombstones, none claiming it exists.
- **Environment note for whoever is next:** a leftover `next dev` from the
  previous session had been running 16 hours and was killed to free the
  per-directory lock. **Nothing is serving this repo — a fresh `npm run dev`
  is needed.**
- **Objective:** the compare-and-clear guard in `useCalendarNavigation.ts`
  leaves a stale `pushed` entry whenever a push produces no URL change, and
  that entry then swallows a later, legitimate Back — reproduced on a
  human-reachable fast-Next-then-Prev-then-Back sequence, where it settles
  with the cursor and URL **permanently disagreeing** and compounds on a
  second Back. This is a regression against the pre-C1 branch base on that
  exact sequence.
- **Boundaries:** `src/lib/useCalendarNavigation.ts` and its test file only.
  **Also fix, same dispatch (Vision's suggestion):** the two stale comments
  at `src/components/DaySection.tsx:37` and
  `src/lib/mealPlanDates.test.ts:12-14` — both in files this contract does
  not otherwise touch, comment-only, zero runtime effect, and cheaper to
  land now than to carry to a future CV1 contract that would exist only for
  them.
- **First step, before writing any fix:** check
  `node_modules/next/dist/docs` (per AGENTS.md) for whether `useTransition`'s
  `isPending` tracks `router.push` in this repo's Next version — Vision
  offered the fix but explicitly did not verify this.
- **If it tracks:** wrap the push in `useTransition`; add a second effect,
  ordered after the existing URL-resync effect, that runs once `!isPending`
  — clear `pushed`, then apply the same in-sync check the resync effect
  uses; if not in sync, `jumpTo` the URL's own anchor/view, since the URL is
  the source of truth once nothing is in flight.
- **If it does not track:** the narrower fallback — in `navigateTo`, when
  the normalized next search equals the current search (a push returning to
  the URL already shown), clear `pushed` **before** pushing. Accepts the old
  transient revert flash in that one case only; state this residual in the
  comment.
- **Must not regress what the guard already fixed:** the 60ms double-tap
  sampler must still read three distinct titles with no revert
  (`["Aug 30 – Sep 5","Sep 6–12","Sep 13–19"]`), not the base build's
  five-entry flash.
- **Verification:** Vision's exact reproduction — fast Next+Prev 40ms apart
  then Back lands with title and URL agreeing; a further slow Next then
  Back also agrees; the 60ms double-tap sampler unregressed; **the 35-step
  sequential trace (Vision's version, pinned at `bcc23cb`) still diffs
  empty**. Full gauntlet, both timezones, 182 baseline unchanged (comment
  fixes move no test count).
- **Evidence required:** the Next-docs check's outcome, quoted; before/after
  of Vision's exact repro sequence; the double-tap sampler output; the trace
  diff; both timezone counts.
- **Done criteria:** all of the above; `grep` confirms both stale comments
  corrected.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **BLOCK** | 1 | C1/C2/C3 pass every check except one guard bug; fix contract C4 written |
| 1 | Captain | **PASS** | 0 | `VIEW_CONFIG` totality proven by compiler; 12 findings, most-actionable: only 2/5 per-view differences are in the table |

**⚠️ 2026-09-03 — the gates could not run: an Anthropic-side incident, not a
finding.** Five dispatches died on HTTP 529 *Overloaded* before reporting.
Confirmed against `status.claude.com` rather than inferred: an active
incident titled **"Elevated errors for multiple models"** covering **Opus 5,
Opus 4.8, Opus 4.6, Mythos 5.1 and Fable 5.1**, with Claude API / Claude Code
/ claude.ai all at **partial outage**; cause identified, fix being
implemented, last update 13:50 UTC.

Fury's own main loop kept working throughout — consistent with *elevated
errors* rather than a hard outage: a long-running gate makes many more
requests and so has many more chances to catch a bad one.

**Fury stopped re-dispatching after five failures.** Each dead dispatch burns
tokens before it dies, and retrying into a declared outage is the
"push harder against a budget" behaviour the doctrine forbids. **Resuming is
simply: re-dispatch Vision and Captain with the same briefs.** Nothing about
CV0 changed and nothing needs re-deriving.

**One earlier claim of Fury's was wrong and is corrected here:** after two
Fable failures it said the congestion looked Fable-specific. Captain then
failed twice on Opus and Vision once. Both models are on the incident's list;
the conclusion had been drawn from two data points.

Budget: 3 passes per gate, then STOP and surface. (K2 spent every pass; the
extra round was Bryce's explicit call, not a precedent.)

## Captain, pass 1 — PASS (0 blockers, 12 notes). This mission was largely its own work; it audited itself.

Gauntlet re-run independently: tsc 0, eslint 0, **182/182 both timezones**,
build 0. Boundary audit clean across all three contracts — every
must-not-touch file byte-identical to K2 head, no two contracts touched one
file, no strays.

### The load-bearing check: `VIEW_CONFIG`'s totality, proven by compiler

Captain widened `CalendarPeriodView` in a scratch edit and ran `tsc`:
```
error TS2741: Property 'schedule' is missing in type '{ week; day; month }'
  but required in type 'Record<CalendarPeriodView, ViewConfig>'.
```
Reverted, tree clean again. **The promise is real** — CV1 cannot widen the
union without adding a row.

### ⚠️ But the table covers only 2 of 5 per-view differences

`VIEW_CONFIG` holds `prevLabel`/`nextLabel`/`placeholderCount`. Three more
still live as ternaries in `CalendarViews.tsx`'s body — `days` (:131),
`isCurrentPeriod` (:140), `title` (:150) — each with a trailing `: <day
behaviour>` catch-all arm. Captain's probe proved **none of the three
errored** when the union widened: a `schedule` view compiles clean and
silently renders a Day title and a single-day array. **This is `stepPeriod`'s
catch-all-else hazard, reproduced one file over** — the exact class
`calendar-v2.md` already names as requiring explicit arms.

The file's own comment (:98) claims "adding a view means adding a row to
VIEW_CONFIG rather than another handler" — true of 2 differences, false of 3.
Twelfth instance of this repo's overclaiming-comment class, and — Captain's
framing — this one should be closed by fixing the *code*, not the comment,
since the recommendation below makes the claim true rather than merely
correcting it.

**Recommended for CV1, cheap now, expensive at six views:** promote `title`,
`days`, `isCurrentPeriod` into `ViewConfig` as `(anchor, today) => …` fields.
Then the totality check covers every per-view difference, not two of five.

### The one-source-of-truth ledger — net duplication fell for the first time in this arc

| | at K2 | now |
|---|---|---|
| `hexToRgba` | 2 copies | **1** — collapsed |
| `toDateInputValue` | 2 | 2 — deferred (`EventForm.tsx`, `PantryItemEditSheet.tsx`) |
| `daysBetween` vs `calendarDayDiff` | 2 | 2 — deferred, **still hangs on `b < a`** |
| view vocabulary (new to the ledger) | — | 2 (`CalendarHeader.tsx:44`'s hand-written union) |
| created by CV0 | — | **none** |

**`EventForm.tsx:61`'s `daysBetween` still carries the infinite loop** — it
walks forward unconditionally, so a backward pair never terminates. Correctly
untouched (must-not-touch, 350/350) but **CT1 must fix it there**; it's the
one deferred duplication that's also a live hang, not just drift.

### The dormant-export rule, applied for the first time: deletion was the right branch, and Captain refined why

Not simply "two missions, no caller." `periodWindowEdges` **was** the
navigation wall; C6 retired walls entirely; a comment-and-expiry would have
preserved a predicate describing behaviour the app no longer has — exactly
the overclaiming class this project tracks. Deletion removed both the code
and a future wrong answer. `canStepToPeriod`'s sole caller went with it,
transitively, which is the rule working as designed on its first real test.

### Line budget: 83 lines is enough for CV1 alone, not through CV5 — unless Ruling 2's fix is taken

Untouched: `EventForm.tsx` **350** (at cap, CT1's), `MonthGrid.tsx` 140,
`DaySection.tsx` 197, `CalendarHeader.tsx` 128, `page.tsx` 127. If the three
ternaries stay ternaries, 3→6 views turns them into 6-arm chains (~25 lines),
then CV3/CV4/CV5 branches land `CalendarViews.tsx` at **340–360 by CV5** —
the standing 350–380 prediction, unchanged. Taking Ruling 2 converts that
growth from ~25 lines/phase to ~1 row/phase, while the file is at its
smallest.

### Fury's `git add -A` mistake — a process note and one danger-register line, explicitly NOT a boundary rule

Captain's own test: does commingled history change the tree, create an
illegal arrow, a second definition, a cap breach, or a misplaced file? **No,
five times.** The cost is real but narrow — provenance archaeology, and this
repo's own techniques (C1's pinned worktree, C3's extraction from a named
commit) depend on commits meaning what they say. **Refused to make it a
STRUCTURE.md rule**, reasoning explicitly: that would mean gating commit
graphs instead of trees, and a mission with a correct tree could BLOCK on
history — "the verdict must always be readable off the tree," which is one
of Captain's own laws. Proposed danger-register wording instead (Fury to
write):

> **Never `git add -A` or `git add .` while another agent may be writing.**
> Stage by explicit path. A commit that sweeps in a parallel builder's
> in-flight files is not a correctness failure — the tree can still be right
> — but it makes the commit message lie about its contents.

### Other notes, routed

- `CalendarHeader.tsx:44` hand-writes `"week"|"day"|"month"` instead of
  importing `CalendarPeriodView` — no written rule covers it yet (the view
  vocabulary isn't in STRUCTURE.md's one-source-of-truth list), but it IS a
  compile tripwire (produced the error above), so CV1 is forced to touch it.
- `loading.tsx:71` checks `searchParams.get("view") === "month"` as a
  **hardcoded literal**, not `parseViewParam` — unlike `CalendarHeader`, this
  produces **no compile error** on a wider union. CV1's three new views will
  silently render the Week skeleton. `calendar-v2.md` already promises a
  measured skeleton per view; route this through `parseViewParam` to make
  that promise enforceable rather than remembered.
- `MonthLoadingSkeleton` (the wrapper, not the rows) has **zero callers
  repo-wide** and its own comment justifies it with a speculative caller that
  doesn't exist. Reaches Captain's two-mission dormant threshold at CV1's
  end — delete then, or give it a dated expiry.
- `calendarDates.ts:84`'s export rationale names `CalendarViews.tsx`'s
  `daysBetween` copy — that copy has never lived there; it's in
  `EventForm.tsx`. Pre-existing at K2 head, reachable this pass. Eleventh.
- **The comment sweep needs its own CV1 contract, not a "fold in."** Neither
  `DaySection.tsx:37` nor `mealPlanDates.test.ts:9-14` has a CV1 boundary
  owner — CV1 touches `useCalendarPeriod.ts`/`calendarPaging.ts`/
  `CalendarHeader.tsx`, none of which is either file. That mismatch is
  exactly how a comment reaches instance twelve. Four file:line targets now
  named across this pass; CV1 should carry an explicit contract for them with
  a `grep`-clean done-criterion.

## Vision, pass 1 — BLOCK (1 blocker, 8 notes)

Independently rebuilt C1's trace from a **worktree pinned at `bcc23cb`, the
branch base** (stronger than C1's own pin — puts all three contracts on the
"after" side only): 2077 lines, matching md5, empty diff, with its own
positive control (flipped `prevLabel`, watched it appear, reverted). **For
every sequential paging path, behaviour is genuinely byte-identical.**
C2's 39→39 verified at the assertion-body level, not just the count — all
39 test bodies match their `bcc23cb` originals. C3's `2026-02-30` fix and
the no-visual-change claim both verified against real `input[type=date]`
values and computed styles, not asserted.

### BLOCKER — the guard swallows a Back, and worse: settles disagreeing

The compare-and-clear guard leaves a stale entry in `pushed` whenever a push
produces **no URL change** — `histDelta 0` — because the resync effect that
would normally clear it **never runs**. The six `consumePushedSearch` unit
tests cannot see this: the defect is that the effect doesn't fire, not that
the reconciliation answers wrongly once it does.

**Reproduced on the pristine HEAD build** (Week view, fast Next then Prev 40ms
apart, then Back):

```
fast Next+Prev 40ms: search unchanged, pushed=["…09-10…","…09-03…"]  (effect never ran)
Back: search→"…09-10…" title→"Aug 30 – Sep 5"
reloadTitle: "Sep 6–12"   cursorUrlAgree: false      ← URL and page permanently disagree
Next Back (from the disagreeing state): swallowed AGAIN — it compounds
```

**The pre-C1 build (`bcc23cb`) handles the identical sequence correctly** —
`cursorUrlAgree: true` throughout. This is a regression against the branch
base on a human-reachable sequence (two quick taps correcting a wrong
direction), not a hypothetical. Confirmed also reachable at 20ms and 5ms.
On Vercel the RSC round trip is longer than local, so **the coalescing
window is wider in production, not narrower.**

**What guard (b) genuinely buys, confirmed, and the fix must not regress
it:** the 60ms double-tap sampler shows a visible revert flash on the base
build (`[…,"Sep 6–12","Sep 13–19","Sep 6–12","Sep 13–19"]`) and none on
HEAD (`[…,"Sep 6–12","Sep 13–19"]`). C8/C9's original bug stays fixed;
this is a narrower, newer failure mode the fix introduced on top of it.

**Vision's own fix, offered with an open verification step:** reconcile
against the router's *settle* signal, not only URL-param changes — wrap the
push in `useTransition`, and after the existing resync effect, add one that
clears `pushed` and reconciles once `!isPending`. Vision did **not** verify
`useTransition`'s `isPending` tracks `router.push` in this Next version and
said so explicitly — that check is now Stark's first step, via
`node_modules/next/dist/docs` per AGENTS.md. **Fallback if it doesn't
track:** in `navigateTo`, when the normalized next search equals the current
search (a push returning to the already-shown URL), clear `pushed` before
pushing — accepts the old transient flash in that one case only.

### Notes

- **Synthetic trigger, not yet thumb-reachable, but CV2/CV5 open a path to
  it:** three Next clicks in one 0ms task settle with cursor +3 but URL +1;
  in Month this leaves 26 not-loaded glyphs on a December grid whose URL
  names October. At 10/20/30ms both builds are correct. A swipe or
  key-repeat gesture (CV2/CV5) could reach the 0ms case. The settle-based
  fix covers this too (collapses to the base build's outcome).
- `pushed` growth is **bounded by the burst, not unbounded** — 20
  alternations at 30ms produced 20 entries, emptied by the next in-sync
  landing.
- C1's claimed discriminator (re-pick pushed history 2→3 before, 2→2 after)
  **did not reproduce** — the base build also shows no history entry for a
  same-URL push. Not a correctness issue; guard (a), the no-op-push check,
  is still correct and unaffected by the blocker.
- Deletions confirmed safe: only tombstones remain; `isOutsideWindow` live
  and correct on both builds (26 glyphs in Month, 7 in Week when the cursor
  outruns the window).
- **`DaySection.tsx:37` and `mealPlanDates.test.ts:12-14`** — same two stale
  comments Captain flagged. Vision's own suggestion, worth taking: since
  Stark is coming back for the BLOCKER anyway, **widen that fix contract's
  boundary to these two comment-only lines** rather than carry them forward
  to a CV1 "comment sweep" contract that doesn't strictly need to exist yet.

## Bryce's decisions, 2026-09-03

- ✅ **Agent model drift fixed.** `~/.claude/agents/` had all three gates on
  Fable; CLAUDE.md's K1 cost review had decided **Strange and Captain move to
  Opus, Vision stays Fable** and the files were never updated. So K1's and
  K2's eleven gate passes ran three-Fable-deep when the project had decided
  on one. Now `captain: opus`, `strange: opus`, `vision: fable` — a 3× cut in
  Fable per mission, and the reason Bryce's weekly allowance drained faster
  than expected.
- ✅ **Both constitution amendments applied.** Strange's *unoccluded target*
  rule → `DESIGN.md` (beneath the two-tier touch minimum); Captain's
  *dormant export* rule → `STRUCTURE.md` (before Naming), including the
  refinement its first application produced: prefer outright deletion when
  the dormant code describes behaviour the app **no longer has**, since a
  dormant-export comment would otherwise preserve a wrong answer.
- ❌ **Neon dev-branch password rotation declined.** Dev branch only, the
  fragment sat in a local transcript, nothing exposed. Not revisiting unless
  something changes.
- 📌 **Merging PRs #9 (K1) and #10 (K2) to production: noted, not decided.**
  Bryce asked to keep it on the list rather than act. Nothing blocks on it;
  CV0 stacks on #10 regardless. **This is the step that puts the Calendar in
  front of Emily** — surface it again when CV0 delivers.

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

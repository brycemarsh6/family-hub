# Mission: CT2 — Tasks in every view, the detail sheet, and mark-complete

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-09-04 · **Updated:** 2026-09-04

## Why this mission, and why now

CT1 built Tasks end to end — schema, guarded actions, a form, and a place
in the "+" sheet — but **a task saves and then appears nowhere**. That was
deliberate ("the destination exists before the trigger"), and CT2 is the
phase that closes it.

**It is also now the gate on shipping the whole calendar.** Bryce's
decision, 2026-09-04: the four stacked PRs (#9 → #10 → #11 → #12) merge
as **one complete release after CT2**, so nothing half-visible reaches
the family. He was offered "merge now" (Fury's recommendation) and "hold
until Google sync" (his own first instinct, which would have held
everything until K6/K7 — the far end of the roadmap, gated on a Google
Cloud account only he can create) and chose the middle deliberately.
So: **CT2 is the last mission before the calendar goes live.**

## Brief

- **Goal:** Tasks render everywhere events do, can be opened, and can be
  marked complete — including by a kid, on their own task.
- **Done means** — each observable:
  1. A task created through the form **appears** in the calendar views.
  2. Tapping it opens a detail sheet with title, details, people, due
     date, Mark complete / Mark not complete, Edit and Delete.
  3. A **kid** can complete a task they are assigned to, and cannot
     complete another's or edit anything — proven by attacking the action
     directly with a minted cookie, Phase-1e style, positive control first.
  4. A completed task reads as *done*, distinctly from an event that has
     merely *already happened*.
  5. Gauntlet green in all three timezones; database back to exact
     baseline.
- **Out of scope:** the Schedule view (CV3), the hour timeline (CV4),
  Month text pills / Year (CV5), recurrence UI (K4), Google sync (K6/K7).
  CT2 renders tasks in the views that **exist today**.

## Danger register (absolute)

- **`npm run db:seed` / `npm run db:reset` forbidden.** Scoped
  `db:seed-tasks` / `db:clean-tasks` only — and note CT1 gave those a
  **sentinel** discriminator, so they now genuinely refuse rows they did
  not create.
- **No committed script may create, update or delete `User` rows.**
- **Never a Neon branch reset** — that is Bryce's console action.
- **The migration file `20260904144140_…` must not be edited.** Its
  checksum is patched in `_prisma_migrations` on dev; any edit reintroduces
  drift. It is also **unmerged**, so production applies it fresh.
- Baseline: `Task 0, TaskPerson 0, CalendarEvent 4, User 5`. **`CalendarEvent`
  must read 4** — one is a real family event.
- Dev branch holds real family data. **Report roles and counts, never
  names or titles.**
- **Never `git add -A` / `git add .`.** Stage by explicit path.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm run build`
- `npm test` (pins `TZ=America/Denver` internally)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`

CI now runs all three legs (CT1/C5). If a new test directory appears, its
glob entry ships in the **same commit** — the glob is hand-enumerated in
**three** places now (`package.json` plus two CI steps), which is worse
than the one AGENTS.md warns about.

## Standing constraints inherited from CT1

- **`CalendarViews.tsx` is at 348/350.** Captain's ruling stands as a
  written trigger: *the next mission that must add a line to that file
  performs the `ViewConfig` → `src/lib/calendarViewConfig.ts` extraction
  first, whether or not it is CV3.* C4b spent the one duplication that was
  available to pay for a line; there is nothing left to spend.
- **`line-through` is permitted for a completed task and only there.**
  DESIGN.md forbids it for past events because "already happened" ≠
  "done". The distinction must be stated in code, not just obeyed.
- **A third guard form (membership) exists but is NOT yet in STRUCTURE.md**
  — Captain drafted the amendment; Bryce has not approved it. Do not
  self-authorize; follow the pattern, don't document it.
- `parseLocalDateString` lives in `EventDateTimeFields.tsx`. Captain's
  trip condition: **a third consumer, or any consumer outside
  `src/components/`, makes moving it to `src/lib/` mandatory.**
- Two app-wide notes deliberately uncharged: form text at 4.33:1, and the
  calendar-shaped loading skeleton on form routes. Re-flag only if made
  worse.

## Assembled

- **Stark + Vision** — always.
- **Strange** — this mission is almost entirely things a human sees.
- **Captain** — new components and a type that must thread through several
  view files; plus `CalendarViews.tsx` sits at its cap.
- **Banner** — dispatched first.

## Banner's brief — accepted, with two corrections and three Fury decisions

### Corrections

1. **The plan names three rendering targets; two do not exist.** CT2 sits
   *after* CV3/CV4 in the plan's own order, so it says "Schedule → a task
   variant of `EventCard`; timeline → the all-day row via
   `partitionForTimeline`". Verified: **no `Schedule*` or `TimelineGrid*`
   component exists**, and `timelineLayout.ts` still has zero application
   callers. We are running CT2 early, so it renders into the views that
   exist **today**: Week and Day (via `DaySection`/`EventCard`) and Month
   (`MonthGrid`). CV3/CV4/CV5 inherit the obligation to render tasks when
   they build their views — recorded as a deliberate leftover, not a gap.

2. **DESIGN.md does not mention `line-through` at all** — Fury said
   otherwise earlier and was wrong. The rule exists only as a comment at
   `EventCard.tsx:63`, and it claims the vocabulary "means cancelled, not
   'already happened'". But `GroceryRow.tsx:79` already uses
   `line-through` for a **checked** item — struck off a list, i.e. *done*.
   So the app has one usage and one comment that disagree.

### Decisions — don't re-litigate

- **D1. Tasks travel as their own `tasks` prop, not a union with
  `CalendarEventView`.** Every view component takes `events:
  CalendarEventView[]` today, and `MonthGrid` narrows to
  `MonthLayoutEvent` while `DaySection` filters via `daysEventCovers`. A
  union would force a discriminant at every use site in three components.
  A parallel prop leaves the event path untouched and makes "CV3/CV4 do
  not render tasks yet" a **visible type-level gap** rather than a silent
  one. Internally, a task converts to the existing layout shape
  (`{id, startAt: due, endAt: due + 1d, allDay: true}`) so `assignLanes`
  is reused unchanged — no second packer, the same rule CV2 followed.

- **D2. `line-through` for a completed task joins `GroceryRow`'s existing
  vocabulary; it is not an exception.** A checked grocery item and a
  completed task are the same claim — *struck off a list*. The plan's
  framing ("permitted here and only here") is right in effect but wrong in
  reasoning, and `EventCard.tsx:63`'s "means cancelled" is the sentence
  that is actually incorrect. **Correct that comment** to say what it
  really protects: a *past* event must not be struck through, because
  "already happened" is not "done" — and note the completed-task and
  checked-grocery cases as the legitimate uses.

- **D3. The kid path passes a per-task boolean, never a role or a user
  object.** STRUCTURE.md: *"components never receive role or user objects
  for gating purposes"* and *"hiding UI is never the gate"*. The page
  computes, per task, whether the signed-in user is assigned to it, and
  passes that. `completeTask`'s own membership guard (CT1's third form)
  stays the real gate; the boolean only decides whether a control that
  would refuse is drawn at all.

## Contracts

Sequential — every contract after C1 touches files C1 moves. Sized so one
dispatch completes one.

### C1 — Extract `VIEW_CONFIG`, because `CalendarViews.tsx` is at the cap
- **Status:** PENDING
- **Why first:** the file is at **348/350** and CT2 must add lines to it to
  thread tasks through. Captain's CT1 ruling is a written trigger: *the
  next mission that must add a line performs the `ViewConfig` →
  `src/lib/calendarViewConfig.ts` extraction first, whether or not it is
  CV3.* C4b already spent the one duplication available to pay for a line.
  **Captain's decisive argument was coverage, not size:** `VIEW_CONFIG` is
  per-view date logic living in a `.tsx` the test glob cannot reach, while
  its sibling `VIEW_CURSOR` sits in `lib` with property tests across every
  day of 2026. Move the config, **not** the render switch — the switch is
  where future views land and it should stay flat and visible.
- **Boundaries:** may touch: `src/components/CalendarViews.tsx`, new
  `src/lib/calendarViewConfig.ts`, new
  `src/lib/calendarViewConfig.test.ts` · must not touch: anything else.
- **Verification:** gauntlet, three timezones; `wc -l` on both files; a
  before/after DOM+URL trace of paging in Week, Day and Month proving
  behaviour is byte-identical.
- **Evidence required:** the trace diff (empty); the new tests, which must
  cover what was previously untestable; line counts.
- **Done criteria:** pure refactor, test count **rises** (that is the
  point), `CalendarViews.tsx` comfortably under cap.

### C2 — `CalendarTaskView`, and the parallel query
- **Status:** PENDING
- **Boundaries:** may touch: `src/app/(app)/calendar/page.tsx`,
  `src/components/CalendarViews.tsx`, a new type home · must not touch:
  `src/app/actions/**`, `prisma/**`.
- `page.tsx:61` currently runs **one** query with a comment saying there is
  nothing to batch with it. That comment stops being true here: the task
  query goes in a **`Promise.all` alongside it, never sequentially** — on
  a `force-dynamic` page each sequential `await` is another cross-country
  round trip (CLAUDE.md's performance section). **Update that comment too.**
- Per D3, compute per-task `isMine` server-side from the verified user.
- **Evidence required:** the `Promise.all` shown; a query-count measurement
  proving two queries, not two round trips in series.

### C3 — Render tasks in the views that exist
- **Status:** PENDING
- **Boundaries:** may touch: `src/components/DaySection.tsx`,
  `EventCard.tsx` (or a new `TaskCard.tsx`), `MonthGrid.tsx`,
  `CalendarViews.tsx` · must not touch: `src/lib/monthLayout.ts`,
  `src/lib/timelineLayout.ts` (**CV4 is its first consumer, not CT2**).
- Month pills reuse `assignLanes` via the D1 conversion — **no second
  packer**.
- Per D2: completed tasks get `line-through`; **correct `EventCard.tsx:63`'s
  comment** rather than leaving a sentence the codebase contradicts.
- **Evidence required:** 375px measurements, light and dark; a completed
  task visibly distinct from a past event; no layout shift.

### C4 — `TaskDetailSheet`, mark complete, and the kid attack
- **Status:** PENDING
- **Boundaries:** may touch: new `src/components/TaskDetailSheet.tsx`,
  `CalendarViews.tsx` · must not touch: `EventDetailSheet.tsx` (a separate
  sheet — a task's fields and verbs genuinely differ), `actions/tasks.ts`
  (CT1 built and gated it; **import, do not edit**).
- **Evidence required — the hard part.** A **kid session, positive control
  first**: completes their own task (succeeds), then is refused on
  another's, then refused on edit and delete. Minted cookie, Phase-1e
  style. CT1 proved these guards at the action level with a throwaway
  harness; CT2 is the first time they are reachable from **real shipped
  UI**, so the attack must go through it. Report roles and counts, never
  names.
- **Done criteria:** `deleteTask`/`completeTask`/`uncompleteTask` now have
  real Server Action ids in the built manifest — CT1 recorded **zero**;
  that number changing is the proof the dormant-export deadline is met.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## Handoff log

- 2026-09-04 — Mission opened on `claude/calendar-ct2-tasks-in-views`,
  branched from CT1 at `2109f75` (CT1 DELIVERED, all three gates PASS).
  Banner dispatched. **This is the last mission before the four-PR stack
  merges as one release** — Bryce's decision, recorded above.

## Delivery

_Pending._

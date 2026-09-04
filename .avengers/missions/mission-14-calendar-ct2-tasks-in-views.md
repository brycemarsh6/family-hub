# Mission: CT2 — Tasks in every view, the detail sheet, and mark-complete

**Project:** family-hub (Marshee)
**Status:** AT-THE-GATES
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
- **Status:** DONE — `f12ae11`. 348 → 217; tests 241 → **252** (11 new, covering both 2026 DST transitions and the Jan 31 boundary — the coverage Captain's ruling was actually about). Purity proven by reconstructing the old config from `git show HEAD` and comparing across 6 views × 9 anchors × step/back/Today × 9 "today" values: **1674 comparisons, 0 mismatches.**
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
- **Status:** DONE — `3dc628c`. Concurrency **measured**: the two queries dispatch 0.57ms apart, both long before either returns. `isMine` computed server-side from people already joined in the same round trip — no second query, and only a boolean crosses into a component.
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
- **Status:** DONE — `03042b7`. `TaskCard.tsx` new (justified: `EventCard` exists to describe a start/end *span*, a task has one due date). `EventCard.tsx:63`'s "line-through means cancelled" corrected — it was never true anywhere, `GroceryRow` has struck checked items since it was built. Distinction proven by computed style in one frame: completed task struck through, past events same weight-drain but not struck. **Caught a bug outside the brief:** `DaySection`'s "No events" card only checked events, so a task-only day showed it beside a visible task.
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
- **Status:** DONE — `17f7c6d`. The kid attack ran through the **shipped bundle** (action ids pulled from the chunk the running server served), positive control first, same kid session throughout: completes own ✅ → refused on another's ✅ → refused on un-complete, timestamp unchanged to the byte ✅ → refused on edit/delete ✅ → manager succeeds on all four ✅. Rendered DOM per role captured, not reasoned. **Dormant-export deadline met and measured: task action ids in the manifest 0 → 4.** Flagged two things honestly, both taken by C5.
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


### C3b — a completed task must not read as outstanding in Month view
- **Status:** DONE — `f8c4a40`
- **Recorded late.** C3's builder flagged that `MonthCell.tsx` sat outside
  its boundary, so a completed task's pill was pixel-identical to an open
  one — a signal that lies, in a primary view, about the very thing CT2
  exists to do. Fury made it a contract rather than letting it reach the
  design gate.
- **Boundaries:** may touch `MonthCell.tsx`, `MonthGrid.tsx`; must not
  touch `monthLayout.ts` or any file a parallel builder held.
- **Report — the contract named `line-through`, and the builder measured
  instead of obeying.** Below `md` the pill's title span is `sr-only`,
  genuinely display-hidden: a pill shows **zero** visible characters at
  375px, so `line-through` alone would have been invisible at exactly the
  viewport DESIGN.md targets. It shipped a checkmark glyph (renders at
  every size) with `line-through` layered on at `md`+, joining
  `TaskCard`/`GroceryRow`'s vocabulary rather than inventing a fourth.
  Completion is computed independently of past-ness, so a task finished
  early still reads done and an overdue-but-open one is never struck.
  **Lane assignment proven untouched**: identical pill counts and the same
  "+1 more" before and after; `monthLayout.ts` byte-identical.
  It also declined to clean up shared test data a sibling builder was
  still using — the right call.

### C5 — Split the sheet under the cap, and let Edit reassign people
- **Status:** DONE — `6aa2aef`
- **Recorded late — the builder flagged the gap itself**, exactly as Vision
  did in CT1. *A boundary living only in a dispatch prompt is not a
  boundary*; written down here so the audit trail is real.
- **Boundaries:** may touch `TaskDetailSheet.tsx`, new `TaskEditView.tsx`,
  `CalendarViews.tsx`, `page.tsx`; must not touch `actions/**`,
  `EventPeopleField.tsx` (import unchanged), `EventDateTimeFields.tsx`,
  `TaskForm.tsx`, `src/lib/**`, `prisma/**`.
- **Report:** 418 → **290**, edit view now its own 173-line component. The
  roster joins the existing `Promise.all` as a **third element** — all
  three dispatch at +0ms, where a sequential chain would stagger by
  hundreds of ms. Reuses `EventPeopleField` rather than a second picker.
  Reassignment proven end to end: chips toggled in a real browser, then
  `TaskPerson` rows confirmed by direct database read to match.
  **The kid check from two angles is the useful one:** a kid who *is*
  assigned sees Mark complete but still never sees Edit — proving
  membership and management are separate gates, not one.
  Kept CT1's standing constraint: wrote a local date helper rather than
  importing `parseLocalDateString`, which would have tripped Captain's
  third-consumer rule and forced a move outside its boundary.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Captain | **BLOCKED** | 1 | 4 notes; retired one of its own rules as failed |
| 1 | Vision (Opus) | **PASS**, scoped to `c5fa5a0` | 0 | 4 notes; **C5's surface needs re-gating after C6** |
| 1 | Strange | queued (runs after Vision — both use fixtures) | — | — |

### Vision, pass 1 — PASS, and it verified far past what it was asked

Gauntlet matched exactly (252 / 252 / 248+4). Boundaries clean on all six
contracts. It re-derived every headline claim rather than accepting one:

- C1's purity proof was claimed at **1,674** comparisons; Vision redid it
  at **200,340** — every day of 2026 plus DST and year boundaries × 5
  "today" values × 3 timezones — then **proved its own harness could go
  red** by injecting a one-day shift and a stray space.
- C2's concurrency: dispatch offsets **0, 0, 0 ms**; parallel 66ms vs
  sequential 239ms, **3.6× over three runs**.
- The task→month adapter: **12,045 cases** (1,095 days × 11 timezones)
  including three quarter-hour offsets, half-hour DST, and the +14/−11
  extremes. Zero failures. The Week/Day filter got its own 6,570-case
  sweep.

**The permission attack, through the shipped bundle.** Nine kid attacks,
every refusal confirmed against the *database* rather than the response —
including `updateTask` with a **crafted `userIds` adding themselves to
another kid's task**, refused with `TaskPerson` unmoved. Then five forged
cookies signed with the **real** secret; the sharp one is a kid's userId
claiming `role: "admin"`, refused — **proving `dal.ts` re-reads the real
row rather than trusting the JWT's role claim.** Action confusion tested
too: real `CalendarEvent` ids passed to all four task actions left every
event byte-identical, same `updatedAt`.

It also swept a bug class nobody asked about — fetch-window honesty for
tasks — across 7 timezones, found **zero** cases of the dangerous
direction, and proved the harness detects it by reintroducing the
start-only check (5 lies in Kiritimati).

**⚠️ The caveat, and it is Fury's process error.** I dispatched C6 **while
Vision was gating.** Its verdict covers `c5fa5a0`; C6 is deleting
`TaskEditView.tsx`, which is C5's entire deliverable and the surface
Vision probed for the edit path. So **C1/C2/C3/C3b/C4 stand; C5's surface
is already stale** and needs re-gating after C6 — specifically that
`TaskForm`'s edit branch enforces the same manager-only path, that the
crafted-`userIds` attack still refuses, and that a kid still never reaches
an edit control.

This is the **stale-gate-record failure from CV2 arriving from the other
direction**: there a fix landed *after* a PASS; here a fix landed *during*
one. Doctrine says batch fixes before re-gating — I dispatched a fix mid-
gate instead, which is the same mistake wearing different clothes.
Vision refused to pretend otherwise: *"I did not re-run against a tree
that does not yet exist."*

**NOTES:** C4 touched `DaySection.tsx` outside its may-touch list —
provably inert (one doc-comment rewrite, zero code), recorded because a
boundary deviation should be visible even when harmless; the full roster
(names + avatar colours) now serialises to every client including kids,
which is **no new exposure** (`AvatarBadge` already renders those names
for all roles) but matters if per-person visibility ever arrives; and
`Task`/`TaskPerson` did **not** return to 0 — Vision deleted all five of
its own rows and verified them gone, then correctly **declined to delete
the C6 builder's live fixtures**, created after its cleanup.

### Captain, pass 1 — BLOCKED, and the blocker is Fury's contract error

**BLOCKER — `TaskEditView.tsx` is a second task-editing form.**
`TaskForm.tsx:34` already declares itself *"One form for both New and Edit
(the EventForm/RecipeForm precedent)"* and already implements it —
`defaultValues`, `isEdit`, `updateTask`, a "Save changes" label. Verified
by Fury: its only call site (`new/task/page.tsx`) passes **no**
`defaultValues`, and no task-edit route exists, so **CT2 created dead
code** — `TaskFormDefaults`, `isEdit` and the `updateTask` branch now have
zero callers and never will, because CT2 built the alternative.

The damage is measured, not principled: drift is **already present**
(`TaskForm` renders the `Repeat · coming soon` row, `TaskEditView` does
not, so K4 has two homes and one is unreachable), plus a third copy of two
validation strings and a second copy of the `Field` label pattern.

**Captain put on record that the builder could not have avoided this**, and
it is right: **C5's boundary — which Fury wrote — says "must not touch
`TaskForm.tsx`."** I never checked whether that file already did the job
before forbidding it. C4's contract made the same omission one contract
earlier. **Second contract error of this arc** (CT1's C4 was the first,
also a false premise about what already existed). The remedy needs a
contract that *can* touch `TaskForm.tsx`, which is exactly why it is a
blocker rather than a note.

### Captain retired one of its OWN rules as failed — the most valuable thing in this gate

Its CT1 trip condition was *"a third consumer of `parseLocalDateString`
forces the move to `src/lib/`."* Both C4 and C5 complied **by writing a
local copy**, each documenting that it was doing so to stay under the
threshold. So the importer count never reached three and the tree now
holds **five** copies of the forward conversion and **two** of the inverse.

> *"The rule counted importers, and a builder can hold importers at two
> forever by writing a copy. That is exactly what happened, twice."*

It also found `mealPlanDates.ts:87` already claims to be the shared home
for this job, while `TaskForm.tsx:13` cites the surviving copies as "the
house pattern" — **two comments asserting opposite conventions for the
same function.**

It declined to make this a blocker, and the reasoning is worth keeping:
three copies survived a previous Captain's PASS and a fourth survived its
own at CT1, so blocking the fifth *"would apply a standard I did not apply
one mission ago — the exact unpredictability Law 3 exists to prevent."*
**A replacement rule keyed to definitions rather than importers is drafted
and awaits Bryce.** The C6 fix deletes `TaskEditView.tsx`, which retires
CT2's two new copies for free.

**Its four rulings on my questions:** (1) the right thing moved — and the
*real* reason is stronger than C1's stated one: the render switch imports
`MonthGrid`/`DaySection`/the sheets, so moving it to `src/lib/` would be a
dependency-direction violation outright; it is structurally unable to
move. (2) Trajectory fine, cap returns in ~2 missions, and the next
candidate is the **sheets block** (`CalendarViews.tsx:215-277`), not the
switch. (3) Rule failed, see above. (4) **D1 holds at every boundary** —
no union exists anywhere — with one honest exception noted in `MonthGrid`.

**NOTES:** `MonthGrid`'s adapter makes an *open* task structurally
indistinguishable from an event below `MonthGrid` (right trade today, buys
"no second packer"; CV5 will need to tell them apart — and Captain gave
credit that `taskCompleted` is a **required** field, so a new slot site
must answer it); a **fourth** verbatim copy of the household-roster query
(sanctioned by the `personInfo.ts` clarification, but a trend at four);
`CalendarViews.tsx:87` still says `VIEW_CONFIG` is "above" when C1 moved
it; and `DaySection`'s `onOpenTask` promises a `day` its only caller
ignores.

## Handoff log

- 2026-09-04 — Mission opened on `claude/calendar-ct2-tasks-in-views`,
  branched from CT1 at `2109f75` (CT1 DELIVERED, all three gates PASS).
  Banner dispatched. **This is the last mission before the four-PR stack
  merges as one release** — Bryce's decision, recorded above.

## Delivery

_Pending._

# Mission: CT1 — Tasks, and the all-day storage fix

**Project:** family-hub (Marshee)
**Status:** DELIVERED
**Started:** 2026-09-04 · **Updated:** 2026-09-04

## Why this mission is next (the ordering was contested — resolved)

Two records disagreed. `.avengers/plans/calendar-v2.md:112` and
`CLAUDE.md:4698` both order CT1 **third** (after CV1, before CV2).
`CLAUDE.md:4833` — the 2026-09-03 session summary — orders it **seventh**
(after CV5). CLAUDE.md therefore contradicts itself.

**Resolved in favour of the plan file**, on two grounds:

1. `AGENTS.md` explicitly designates it: *"Calendar work: read
   `.avengers/plans/calendar-v2.md` first."* A plan is a contract; a
   session note is a summary, and this repo has been bitten five times by
   stale summaries. No recorded Bryce decision moves CT1 later.
2. Measured, not assumed: the database holds **exactly one** `allDay`
   row today (Camping Trip). The all-day data migration will never be
   cheaper, and K4's recurrence multiplies all-day instances.

CV2 was built ahead of CT1, out of plan order. That is harmless — CV2 is a
pure library with no consumer yet — but it is why this mission arrives
fourth rather than third.


> ## ✅ RESOLVED — the C2/C3 window is closed (`40a93bc`)
>
> Kept below as the record. The banner was live between `325bde7` and
> `40a93bc`; if a future phase ever splits a storage fix from its reader
> fix again, this is the shape of the hazard.
>
> ## 🛑 (was) DO NOT MERGE OR DEPLOY BETWEEN C2 AND C3
>
> **C2 alone is a regression.** It fixed the *storage* half (all-day rows
> now sit at UTC midnight) while every *reader* still uses local getters.
> Measured, not reasoned — `new Date("2026-09-03T00:00:00.000Z")` under
> each zone:
>
> | tree state | Denver | Los Angeles |
> |---|---|---|
> | before C2 | Sep 3 ✅ | Sep 2 ❌ |
> | **C2 landed, C3 not** | **Sep 2 ❌** | **Sep 2 ❌** |
> | after C3 — **measured** | Sep 3 ✅ | Sep 3 ✅ |
>
> Fury confirmed the real stored instants through the real
> `daysEventCovers` in four zones — Denver, Los Angeles, UTC and New York
> — all returning Sep 3, 4, 5. New York was added beyond the contract
> because it is *east* of Mountain, the direction the naive migration
> would have shifted the wrong way.
>
> So the intermediate tree is **worse than the bug it is fixing**: the
> Camping Trip now reads a day early in Mountain, where it used to be
> correct. C2 and C3 are one atomic change from the family's point of
> view and must ship together. If this session is interrupted here, the
> next one finishes C3 before anything else — it does not merge, and it
> does not reorder.

## Brief

- **Goal:** Add `Task` as a first-class thing on the calendar (schema,
  guarded actions, a form, a place in the Add sheet), and fix the standing
  defect where all-day events are stored as *local*-midnight instants and
  therefore render a day early whenever the device is west of Mountain.
- **Done means** — all six, each observable:
  1. A task can be created, edited, deleted, completed, and uncompleted
     through the shipped UI.
  2. **The California case:** the real "Camping Trip" row and a seeded
     all-day task both render on their correct days under
     `TZ=America/Denver` **and** `TZ=America/Los_Angeles`. Both fail today.
  3. `EventForm.tsx` ends the mission **under** the 350-line soft cap
     (it is at exactly 350 now, so extraction precedes any addition).
  4. The Add sheet offers **Event / Task**; the Meal entry is gone.
  5. `db:seed-tasks` / `db:clean-tasks` exist, attach to existing people,
     and refuse to delete rows they did not create.
  6. Gauntlet green, tests proven under **both** timezones.
- **Out of scope** (named, so no contract drifts into them):
  - Tasks *rendering* in the calendar views — that is CT2.
  - Recurrence UI — `rrule` is stored but inert until K4.
  - Google sync fields / "Sync to" — K6.
  - The Schedule view — CV3.
  - `CalendarViews.tsx` (348/350) extraction — that is CV3's precondition,
    not this mission's. **Must not touch.**

## Danger register (absolute)

- **`npm run db:seed` / `npm run db:reset` are forbidden.** Test data goes
  only through scoped `db:seed-*` / `db:clean-*` scripts.
- **No committed, rerunnable script may create, update, or delete `User`
  rows.** A seed needing people *attaches* to existing rows via a narrow
  read ordered `createdAt, id`, and exits non-zero naming
  `npm run db:bootstrap-users` when there are too few.
- **Local dev runs the Neon `dev` branch** — writes cannot reach
  production, but the data is a real snapshot of family life, password
  hashes included. Treat it as private; do not quote real row contents
  into reports (mission-11 leaked a real event title this way).
- **Never `git add -A` / `git add .`** while a parallel builder may be
  writing. Stage by explicit path.
- **⚠️ This mission's migration is the register's one live tension.**
  The standing rule is *additive only*. The all-day fix is a **data
  UPDATE** on existing rows, which is not additive. It is nonetheless
  approved — it is the whole point of the phase. The mitigations are
  binding: the SQL is reviewed before applying, it is scoped strictly to
  `allDay = true`, it is written to be correct for **any** row count (the
  production database is a separate branch and may hold rows dev does
  not), and it must be **idempotent** — running it twice must not shift a
  date twice. See C-plan below.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (pins `TZ=America/Denver` internally)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  — the **only** way to prove the UTC leg; `TZ=UTC npm test` silently runs
  Denver twice.
- `TZ=America/Los_Angeles node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts`
  — new for this mission; the California case is the point.
- `npm run build`

## Assembled

- **Stark + Vision** — always.
- **Strange** — a task form, a changed Add sheet, and all-day rendering are
  all things a human sees.
- **Captain** — a new schema model, a new actions file, new components, a
  migration, and a diff well past 300 lines.
- **Banner** — dispatched first; the all-day consumer surface and the
  `EventForm` extraction shape had to be facts before contracts.

## Banner's brief — accepted, with two corrections

Full brief in the mission transcript. Two facts Fury verified independently
because a wrong fact becomes a wrong boundary:

1. **Banner: `daysBetween` has "no infinite-loop bug (line 64 guard)."
   WRONG.** `src/components/EventForm.tsx:61-69` steps `addDays(cursor, 1)`
   unconditionally, so `b < a` never satisfies `!isSameDay(cursor, b)` and
   the loop never terminates. CLAUDE.md's flag was correct. Better: the
   function's own comment calls `calendarDayDiff` "unexported", but
   mission-9 (K2/C1) exported it — so this private copy is now *removable*,
   not merely fixable. That is a one-source-of-truth win, not a patch.
   (`src/lib/calendarDates.ts:88`'s `calendarDayDiff` handles both
   directions; its separate NaN-input hazard is pre-existing and OUT of
   scope here.)

2. **Banner: "the Camping Trip row (already UTC-midnight-stored) suggests
   production might already be correct by accident." WRONG.**
   `06:00:00.000Z` is *Mountain* midnight, not UTC midnight. Verified by
   read-only query: `("startAt" AT TIME ZONE 'UTC')::time` = `06:00:00`.

### ⚠️ The migration hazard Fury measured before contracting

The obvious backfill is **not idempotent**. Proven read-only against the
dev branch, running the candidate expression twice:

| pass | value |
|---|---|
| stored | `2026-09-03T06:00:00.000Z` |
| 1 | `2026-09-03T00:00:00.000Z` — correct |
| 2 | `2026-09-02T00:00:00.000Z` — **shifted back a day** |

So the `WHERE` clause is load-bearing, not decoration:

```sql
UPDATE "CalendarEvent"
SET "startAt" = ((("startAt" AT TIME ZONE 'America/Denver')::date)::timestamp AT TIME ZONE 'UTC'),
    "endAt"   = ((("endAt"   AT TIME ZONE 'America/Denver')::date)::timestamp AT TIME ZONE 'UTC')
WHERE "allDay" = true
  AND (("startAt" AT TIME ZONE 'UTC')::time <> '00:00:00'
    OR ("endAt"   AT TIME ZONE 'UTC')::time <> '00:00:00');
```

The guard buys three things at once: idempotency; protection for any row
created east of Mountain (which the naive expression would shift the wrong
way); and a no-op on a production database that has already been fixed.

**Restore value, recorded so the one real row is recoverable:** Camping
Trip — `startAt 2026-09-03T06:00:00.000Z`, `endAt 2026-09-06T06:00:00.000Z`.

**Accepted deploy-window risk, with its remedy — corrected by C6.** `build:vercel`
runs `migrate deploy` *then* `next build`, while the previous deployment
keeps serving. An all-day event created in that ~1–2 minute window is
written by old code at local midnight *after* the backfill has run, and
stays wrong. The remedy is to re-run the UPDATE above once post-deploy.
**The original wording here — "safe precisely because the guard makes it
idempotent" — was wrong and has been corrected** (mission-13/C6, following
Vision's pass-1 finding): the *shipped* guard and SET were both
session-timezone dependent, so from a Mountain-time `psql` session that
statement would have silently skipped genuinely broken rows rather than
fixing them, and in one measured case (the SET applied to an already-fixed
row under an America/Denver session) actively corrupted a correct row
instead of no-opping. C6 replaced both the guard and the SET with forms
that are session-timezone independent by construction — verified
byte-identical under UTC, America/Denver, and America/Los_Angeles
sessions, on both a first pass and a second (idempotency) pass. The
remedy now genuinely holds regardless of which session timezone runs it:
re-running the corrected UPDATE post-deploy is safe because it is truly
idempotent, not merely idempotent under the one session zone it happened
to be tested against. Recorded rather than engineered around further; the
probability of the deploy-window race itself is still low and the fix is
still one statement.

**Banner's open question, resolved:** CT1 owns the `EventForm` extraction.
The plan is explicit — "Extract from `EventForm.tsx` first (it is at
350/350) ... `TaskForm.tsx` reuses both". K3 inherits it; it does not
perform it.

## Contracts

Order: **C1 ∥ C2** (disjoint) → **C3** → **C4** → **C5**. Sized so one
dispatch completes one contract — mission-8's C4 burned 529k tokens in a
single dispatch and a rate limit killed it mid-run.

### C1 — Extract `EventForm.tsx` under the cap, and delete its duplicated date helper
- **Status:** DONE — commit `98ab9cc`
- **Boundaries:** may touch: `src/components/EventForm.tsx`, new
  `src/components/EventDateTimeFields.tsx`, new
  `src/components/EventPeopleField.tsx` · must not touch: anything under
  `src/lib/`, `src/app/`, `prisma/`, and specifically **not**
  `src/components/CalendarViews.tsx` (that is CV3's precondition).
- **Verification:** `npx tsc --noEmit`; `npx eslint .`; `npm test` (237
  pass, unchanged — this is a pure refactor); `npm run build`;
  `wc -l src/components/EventForm.tsx` → **< 350**.
- **Evidence required:** the three files' line counts; a **before/after
  DOM trace** of the new-event form at 375px proving markup is
  byte-identical (this repo has twice shipped a "pure" refactor that
  wasn't); confirmation that `daysBetween` is *deleted* and
  `calendarDayDiff` imported, with the call sites shown.
- **Done criteria:** `EventForm.tsx` under cap; zero `daysBetween`
  occurrences repo-wide; test count unchanged at 237; DOM diff empty.
- **Report:** 350 → **206** (EventDateTimeFields 164, EventPeopleField 59).
  `daysBetween` deleted. Fury re-verified all of it: line counts, the grep,
  tsc/eslint/237 tests.
  **The builder could not do the browser DOM trace** — it had no Browser
  pane tools — and said so plainly rather than skipping the evidence. It
  used the contract's permitted fallback: reconstructing the OLD JSX from
  `git show HEAD` and rendering it against the NEW components with
  identical props via `renderToStaticMarkup`, across both the timed and
  all-day branches. Its first run found a diff, **traced to a bug in its
  own comparison script**, not the source; fixed, then byte-identical in
  both scenarios. Instrument checked before result — the same discipline
  C2 needed independently.
  One behaviour-adjacent judgement, verified by Fury rather than accepted:
  it dropped a `!start || !end` guard as unreachable. It is —
  `EventForm.tsx:154` renders `<EventDateTimeFields>` only inside
  `{start && end && (…)}`.

### C2 — `Task`/`TaskPerson` schema, plus the guarded all-day backfill
- **Status:** DONE — commit `325bde7`
- **Boundaries:** may touch: `prisma/schema.prisma`, one new directory
  under `prisma/migrations/` · must not touch: any `src/` file, any
  existing migration directory.
- **Verification:** the migration SQL is **printed and reviewed before it
  is applied** (`prisma migrate dev --create-only`, then apply); after
  applying, a read-only query shows the Camping Trip row at
  `2026-09-03T00:00:00.000Z` / `2026-09-06T00:00:00.000Z`; **re-running
  the UPDATE statement a second time changes zero rows** (the idempotency
  proof — run it, report the row count).
- **Evidence required:** the full generated SQL verbatim; the
  before/after row values; the second-run `UPDATE 0`; `npx prisma
  generate` output. **Do not quote any other real row's contents.**
- **Done criteria:** migration is additive for schema and scoped to
  `allDay = true` for data; the `WHERE` guard is present exactly as
  specified above; idempotency demonstrated, not asserted.
- **Danger note:** `npm run db:seed` / `db:reset` are forbidden. Do not
  touch the `User` table.
- **Report:** Schema half verbatim-additive (`CREATE TABLE` ×2,
  `CREATE INDEX` ×4, `ADD CONSTRAINT` ×3 — nothing dropped, no existing
  column altered). Data half carries the guard verbatim. Camping Trip
  moved `06:00:00.000Z` → `00:00:00.000Z` on both ends. **Idempotency
  demonstrated:** the hand re-run reported `UPDATE 0`.
  **Fury re-verified independently, read-only** (a pasted result is a
  claim): a `count(*)` of rows still matching the migration's own `WHERE`
  returns **0**, the row reads `2026-09-03T00:00:00.000Z` /
  `2026-09-06T00:00:00.000Z` through Prisma, and both new tables exist.
  That count is the stronger instrument than the builder's re-run,
  because it proves the no-op *without* performing a write.
  Gauntlet green; 237 tests unchanged (no test files touched).
- **Lesson recorded — instrument, not result.** The builder first read the
  "before" value as `12:00:00.000Z` and briefly suspected the row had
  drifted. It hadn't: node-postgres' default type parser converts a
  `timestamp without time zone` column using the *ambient process
  timezone*, while Prisma treats the same naive column as literal UTC
  wall-clock. Two readers, two answers, same bytes. **Anyone hand-querying
  a naive timestamp column in this repo via `pg` must bypass the OID-1114
  parser or read through Prisma.** Same class as the screenshot-driver and
  stale-gate-record findings: check the instrument before the result.

### C3 — Read all-day dates with UTC getters, everywhere
- **Status:** DONE — commit `40a93bc`
- **Boundaries:** may touch: `src/lib/calendarDates.ts`,
  `src/app/actions/calendar.ts`, `src/components/EventForm.tsx`,
  `src/components/EventDateTimeFields.tsx`, and their test files ·
  must not touch: `src/lib/timelineLayout.ts` (`belongsInAllDayRow`
  deliberately never reads times — confirm, don't change),
  `src/lib/monthLayout.ts` (consumes `daysEventCovers`' output, reads no
  times — confirm, don't change).
- **Verification:** the full gauntlet **under all three timezones**
  (`America/Denver`, `UTC`, `America/Los_Angeles`) via the direct
  `node --import tsx --test` invocation — `TZ=UTC npm test` silently runs
  Denver twice.
- **Evidence required:** **a red-then-green regression test** — the new
  all-day test must be shown *failing* against the pre-fix code before
  passing against the fixed code. A test never seen red proves nothing
  (mission-12's lesson). Plus the three-timezone runs.
- **Done criteria:** an all-day event renders on identical calendar days
  in all three zones; timed events are provably unchanged (`HOUSEHOLD_TIME_ZONE`
  still has zero consumers — do not "fix" the half that works).
- **Report:** `allDayInstantToLocalDay` / `localDayToAllDayInstant` added to
  `calendarDates.ts`; `eventDaySpan` branches on `allDay`, so
  `formatAllDayLabel` and `daysEventCovers` are both corrected at **one
  point**. A repo-wide grep confirmed every other consumer
  (`EventCard`, `EventDetailSheet`, `MonthGrid`, `CalendarViews`) reaches
  all-day dates only through those two — so the single-point fix is a
  measured claim, not an architectural hope.
  **Red-then-green, with the failure quoted:** pre-fix the California case
  failed `actual: [2,3,4], expected: [3,4,5]`, alongside three other
  all-day tests going correctly red. Post-fix: Denver 241/241, UTC 241
  (237 pass / 4 pre-existing DST skips), Los Angeles 241/241 — all
  re-run by Fury. `actions/calendar.ts`, `timelineLayout.ts` and
  `monthLayout.ts` were **confirmed clean rather than skipped**; boundary
  diff empty.

### C4 — `actions/tasks.ts`, `TaskForm.tsx`, and the Event/Task Add sheet
- **Status:** (a)+(b) DONE — commit `34ab27f`. (c) **BLOCKED-ON-CONTRACT**,
  Fury's error; reissued as C4b below.
- **Boundaries:** may touch: new `src/app/actions/tasks.ts`, new
  `src/components/TaskForm.tsx`, `src/app/(app)/calendar/new/**` ·
  must not touch: `src/app/actions/calendar.ts`, `src/lib/calendarDates.ts`.
- **Verification:** full gauntlet; every exported action manually audited
  for its guard preamble.
- **Evidence required:** each action's guard quoted; **the kid-completion
  guard demonstrated against a real signed-in kid profile** — a kid may
  complete a task they are on, and is refused on one they are not, with
  both outcomes shown. Positive control first: prove the allowed path
  works before claiming the refused path is protected.
- **Done criteria:** create/update/delete are `MANAGER_ROLES`-gated in the
  null-returning form (`{ error }`, never a redirect — these render
  inline); complete/uncomplete use the new membership guard; `rrule` is
  stored but has no UI; no "Sync to" field.
- **Constitution note:** the membership guard is a **third** guard form.
  STRUCTURE.md documents two. Captain drafts the amendment; Bryce
  approves it. Do not self-authorize it.
- **Report:** actions and form built and verified. The kid guard was
  demonstrated against real household roles, **positive control first** —
  kid completes an assigned task (succeeds, `completedAt` set), same kid
  refused on an unassigned one (`completedAt` confirmed still null), plus
  manager-bypass and a signed-out `307`. Reaching them at all took real
  work: no UI references these actions yet, so they had **no Server
  Action id in the manifest**; the builder stood up a throwaway client
  harness to mint real ids, hand-signed session JWTs the Phase-1e way,
  replayed genuine POSTs, then deleted everything — a rebuilt manifest
  confirms the actions are unreachable again. Test rows cleaned:
  `Task` 0 / `TaskPerson` 0, `CalendarEvent` 4 and `User` 5 unchanged
  (Fury re-read). `EventDateTimeFields` deliberately **not** reused —
  it does start/end range math and a task has one due date — but the same
  `localDayToAllDayInstant` conversion is used, so storage matches C3.

### C4b — Fix Fury's contract error: the Add sheet, and un-complete
- **Status:** DONE — commit `d46a114`
- **Why this exists — my error, recorded plainly.** C4's contract asserted
  "*today `/calendar/new` opens `EventForm` directly*" and, relaying
  Banner unverified, "*no Meal path was ever built*". **Both are false.**
  `src/components/CalendarViews.tsx:307-329` wires the "+" to a live
  `ActionSheet` offering **Event** and **Meal**. So the contract demanded
  "the Meal entry is gone" while listing the only file that can remove it
  as must-not-touch. The builder stopped instead of improvising, and
  reverted a redundant chooser it had begun — both correct. Doctrine:
  `BLOCKED-ON-CONTRACT` means *the contract* was wrong. This is the
  second time this mission that a Banner fact went into a contract and
  had to be corrected; the lesson is that a *negative* claim ("X was
  never built") deserves the same verification as a positive one.
- **Two changes:**
  1. `CalendarViews.tsx:307-329` — replace the **Meal** item with
     **Task**, routing to `/calendar/new/task` (already built, gated, and
     working — just unreachable). Mirror the Event item's shape exactly,
     `dateParam` included. Meal keeps its own home under Kitchen; it was
     never a calendar concept.
  2. `uncompleteTask` → **`MANAGER_ROLES` only.** The builder implemented
     membership for both and flagged the tension rather than guessing —
     right call, and the plan settles it. `calendar-v2.md:73-74`: "Kids
     can mark their OWN tasks complete (**complete only**, tasks they're
     assigned to). Parents create/edit/delete/**un-complete**." A kid
     un-doing a parent's completion is exactly what "complete only"
     excludes. Not a question for Bryce — already his recorded decision.
- **Boundaries:** may touch: `src/components/CalendarViews.tsx`,
  `src/app/actions/tasks.ts` · must not touch: anything else.
- **⚠️ `CalendarViews.tsx` is at 348/350** and CV3's precondition is
  extracting it to ~230. The Task item is one line longer than Meal's.
  **Hoist the duplicated `dateParam` line out of both items** so the file
  comes back to 348 or below — that also removes a real duplication
  rather than merely paying for the swap. **The file must not leave this
  mission over 350.**
- **Verification:** full gauntlet, all three timezones; `wc -l
  src/components/CalendarViews.tsx` ≤ 348.
- **Evidence required:** the line count; the sheet's two items shown in
  the rendered output or the source diff; and the un-complete change
  demonstrated — a kid refused, a manager allowed, both against real
  roles, positive control first. **Report roles, never names.**
- **Done criteria:** the "+" offers Event and Task; `/calendar/new/task`
  is reachable from shipped UI; `uncompleteTask` manager-only;
  `CalendarViews.tsx` ≤ 348.
- **Report:** sheet now Event/Task; `dateParam` hoisted to one shared
  `const`, so the file lands back at **348** rather than 350+ — the extra
  line paid for by removing a duplication. `assertCanToggleTask` renamed
  `assertCanCompleteTask` (a helper whose name outlived its generality is
  the overclaiming class this repo keeps hitting). **The un-complete
  demonstration isolates the guard rather than observing a refusal:** the
  *same* kid session completed twice and was then refused on un-complete,
  timestamp unchanged to the byte, with a manager's successful
  un-complete in between as positive control. A refusal alone would be
  consistent with a broken cookie; this is not. Fury re-verified line
  count, both guards, and three zones.

### C5 — Scoped seed/clean scripts, and the timezone legs in CI
- **Status:** DONE — commit `1ed7632`
- **Boundaries:** may touch: new `prisma/seed-tasks.ts`, new
  `prisma/clean-tasks.ts`, new `prisma/task-seed-data.ts`, `package.json`,
  `.github/workflows/ci.yml`, **plus `prisma/calendar-seed-data.ts` and
  `prisma/seed-calendar.ts`** (carved out deliberately — see the carried
  note above; the seeder still writes the retired local-midnight
  convention and would reintroduce wrong rows on its next run) ·
  must not touch: any *other* existing `prisma/seed-*` or `clean-*`
  script.
- **Verification:** seed, then clean, then confirm the table returns to its
  exact pre-seed count; run the seed against a roster deliberately too
  small and show it exits **non-zero** naming `db:bootstrap-users`.
- **Evidence required:** the round-trip counts; the loud-exit transcript;
  proof the clean script **refuses** a row it did not create (create one
  by hand, run clean, show it survives).
- **Done criteria:** scripts attach to existing people via a narrow read
  ordered `createdAt, id` and **never** write the `User` table. If a new
  test directory is introduced, its glob entry ships in the **same
  commit** — `package.json`'s test glob is hand-enumerated, not recursive,
  so a missed entry silently drops tests from `npm test` *and* CI while
  the suite still reports green.
- **The CI gap Fury measured while preparing this contract.**
  `.github/workflows/ci.yml:45-46` runs **only** `npm test`, which pins
  `TZ=America/Denver` internally. So the UTC and `America/Los_Angeles`
  legs — *the entire point of this phase* — never run in CI, and a future
  change could silently reintroduce the California bug with a green
  check.
  Note the history: K2 found the DST tests had been **vacuous in CI for
  their whole life**, because CI ran UTC where the Nov 1 2026 week never
  crosses a boundary. The fix pinned Denver. That closed one hole by
  opening another — CI now proves exactly one zone, and this mission's
  defect lives in the difference between zones.
  **C5 must add the missing legs**, as separate named CI steps using the
  direct `TZ=… node --import tsx --test …` form (never `TZ=… npm test`,
  which the internal pin silently overrides). Evidence required: a CI run
  showing all three legs green, and a demonstration that the LA leg
  **would fail** against pre-C3 code — a leg that has never been red
  proves nothing, same standard as C3's own regression test.

## Notes carried (not blockers, routed to a later contract)

- **`src/lib/calendarDates.ts:84` is now doubly stale.** It reads
  "`CalendarViews.tsx`'s own `daysBetween` copy can share this one" — but
  the copy lived in `EventForm.tsx`, not `CalendarViews.tsx`, and C1 has
  now deleted it. C1 flagged the mismatch rather than reaching outside its
  boundary to fix it, which was right. **Routed to C3**, whose boundary
  already includes that file. This repo surfaced nine overclaiming comments
  in one mission (K2); the class is worth clearing on contact.
- **`parseLocalDateString` is exported from a component file** and imported
  by `EventForm.tsx` — a component→component helper edge. It may belong in
  `src/lib/`. **Left for Captain to rule on**; Fury is not pre-empting the
  structure gate.


### C6 — Fix batch for Vision's two pass-1 blockers
- **Status:** DONE — commit `9169a64`
- **Boundaries:** may touch: the migration directory, `prisma/clean-tasks.ts`,
  `prisma/seed-tasks.ts`, `prisma/task-seed-data.ts`,
  `src/app/(app)/calendar/new/task/page.tsx`, `src/app/actions/tasks.ts`,
  and the mission file's remedy paragraph only · must not touch:
  `prisma/schema.prisma`, `prisma/seed-calendar.ts`,
  `prisma/calendar-seed-data.ts`, `src/lib/**`, `src/components/**`,
  `.github/**`, `package.json`.
  **Recorded late — Vision pass 2 filed this as a NOTE and it was right.**
  The contract existed only in the dispatch prompt, so Vision had to
  reconstruct the may-touch list to audit against it. *A boundary living
  only in a dispatch prompt is not a boundary* — the same finding
  mission-12 filed. Written down here so the audit trail is real.
- **Verification:** full gauntlet, three timezone legs, baseline exact.
- **Report:** both blockers closed. **C6 deviated from the contract and was
  right to**: Fury said "keep the SET exactly as shipped", C6 measured that
  the SET was *also* session-dependent and fixed both clauses. Verified by
  Fury under 4 sessions and by Vision under **8**, including three
  quarter-hour offsets — identical everywhere, pass 1 updates the broken
  row, pass 2 updates 0. Checksum patched on dev and audited by Vision
  (`shasum -a 256` matches; `migrate status` clean; the migration is absent
  from `main`, so production applies the corrected file fresh, and
  `migrate-on-production.mjs` skips outside production so no preview ran it).

### C7 — Strange's blocker: make the repeat row a real disabled control
- **Status:** DONE — commit `214a546`
- **Boundaries:** may touch: `src/components/TaskForm.tsx` only.
- **Report:** `<button type="button" disabled>` + `disabled:opacity-50`,
  label reworded to `Repeat · coming soon`, `aria-disabled` removed (now
  zero instances repo-wide). Measured after: `opacity 0.5`/`disabled true`
  vs `1`/`false` on both live inputs, light and dark, still 343×48, no
  overflow at 375. Left one stale comment — see the C8 queue.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | **died — Fable rate limit**, zero work done | — | Re-dispatched on Opus. Vision is Fable-pinned by K1's cost review; Captain and Strange are already Opus, so only this gate was affected. Substituting an equal-tier model beat leaving the mission ungated. |
| 1 | Captain | **PASS** | 0 | 6 notes; 2 constitution amendments drafted for Bryce |
| 1 | Vision (Opus) | **BLOCKED** | 2 | 9 notes; both blockers are "a comment claims a guarantee the code lacks", neither is the feature |
| 1 | Strange | **BLOCKED** | 1 | 3 notes; 2 of them pre-existing and app-wide, correctly not charged to CT1 |
| — | C6 fix batch | DONE `9169a64` | — | Both Vision blockers fixed; C6 corrected Fury's own measurement in the process |
| — | C7 fix | DONE `214a546` | — | Strange's blocker fixed; left one stale comment, queued for C8 |
| 2 | Vision | **PASS** | 0 | 7 notes; both pass-1 blockers closed and proven non-vacuous |
| — | C8 fix | DONE `2109f75` | — | Four comments made true; SQL byte-identical |
| 2 | Strange | **PASS** | 0 | 2 notes; blocker closed, and it caught a false blocker in its own instrument |

### Strange, pass 2 — PASS

`ALL_THREE_SAME` is now **false** (`bgSame` true, `colorSame` true,
**`opSame` false**) — identical in light and dark, at 375 and 320.

It judged the fix on the pixels rather than the numbers, and pressed on
whether its own prescription was sufficient: **it is, but the label is
load-bearing, not decorative.** `disabled:opacity-50` alone would have
been ambiguous; the dimming plus the words "coming soon" is what makes it
read as *not built yet* rather than *broken*. And the disablement is real,
not cosmetic: zero handlers fired, focus refused, no navigation.

**Vocabulary confirmed, no fourth invented:** `disabled:opacity-50` is the
app's dominant treatment (**30** uses in `src/`), so CT1 joined the
majority. `aria-disabled` is now at **zero** occurrences.

**It caught a false blocker in its own instrument.** Its first occlusion
sweep flagged the header account button — which turned out to be
`<nextjs-portal>`, the Next dev overlay, not the app. Re-swept with it
removed: **0 of 18** controls occluded at both widths. Third instrument
trap this mission, and the third one caught before it became a finding.

**NOTE** — the disabled label composites to 1.88:1 in light. Readable, and
WCAG 1.4.3 exempts inactive components, so not a violation. Recorded
because it is a property of the app's *existing* disabled vocabulary,
not something CT1 introduced — `CalendarHeader`'s arrows (`opacity-40`)
and `PantryRow`'s steppers (`opacity-30`) are fainter still. Holding CT1
to a stricter bar than shipped code would be inventing a rule at gate
time.

**NOTE** — `<button disabled>` drops the row from tab order. Correct for a
control with nothing to do, and not a regression: the previous
`aria-disabled` `<div>` had no `tabindex` either.

**It verified a claim in its own dispatch rather than accepting it** —
that C8 was comment-only — by hashing the SQL with comments stripped
(identical both sides) and diffing the two source files comment-free.

### Strange, pass 1 — BLOCKED, and it checked three instruments before trusting any reading

**Instrument checks first, and all three mattered.** It proved theme
emulation genuinely switches before making any colour claim (mission-12's
lesson). It found **the dev server on :3000 serving SSR HTML referencing
chunks that 404** — every page rendering "This page couldn't load" — and
refused to review through it, running an isolated server instead. And it
**nearly filed a false defect**: with the Browser pane hidden, CSS
transitions freeze, so the *enabled* submit button read `opacity: 0.5`;
`getAnimations()` showed a running transition at `currentTime: 0`, and a
transition-suppressed clone resolved to `opacity: 1`. Layout stayed live,
so its size measurements remained valid.

**BLOCKER — the inert "Does not repeat" row is pixel-identical to the live
editable fields above it.** Measured against both the live `Due date`
input and the `Title` input holding typed text: same background, same
text colour, same 343×48 box, same radius, `opacity: 1` —
`ALL_THREE_SAME: true` in **both** themes, and still identical at 1280px.
Tapping does nothing.

The mechanism is the valuable part, because the obvious fix would not have
worked: the row's only disabled signal is `text-muted`, but **every live
field in this form already renders `--muted`**, inherited from its
`<label className="block text-sm text-muted">` wrapper — so the dimming
buys *zero* differentiation. And `aria-disabled` sits on a `<div>` with no
`role`, where ARIA states are inert. It is also the only `aria-disabled`
in the repo, inventing a third vocabulary where two are settled
(`disabled` + `disabled:opacity-50` on a real button — used on line 180 of
this very file — and the plain "Coming soon." wording on `/chores`).
The wording is not the lie; the **affordance** is.

**NOTES (all three correctly not charged to CT1):**
1. Navigating to the task form shows a **calendar-shaped skeleton** (892px,
   day rows and circles) before a 693px form paints —
   `calendar/loading.tsx` is the nearest Suspense ancestor for
   `/calendar/new` too, so this has been true since K1. A loading state
   shaped like different content. **Route to whichever phase adds the next
   form route**; CT2 will add more under this boundary. The form's own
   CLS measured **0**.
2. **User-entered text renders at 4.33:1, below WCAG AA** — `--muted` on
   `--surface-2` — on the Event form too, so it comes from the shared
   `Field` wrapper pattern, not this mission. Dark mode is fine (5.44:1).
   It slipped because DESIGN.md's contrast promise is about declared
   token *pairs*, and this pair is an inheritance accident. **Deserves its
   own contract** — the fix touches every form in the app.
3. The all-day due date reads honestly: no time input offered, none
   implied.

**Verified clean, measured:** every tap target at 375 *and* 320 (chips 48,
Submit 343×48, BackLink 82×44, no horizontal overflow); the Add sheet's
two rows both 343×**56**, balanced in both themes; **occlusion checked at
the scroll position a user actually taps from** — Submit clears the nav by
55px, matching DESIGN.md's own recorded figure; the error state in
`--warn` on `--warn-soft` at 4.51:1, correct per the warn-vs-danger rule;
loading (grey bars) and empty (crisp dashed card) not mistakable; role
gates positive-control-first — admin 200 with the form, kid 200 with no
form *and no Add button at all*, signed out 307; and the all-day fix
semantically correct in four zones including `Pacific/Auckland`.

### Vision, pass 1 — BLOCKED, and Fury verified both before acting

Gauntlet re-run and matched exactly. Boundaries clean on all six contracts.
Danger register clean. Baseline restored (`Task 0, TaskPerson 0,
CalendarEvent 4, User 5`), real all-day row byte-identical.
**It could not break the all-day fix**: 9 cases × **17 timezones**
including `Pacific/Chatham` (+12:45), Kathmandu (+5:45), Eucla (+8:45),
Kiritimati (+14), both 2026 DST transitions, single-day and degenerate
spans — 17/17 pass, and the probe goes red on 7 of 9 against pre-C3 code,
so it is non-vacuous.

**B1 — the migration guard is session-timezone dependent. REAL, but
Vision's severity and its prescribed fix are both WRONG.** Fury measured
the verbatim shipped SQL as pure SELECTs under two session zones:

| session | broken row (06:00) | already-fixed row (00:00) |
|---|---|---|
| `UTC` (Neon serves `GMT` — confirmed) | fires ✅ | skips ✅ |
| `America/Denver` | **skips** ❌ | **fires** ❌ |

Inverted, exactly as Vision said — `(ts AT TIME ZONE 'UTC')::time` casts a
*timestamptz*, and `::time` on a timestamptz reads the session zone. But:
- ~~The shipped **SET** is session-robust, so the "fires on a fixed row"
  branch is a no-op by value, not the corruption Vision described.~~
  **❌ WRONG — Fury's error, corrected by C6 and re-verified by Fury.**
  See "Fury's instrument error" below. Vision's severity claim was
  **right**: under a Denver session the shipped statement corrupts an
  already-fixed row to `2026-09-02 18:00`.
- **Vision's proposed replacement SET drifts.** Measured:
  `date_trunc('day', (ts AT TIME ZONE 'America/Denver') AT TIME ZONE 'UTC')`
  yields **`2026-09-02 18:00`** under a Denver session. Applying its
  prescription would have introduced the corruption it was warning about.
- Both hazards are real, not one instead of the other: from a Mountain
  session the statement **skips genuinely broken rows** *and* **corrupts
  already-fixed ones**.

#### ⚠️ Fury's instrument error — the second this mission, same class

I measured the SET expression and reported it session-robust. It is not.
My probe rendered the result with an explicit
`to_char(… AT TIME ZONE 'UTC')`, which **bypassed the implicit assignment
cast**. The expression yields a `timestamptz`; storing that into a
`timestamp without time zone` column applies a session-timezone cast at
*assignment*, and that is where the corruption happens — not in the
expression I was watching. C6 caught it by writing to a real temp table
with `TIMESTAMP(3)` columns and reading back via `::text`, which is the
faithful test. Fury reproduced it:

| session | broken (06:00) | already-fixed (00:00) |
|---|---|---|
| `UTC` | → `2026-09-03 00:00` ✅ | unchanged ✅ |
| `America/Denver` | **unchanged** ❌ | **→ `2026-09-02 18:00`** ❌ |

**So Vision was right and I partially overruled it on a bad measurement.**
Only its *prescription* was wrong (its `date_trunc` replacement drifts
under Denver — that part stands). The lesson is the one this repo already
records twice and I repeated anyway: **measure the operation, not a
rendering of it.** An expression's value and the value that lands in a
typed column are different things, and only one of them is the bug.

C6's fix converts through explicit `AT TIME ZONE` in both directions and
never leaves a `timestamptz` to be implicitly cast. Fury verified it under
**four** sessions (UTC, Denver, Los Angeles, `Asia/Kathmandu` +5:45):
pass 1 updates exactly the broken row, **pass 2 updates 0**, every row
landing at correct UTC midnight, identical in all four.

Correct fix, measured in both zones: keep the shipped SET, change the
guard to the **naive** form `"startAt"::time <> '00:00:00'` —
session-independent because `naive::time` never consults the session zone.
This is the second recorded instance of a gate's *prescription* being
wrong while its *finding* stood (CV1: "Vision blocked its own
prescription"). **The finding is what a gate is for; the fix still gets
measured.**

**B2 — `clean-tasks.ts` does not have the property it asserts. REAL,
accepted outright.** Vision planted a task through the real `createTask`
action titled *exactly* a seed template title; `db:clean-tasks` deleted
it and reported "Deleted 6 test tasks". The file claims it "**refuses** to
touch a real task, even one a household member happened to title
identically" — false. **C5's own evidence was vacuous:** the builder
tested with a title *not* in the templates, which cannot exercise the
claim. `seed-tasks.ts` carries the same title-only `deleteMany`, so
re-seeding destroys a matching real row too. Matters because CT2 puts
real chores in this table.

### Captain, pass 1 — PASS, and it corrected Fury twice

Structure clean: `src/lib/` imports nothing from `app/`/`components/`; no
new lib module imports `db`; no test file can transitively reach it (the
`loginRateLimitPolicy` hazard not repeated); schema additive with no
enums; zero hand-rolled role lists; `prisma/*.ts` → `calendarDates.ts`
holds because that file is pure and carries no `server-only`.

**Its three rulings:**
1. **The membership guard is genuinely a third form** — it reads a *row*
   to decide authorization, which neither documented form does. Amendment
   drafted; awaiting Bryce.
2. **`parseLocalDateString`: NOTE, not blocker.** No written rule forbids
   a component→component helper. But the edge got *worse* —
   `TaskForm.tsx` now imports that one function from
   `EventDateTimeFields` and **nothing else**, having deliberately
   declined to reuse the component. Captain declined to invent a rule for
   a three-line function and instead set a **trip condition**: a third
   consumer, or any consumer outside `src/components/`, makes the move
   mandatory.
3. **The size call was right, and not the treadmill** — measured:
   CV0 ended 267, CV1 spent 81 lines to 348, **CT1 spent zero.** It also
   made the precondition enforceable: *the next mission needing a line in
   `CalendarViews.tsx` performs the `ViewConfig` extraction first, whether
   or not it is CV3* — because C4b spent the one duplication available to
   pay for a line, and the next one has nothing left.

**⚠️ Captain corrected two figures in Fury's own dispatch.** I quoted
`EventForm.tsx` at 206 and `tasks.ts` at 266 — the numbers from C1's and
C4's *reports*. Real values at gate time: **213** and **278**; later
contracts had added to both. Neither is near a cap, so nothing turned on
it — but I passed builder-reported numbers to a gate as current fact
instead of re-measuring at dispatch. That is this project's
"recorded but not verified" class pointed at me: **a figure in a report
describes the tree at report time, not the tree you are dispatching
against.** Re-measure at dispatch.

## Queued for the next fix batch (C8)

- **`src/components/TaskForm.tsx:48-52` is now stale, and C7 judged it
  accurate.** It quotes `"Does not repeat"` — a label C7 itself replaced
  with `"Repeat · coming soon"` — and calls the row "a plain,
  non-interactive row rather than a working control", when C7 made it a
  real `<button disabled>`. Fury caught it on verification rather than
  accepting the builder's judgement. It is a small thing and it is
  *exactly* the class Strange's own blocker was about: a description that
  outlived what it describes. The sentence's substance (the row exists so
  K4's control has a fixed place to land, per the no-stubbing rule) is
  still right and should survive the rewrite.

## Handoff log

- 2026-09-04 — Mission opened. Ordering contest resolved in favour of the
  plan file (reasoning recorded above). Banner dispatched for the six-area
  research brief. Tree green at `e483dc2`: tsc, eslint, 237 tests.
- 2026-09-04 — Banner reported. Two of its facts corrected by Fury before
  contracting: `daysBetween` DOES have the `b < a` infinite loop (and is
  now deletable outright, since `calendarDayDiff` was exported in
  mission-9), and the Camping Trip row is NOT already UTC-correct.
- 2026-09-04 — Fury measured the migration's idempotency hazard read-only
  before writing C2: the naive expression shifts a fixed row back a second
  day on a second pass. The `WHERE` guard is now a contract requirement,
  not a suggestion. Five contracts written; C1 ∥ C2 dispatched.
- 2026-09-04 — **C2 DONE** (`325bde7`), evidence accepted and
  independently re-verified read-only. C1 still building. Next: C3 (UTC
  getters) once C1 lands, since both touch `EventForm.tsx`.
- 2026-09-04 — **C1 DONE** (`98ab9cc`), re-verified. Two notes carried (see
  above). C3 dispatched — it is deliberately NOT parallel with C4, because
  C4's `TaskForm` reuses the very components C3 is editing.
- 2026-09-04 — **C4b DONE** (`d46a114`). Tasks are now reachable from the
  shipped "+" sheet. C5 dispatched — the last contract, and the one
  closest to the danger register (it writes seed scripts against a
  database holding real family data).
- 2026-09-04 — **C4 (a,b) DONE** (`34ab27f`); **(c) BLOCKED-ON-CONTRACT
  on Fury's own wrong premise.** The Add sheet exists and offers
  Event/Meal; the contract both demanded Meal's removal and forbade
  touching the file holding it. Reissued as C4b, which also corrects
  `uncompleteTask` to manager-only per the plan's decision #12.
- 2026-09-04 — **C3 DONE** (`40a93bc`). The do-not-merge banner is lifted;
  Fury re-ran all three zones and separately confirmed four. Two notes
  carried, one of them red: the calendar seeder still writes the old
  convention. C5's boundary widened to own it. Next: C4.
- 2026-09-04 — ⚠️ **Fury measured the intermediate state and it is a
  regression** (see the banner at the top of this file). C2's storage fix
  without C3's reader fix leaves all-day events a day early in *both*
  zones, including Mountain, where they were previously correct. Recorded
  as a hard do-not-merge boundary rather than trusted to memory.

## Delivery

**Shipped:** CT1 in full — `Task`/`TaskPerson` schema, guarded task
actions, `TaskForm`, the Event/Task Add sheet, the all-day storage fix,
scoped seed/clean scripts, and three timezone legs in CI. Eight contracts
(C1–C7 plus C4b). PR **#12**, stacked on #11 → #10 → #9.

**Shipped check:** `git log origin/main..HEAD` is expected to be large —
this branch sits four deep on unmerged PRs by Bryce's standing decision.
The mission's own commits start at `926f97b`. Branch pushed; PR #12 open;
CI green including the new UTC and Los Angeles legs.

**Gate verdicts — all three PASS.** Captain PASS (pass 1, 0 blockers).
Vision BLOCKED (pass 1, 2 blockers) → C6 → **PASS** (pass 2). Strange
BLOCKED (pass 1, 1 blocker) → C7 → **PASS** (pass 2). No gate exceeded
2 of its 3-pass budget.

**The pattern worth carrying:** all three blockers this mission produced
were **documentation promising a property the code did not have** — never
the feature. And there were **five instrument errors**, three caught by
gates before becoming findings (a frozen-transition false positive, a
`<nextjs-portal>` false occlusion, a stale dev server) and **two of them
Fury's own** (an idempotency probe that modelled the wrong expression, and
a measurement that bypassed the implicit assignment cast and wrongly
downgraded a real blocker). *Check the instrument before the result* is no
longer a slogan here; it is the single highest-yield habit in this
mission.

**Deliberate leftovers:** see the C8 queue above, plus Strange's two
app-wide notes (form text at 4.33:1; the calendar-shaped skeleton on form
routes), Captain's two amendments awaiting Bryce, and Vision's
unreachable-`OR`-guard note.

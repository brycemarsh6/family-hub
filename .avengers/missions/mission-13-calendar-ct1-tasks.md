# Mission: CT1 — Tasks, and the all-day storage fix

**Project:** family-hub (Marshee)
**Status:** BUILDING
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

**Accepted deploy-window risk, with its remedy.** `build:vercel` runs
`migrate deploy` *then* `next build`, while the previous deployment keeps
serving. An all-day event created in that ~1–2 minute window is written by
old code at local midnight *after* the backfill has run, and stays wrong.
The remedy is to re-run the UPDATE above once post-deploy — safe precisely
because the guard makes it idempotent. Recorded rather than engineered
around; the probability is low and the fix is one statement.

**Banner's open question, resolved:** CT1 owns the `EventForm` extraction.
The plan is explicit — "Extract from `EventForm.tsx` first (it is at
350/350) ... `TaskForm.tsx` reuses both". K3 inherits it; it does not
perform it.

## Contracts

Order: **C1 ∥ C2** (disjoint) → **C3** → **C4** → **C5**. Sized so one
dispatch completes one contract — mission-8's C4 burned 529k tokens in a
single dispatch and a rate limit killed it mid-run.

### C1 — Extract `EventForm.tsx` under the cap, and delete its duplicated date helper
- **Status:** PENDING
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
- **Status:** PENDING (depends on C1 + C2)
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

### C4 — `actions/tasks.ts`, `TaskForm.tsx`, and the Event/Task Add sheet
- **Status:** PENDING (depends on C1 + C2)
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

### C5 — Scoped seed/clean scripts, and the timezone leg in CI
- **Status:** PENDING (depends on C2 + C4)
- **Boundaries:** may touch: new `prisma/seed-tasks.ts`, new
  `prisma/clean-tasks.ts`, new `prisma/task-seed-data.ts`, `package.json`,
  `.github/workflows/ci.yml` · must not touch: any existing `prisma/seed-*`
  or `clean-*` script.
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

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

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

## Delivery

_Pending._

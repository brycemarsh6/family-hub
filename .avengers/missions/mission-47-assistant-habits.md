# Mission 47: Winnie's habits and chores (Assistant API)

**Project:** family-hub (Marshee)
**Status:** DELIVERING
**Started:** 2026-11-06 · **Updated:** 2026-11-06
**Branch:** `claude/assistant-habits` from `origin/main` 88d094b (holds
174f74d, PR #65). Worktree `parallel-work-strategy-e056c5`.

## Brief

- **Goal:** Winnie (Bryce's Grok bot, the one client of `/api/assistant/v1/`)
  can read and act on habits and chores: today's list, a person's habits, a
  habit's stats (streak, hours progress), the chore chart; check or skip a
  habit or chore for a named person, undo either, log and remove her own
  hours entries; add and edit habits and chores. Never delete one.
- **Done means:** the routes in Design answer in production behind the token
  (each new path answers 401 to a tokenless `curl`, read-only check); every
  write records before/after copies and `POST /audit/{requestId}/undo`
  reverses it **with the streak caches rebuilt in the same transaction**
  (proven live on dev: a three-day check run undone shows 3 → 2 and equals
  a fresh recompute); the family's Server Actions behave identically (parity
  script on dev); Vision and Captain PASS; gauntlet green in both time
  zones; CLAUDE.md record fixes in the same PR.
- **Out of scope** (leftovers, not built): nudges, vacations, plan-the-day,
  reorder, chore week moves and skips (`ChoreWeekOverride`), a habits line
  in `GET /summary`, any delete of a habit, changing `isPrivate` through the
  API, plans and goals (the next mission), calendar and tasks (after both).
- **Why no plan existed:** `habits-chores-v1.md` decisions 42 to 43 cover
  Winnie texting reminders (the other direction) and say "later, Winnie can
  act in Marshee on a text reply"; `plans-goals-v1.md` has one line on
  voice logging. This file is the first plan for the API side.

## Standing rulings (Bryce, 2026-11-06, don't re-litigate)

- Whole app except passwords, family members and roles. One token, no
  per-person permissions, acting as nobody. Every write undoable 30 days.
  She deletes only what she created (`didAssistantCreate`,
  `src/lib/assistant/audit.ts`).
- Goals, vision entries, plan items, habits: add and edit, never delete.
- Order for Winnie: habits and chores (this), then plans and goals, then
  calendar and tasks.
- **Privacy default, set by Bryce for this mission and listed for his
  review:** Winnie sees and changes Bryce's private habits, and other
  people's habits only when they are not private. `canSeeHabit` and its
  siblings in `src/lib/habits/access.ts` stay the one source of truth.

## Decided by Hill (2026-11-06; Bryce can overturn any)

Hill read hill.md, missions 40 and 45, the habits plan, the access,
vocabulary and writer files. Nothing asked was BRYCE ONLY.

- **H1 archive and restore via PATCH (high):** yes. `archived: true/false`
  on any habit or chore she may see, with copies; a PATCH that changes
  nothing records nothing; no `DELETE /habits/{id}`. Decision 58 made
  Archive the reversible alternative to Delete; the Edit screen offers it.
- **H2 `GET /habits/today` with no `personId` (high):** every active
  person's day in household order (`User.familyOrder`), tablet and
  deactivated people left out, Bryce's private habits only under Bryce.
  Decision 46 ("one bundled text per person per day") and `GET /summary`
  are the precedents.
- **H3 create defaults (medium; Bryce to look at item 4 first):** Fury's
  list (`participantIds` required; `kind` "habit", `schedule` "daily",
  `mode` "build", `sharing` "each", `track` "checks", `carryOver` false;
  icon, lifeArea, timeOfDay, createdById null; `isPrivate` never settable
  by Winnie) plus: (1) `everyone: true` accepted as the one alternative to
  `participantIds` (decision 87); (2) schedule details required as
  `checkInput` demands ("weekdays" needs `weekdays`, "biweekly" needs a
  Sunday `anchorWeek`), the one default being `times` = 1 for weekly and
  monthly; (3) `track: "hours"` requires `weeklyHours` 1 to 80, `paceDays`
  defaults "monsat" (decision 183), hours shape forced as `habitColumns`
  does; (4) **an hours habit for one person is private, as the app makes
  it (decisions 186, 194)**; (5) a chore defaults to "weekdays" and needs
  `weekdays`, the rest as `choreChart.ts:50-65`; a chore may not track
  hours. Refusals reuse the app's words.
- **H4 403 wording (high):** "Winnie can only remove time she logged
  herself." (the app's noun for an entry is "time").
- **H5 skips on chores (high):** yes, exactly as for habits (today or up to
  7 days back, never the future); week-level chore changes stay out.
- **H6 minutes (medium):** whole minutes 30 to 720 in steps of 15; refuse
  anything else with 400, never clamp; wording "Pick a time from half an
  hour to 12 hours, in quarter hours."; the check lives in one shared
  function beside `checkHoursTarget` in `habitHoursVocabulary.ts` and the
  app's `addHabitTime` action uses it too (its stepper still sends
  multiples of 30, so nothing visible changes). Reason: `formatHours`
  rounds to quarter hours, so quarter-hour entries keep every shown number
  exact. Applied to C1 by amendment (sent to the builder mid-build).
- **H7 Winnie's check shows no tapper (high):** acceptable; `loggedById`
  stays null; no screen reads it today; shopping is the precedent.

- **H8 one-person hours habit for someone other than Bryce (medium;
  decided after Vision pass 1):** create it **not private**. A one-person
  hours habit is private only when that person is the owner
  (`ASSISTANT_OWNER_USER_ID`); otherwise, and when the owner id is unset,
  `isPrivate` is false, and the create is never refused on that count.
  This amends H3 item 4 to: "an hours habit for one person is private only
  when that person is the owner; otherwise not private, as the app's form
  does for a habit that is not Just me (decision 194)." Reason: decision
  194 is the real rule (Private turns on with "Just me"); the app's form
  cannot even make a one-person hours habit for someone else, and the
  server's "you must still be able to see what you made" rule would
  otherwise make such a create impossible for Winnie, since `isPrivate` is
  never hers to set. The person can flip Private on in the app (decision
  78). Tell Winnie in one line.

**For Bryce to look at first:** H8 with H3 item 4 (privacy defaults for
habits Winnie creates), H3 items 1 to 3, H6 (quarter hours), and the
privacy preset itself (`ASSISTANT_OWNER_USER_ID`).

## Design (Fury's structural calls)

### Winnie's actor

`src/lib/assistant/habitActor.ts` (pure): `habitActorFor(ownerId)` returns
`{ userId: ownerId ?? "", role: "admin" }`; `habitActorEnv.ts`
(`server-only`) is the one reader of `ASSISTANT_OWNER_USER_ID` and exports
`assistantHabitActor()` (split by F1, Captain's B5). Fed
unchanged to `access.ts`: a manager who is "Bryce" for the participant test,
so she sees his private habits and nobody else's, and may check for anyone
on a habit she can see. Unset, she sees non-private habits only. Bryce sets
the variable in Vercel (his id from `GET /family`). `loggedById` and
`createdById` are `null` on her writes (the bot is not a user, like
shopping's `addedById`); ownership is the audit log.

### Routes (`src/app/api/assistant/v1/habits/...`)

| Method and path | Does | Backed by |
|---|---|---|
| `GET /habits?personId=&includeArchived=` | habits and chores Winnie can see (optionally one person's), each with participants and their streaks | `habitReads.ts` |
| `GET /habits/today?personId=` | one person's (or every visible person's) day: each row with state done / skipped / left, due, carried, hours progress | `loadTodayPage` per person + `canSeeHabit` filter |
| `GET /habits/{id}` | one habit with stats: per participant current and best streak (aged with `streakAfter`), this week's hours (`hoursWeek`), last 14 days of logs | `habitReads.ts` |
| `GET /habits/chart?personId=` | that person's chore chart for this week | `loadChoreChart` |
| `POST /habits` | add a habit or chore | `createHabit` |
| `PATCH /habits/{id}` | edit fields and participants; `archived: true/false` (H1) | `updateHabit`, `archiveHabit`, `restoreHabit` |
| `POST /habits/{id}/check` `{ personId, day? }` | check ("late" on a carried day) | `tapCheck` |
| `POST /habits/{id}/skip` `{ personId, day? }` | skip the day | `tapSkip` |
| `DELETE /habits/{id}/check?personId=&day=` | undo a check (a skip stays) | `tapUncheck("check")` |
| `DELETE /habits/{id}/skip?personId=&day=` | undo a skip (a check stays) | `tapUncheck("skip")` |
| `POST /habits/{id}/hours` `{ personId, minutes, day? }` | log time on an hours habit | `logHours` |
| `DELETE /habits/{id}/hours/{entryId}` | remove an entry she logged (`didAssistantCreate("HabitTimeEntry")`, else 403) | `removeHours` |

Same day window as the app: today, the last 7 days, plus the one carried day
(`isTapDayAllowed`); never the future. Together habits fan out to every
participant like the app. Refusals come from the shared module as
`WriteError` (`src/lib/writeError.ts`) mapped by `toWriteFailure`
(`missing` → 404, else 400); 403 `forbidden` exists in `ApiErrorCode`.

### Shared rule modules (actions and routes behave identically)

- **`src/lib/habitTapWrites.ts`** (new, `server-only`, top of `src/lib/`
  since it reads through `habitsRead.ts`; moved there by F1): the guard that
  today lives in `src/app/actions/habitChecks.ts` and `habitHours.ts`, as
  functions taking `(guard: HabitGuard, input, today, client = db)` (F1:
  the caller passes its `canLogFor` test as a callback, the module holds
  no actor; `removeHours(guard, entryId, today, client)`):
  `tapCheck`, `tapSkip`, `tapUncheck(kind)`, `logHours`, `removeHours`.
  Each loads the habit (`loadHabitForAction`, `loadLogStatus`,
  `loadCarriedDay`, `loadTimeEntryForAction` from `src/lib/habitsRead.ts`),
  applies `canLogFor`, the day window, archived and track refusals,
  `statusForTap`, calls the existing writer, and **returns the rows it
  created or removed** (full `HabitLog` / `HabitTimeEntry` rows, read inside
  the same transaction) or a `WriteError`. The messages are the actions'
  exact strings, exported as constants the actions reuse.
- **`src/lib/habitInput.ts`** (new, pure, top of `src/lib/` since it takes
  `goalVocabulary.ts`; moved there by F1): `checkHabitInput(input,
  household, alreadyOnHabit)` is `checkInput` moved out of
  `actions/habits.ts` with the household list passed in (the one DB read it
  did), plus the `HabitInput` type. Messages unchanged.
- Writers' signatures do not change. Routes that need Habit and
  HabitParticipant copies wrap the writer in `db.$transaction` and read the
  rows before and after inside it (`FOR UPDATE` on the habit for PATCH, as
  cookbooks do).
- **Actions become thin:** `habitChecks.ts`, `habitHours.ts` call
  `habitTapWrites` and return `{ error }` from the module's message;
  `habits.ts` imports `checkHabitInput`. No family-visible wording changes.

### Undo learns habits

- `src/lib/assistant/undoModels.ts`: `Habit` (tier 0, parent),
  `HabitParticipant`, `HabitLog`, `HabitTimeEntry` (tier 1). REFERENCES for
  Habit list every child; the ones undo does not cover (`HabitPlannedDay`,
  `ChoreWeekOverride`, `Nudge`, `PlanItem`) always count as in use, like
  `VoiceChange`. FOREIGN_KEYS: `habitId` refuse, `userId` refuse,
  `loggedById` and `createdById` null.
- **Volatile columns** (new): `VOLATILE: HabitParticipant → currentStreak,
  bestStreak, streakAsOf`. Undo neither matches on them nor writes them:
  they are caches.
- **After-undo recompute** (new `src/lib/assistant/undoHooks.ts`,
  `server-only`, called from `undoWrites.ts` after the steps, same
  transaction): every `(habitId, userId)` named by a HabitParticipant,
  HabitLog or HabitTimeEntry step → `recomputeStreaks(habitId, userIds,
  today, tx)`; every Habit step whose row still exists → `recomputeHabit(tx,
  habitId, today)`; then (F1) the chore streak of every person named,
  plus the current participants of restored habits, is rebuilt once with
  `recomputeChoreStreaks`. The pure grouping `streakWork(steps)` lives in
  `undoPlan.ts`. `today` is `householdToday(now)`. Direction lib → lib
  (`assistant` imports `habits`); `habits` never imports `assistant`, so no
  cycle. **Why:** a check's undo deletes the log row; without this the
  cached flame stays one too high until the next tap.

### Records

- This file; CLAUDE.md Current status (mission 44 and 45 bullets' "Next for
  Winnie" lines → this mission, then plans and goals, then calendar/tasks
  after CD1, then replacing the app's Claude features with her; drop the
  "review Hill's H1 and H4" line; add the mission 47 bullet; Bryce's
  checklist gains `ASSISTANT_OWNER_USER_ID`).

## Danger register

- AGENTS.md in full. Dev branch only; `npm run db:seed` / `db:reset`
  forbidden; never write the `User` table (reads of id and role are fine,
  **print ids and counts only, never names**); secrets only in `.env` and
  Vercel; agents never open, print or edit `.env`.
- Winnie's real token never appears anywhere. Live tests use a throwaway
  hash in the dev server's process env only. Never write to production; the
  production check is `curl` without a token → 401.
- Test rows are `ZZZ Assistant Test …` habits (and their logs and entries),
  deleted by id afterwards. Never check, skip, edit or archive a family
  habit in a test: tests make their own.
- Parallel chats own other branches; this mission edits no
  `prisma/schema.prisma`, `STRUCTURE.md` or component files.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`
- Baseline at 88d094b: tsc clean, `npm test` 1252 pass, 0 fail.

## Assembled

- **Stark + Vision** (always).
- **Captain:** two new lib modules, an undo registry change with a new
  hook, new route files; the diff will pass 300 lines.
- **Strange: out** unless a family-visible string changes (none planned).
- **Banner:** two briefs taken before contracts (habits domain; API
  patterns), recorded in Design.
- **Hill:** Q1 to Q7 above.

## Contracts

### Live-test setup (every contract that says "live")

- Worktree has no `.env`: `ln -s ../../../.env .env` from the worktree root
  (gitignored). Never open, print or edit it. Leave the link; Fury removes
  it at delivery.
- Scripts importing `server-only` modules: `node --require <stub making
  require('server-only') return {}> --import tsx --env-file=.env <script>`,
  scripts in the scratchpad only.
- Throwaway token for route tests: random token + SHA-256 hex hash via
  `node:crypto`; server `ASSISTANT_API_TOKEN_HASH=<hash>
  ASSISTANT_OWNER_USER_ID=<id> npx next dev --port 3247` in the background;
  stop it after.
- People for tests: read one `admin` and one non-admin, non-device,
  active user id from the dev database (ids only). Never print names.
- Report counts before/after of Habit, HabitParticipant, HabitLog,
  HabitTimeEntry, AssistantRequest.
- **Commit rule (parallel builders share this worktree):** never `git add`
  other paths; commit with `git commit -m "<msg>" -- <your paths>` (use
  `git add -N` for new files first). `npm run build` waits for Fury (shared
  `.next`); run tsc, eslint and the tests.

### C1 - shared tap and input rules, thin actions

- **Objective:** one `server-only` home for the check, skip, uncheck,
  unskip, hours-add and hours-remove rules, and one pure home for the habit
  form's validation, with the family's actions as thin wrappers that behave
  the same.
- **Boundaries:** May touch: new `src/lib/habits/tapWrites.ts`, new
  `src/lib/habits/tapWrites.test.ts` (pure parts only), new
  `src/lib/habits/habitInput.ts`, new `src/lib/habits/habitInput.test.ts`,
  `src/app/actions/habitChecks.ts`, `src/app/actions/habitHours.ts`,
  `src/app/actions/habits.ts`, and `src/components/HabitForm.tsx` only if
  its `HabitInput` import needs a new source (import line only). Must not touch:
  `src/lib/assistant/**` (C2 runs in parallel), `src/lib/habits/*Writes.ts`,
  `src/lib/habitsRead.ts`, components, other actions, `prisma/schema.prisma`,
  `STRUCTURE.md`.
- **Work:**
  1. `tapWrites.ts` (header like `habitWrites.ts`; imports `WriteError`,
     `invalid`, `missing` from `src/lib/writeError.ts`):
     - `tapCheck(actor, { habitId, forUserId, day?, loggedById }, today,
       client = db)` → `{ created: HabitLog[]; userIds: string[] }` |
       WriteError. Guard order as `habitChecks.ts` `guardedTap` plus the
       check-specific refusals: row and `canLogFor` → `missing(NOT_FOUND)`;
       bad or disallowed day → `invalid("That day can't be changed.")`;
       hours habit → `invalid("That habit tracks hours.")`; archived →
       `invalid("That habit is archived.")`. Status from `statusForTap(day,
       carried)`. After `checkHabit`, read the created rows (`findMany`
       by habitId, userIds, day) inside the same transaction; an
       already-checked day returns `created: []`.
     - `tapSkip(...)` same shape, `skipHabit`.
     - `tapUncheck(kind: "check" | "skip", actor, { habitId, forUserId,
       day? }, today, client = db)` → `{ removed: HabitLog[] }` |
       WriteError. `loadLogStatus` decides as `removeRow` does today; a
       mismatch or no row returns `removed: []` with nothing written. Read
       the rows before `uncheckHabit` deletes them (same transaction).
     - `logHours(actor, { habitId, forUserId, day, minutes, loggedById },
       today, client = db)` → `{ entry: HabitTimeEntry }` | WriteError:
       `habitHours.ts`'s guard order and exact messages ("That habit is
       archived.", "Pick a time from half an hour to 12 hours.", "Pick a
       day from the last week.", "That habit doesn't track hours.").
     - `removeHours(actor, entryId, today, client = db)` → `{ removed:
       HabitTimeEntry | null }` | WriteError (null when already gone, the
       action's success case). Read the full row before removing it.
     - Export the message constants (`HABIT_NOT_FOUND`, etc.) so the
       actions and later the routes reuse the same strings.
     - A `day` given as a string is parsed with `parseDateParam` by the
       caller; the module takes `CalendarDate | undefined`.
  2. `habitInput.ts` (pure, no `server-only`, no db): `HabitInput` type
     moved from `actions/habits.ts` (re-exported there for existing
     imports), `checkHabitInput(input, household: readonly string[],
     alreadyOnHabit: readonly string[] = [])` = the old `checkInput` with
     the household passed in; identical messages and result type. The
     action reads `householdParticipantIds()` and passes it.
  3. `habitChecks.ts`: each action = session, parse `day`, call
     `tapWrites`, map a `WriteError` to `{ error }`, `done()`. Remove
     `guardedTap`, `removeRow` and the duplicated constants (import them).
     `habitHours.ts` likewise. `habits.ts` imports `checkHabitInput`.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Unit tests for
  `checkHabitInput` (move or add: each refusal message once, one happy
  path per schedule, hours shape) in `habitInput.test.ts`. Live on dev (no
  server), `ZZZ Assistant Test` habits only, **parity script** in the
  scratchpad: the OLD action bodies (copied minus auth and
  `revalidatePath`, calling the writers) and the new module run side by
  side on separate test habits, for: check today, check twice (no-op),
  check a day 3 back, a day 8 back (refused), tomorrow (refused), a
  carried day on a carry-over daily habit after a 9-day gap (written
  "late"), skip, unskip, uncheck leaves a skip, a kid actor for another
  person (refused), a device actor (allowed on a non-private habit,
  refused on a private one), hours add 60 (ok), 45 (refused), remove own
  entry, remove a gone entry (success). Show the resulting `HabitLog` /
  `HabitTimeEntry` rows and the `HabitParticipant` streak columns match
  field by field (ids and timestamps aside) and that every returned row
  equals the database row. Counts before/after; all test rows deleted by
  id.
- **Evidence required:** outputs per check (a FAIL reported as FAIL),
  `wc -l` of new and changed files (`habits.ts` is 322 today), `git diff
  --stat` inside the boundary, commit hash.
- **Done criteria:** gauntlet green; parity table all MATCH; no string in
  `src/app/actions/habit*.ts` changed (diff shows moves only).
- **Status:** DONE at `9ff4c26` (8 files, +527/-215), H6 applied in the
  same commit.
- **Report:** tsc 0, `eslint .` 0, `npm test` 1265 (1252 + 6 habitInput
  + 1 checkEntryMinutes + C2's 7 in the same tree); LA leg 1265; UTC leg
  1258 + 7 self-skips. Parity script
  (`scratchpad/parity.mts`, dev only): 31 cases MATCH, 3 EXPECTED-DIFF
  from H6 (40 and 15 minutes refused with the new wording; 45 now
  accepted). Counts restored (Habit 18, HabitParticipant 27, HabitLog 16,
  HabitTimeEntry 6, AssistantRequest 4). Sizes: tapWrites 203,
  habitInput 141 (+121 test), habits.ts 322 → 191, habitChecks 119 → 100,
  habitHours 76 → 60, habitHoursVocabulary 102. Deviations: `day` is
  `CalendarDate | null | undefined` (null = unparseable, refused only
  after the access check so a private habit's existence never leaks);
  no `tapWrites.test.ts` (server-only, nothing pure to import);
  `removeHours` reads the full entry itself (`loadTimeEntryForAction`
  selects two columns and `habitsRead.ts` was off limits); guard reads
  stay outside the transaction as before; the actions' try/catch now also
  covers the guard reads. Test cleanup deleted its own habits by the
  `ZZZ Assistant Test parity` title prefix rather than by id (a first run
  crashed on a `loggedById` foreign key and left rows; the next run's
  cleanup took them). No device user on dev: device and kid cases used
  fake actors with the non-admin's real id.

### C2 - undo learns habits

- **Objective:** undo can restore, remove and re-create `Habit`,
  `HabitParticipant`, `HabitLog` and `HabitTimeEntry` rows, ignores the
  streak caches when matching, and rebuilds them in the same transaction.
- **Boundaries:** May touch: `src/lib/assistant/undoModels.ts`,
  `src/lib/assistant/undoPlan.ts`, `src/lib/assistant/undoWrites.ts`, new
  `src/lib/assistant/undoHooks.ts`, new
  `src/lib/assistant/undoPlanHabits.test.ts`. Must not touch anything else:
  `undoPlan.test.ts` (over its soft cap; new tests go in the new file),
  `src/lib/habits/**` (C1 runs in parallel), actions, routes,
  `prisma/schema.prisma`.
- **Work:**
  1. Column maps typed `Record<keyof Habit | HabitParticipant | HabitLog |
     HabitTimeEntry, ColumnKind>` (dates: `anchorWeek`, `hoursSince`,
     `archivedAt`, `createdAt`, `updatedAt`, `joinedAt`, `day`, `streakAsOf`);
     the four in `UndoModel`, `MODELS`, `TIER` (Habit 0, others 1),
     `PARENT_TABLES` (Habit), `REFERENCES.Habit` = HabitParticipant,
     HabitLog, HabitTimeEntry, HabitPlannedDay, ChoreWeekOverride, Nudge,
     PlanItem (all by `habitId`; extend `Reference.child`), FOREIGN_KEYS
     as Design says (`ForeignKey.parent` gains "Habit"). `delegate()`,
     `countReferences()`, `parentExists()` in `undoWrites.ts` gain the
     tables.
  2. `VOLATILE: Partial<Record<UndoModel, readonly string[]>>` in
     `undoModels.ts` (HabitParticipant's three streak columns).
     `sameCopy`, `findStale` and the `where` built from a copy skip
     volatile columns; a restore's `data` leaves them out; `toCopy` still
     records them (so the copy stays a full row). Document in the file
     header why.
  3. `undoHooks.ts` (`server-only`): `afterUndo(tx, steps, now)` as Design
     says, importing `recomputeStreaks` and `recomputeHabit` from
     `@/lib/habits/streakWrites` and `householdToday` from `./today`.
     Tolerates a removed habit (`recomputeStreaks` returns `{}` when the
     habit is gone) and dedupes users per habit. `undoWrites.ts` calls it
     after the steps loop, before returning, inside the transaction.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Tests in
  `undoPlanHabits.test.ts`: undoing a habit create with two participants
  removes participants before the habit; undoing a check on a Together
  habit removes every participant's log; a HabitParticipant copy that
  differs only in streak columns is not stale and restores without writing
  them; a Habit edit restores in place; `in_use` ignores logs the same plan
  removes; the hook's grouping (pure part: steps → habitId → userIds).
  Column pin: a fake key in `HABIT_COLUMNS` fails tsc (show it, then remove
  it). Live proofs happen in C3.
- **Evidence required:** test names, suite counts before/after, `wc -l` of
  touched files (`undoWrites.ts` is 271, `undoPlan.ts` about 215), `git
  diff --stat` inside the boundary, commit hash.
- **Done criteria:** gauntlet green; the fake-column tsc failure shown.
- **Status:** DONE at `fb8c60c` (5 files, +301/-7).
- **Report:** tsc 0; eslint (assistant folder only; the full `eslint .`
  runs at the gates); `npm test` 1259 (1252 + 7); LA leg 1259; UTC leg
  1252 pass + 7 self-skips, 0 fail. Fake `fakeColumn` in
  `HABIT_LOG_COLUMNS` fails tsc (TS2353), removed. Deviations: the pure
  grouping `streakWork(steps)` lives in `undoPlan.ts` (276 lines), since
  `undoHooks.ts` is `server-only` and untestable; `fromCopy` omits the
  volatile columns for re-creates too, so a re-created participant row
  takes the defaults and the hook rebuilds them. Sizes: undoModels 258,
  undoPlan 276, undoWrites 286, undoHooks 25, test 135.

### C3 - habit routes (after C1 and C2)

- **Objective:** the 12 routes in Design, every write undoable with the
  streaks right afterwards, documented in OpenAPI.
- **Boundaries:** May touch: new `src/lib/assistant/habitActor.ts` (+ test),
  new `src/lib/assistant/habitReads.ts`, new
  `src/lib/assistant/serializeHabits.ts` (+ test), new
  `src/lib/assistant/schemasHabits.ts` (+ test), new
  `src/lib/assistant/openapiHabitPaths.ts`, `src/lib/assistant/openapi.ts`
  (import + spread only), `src/lib/assistant/errors.ts` only if a new code
  is unavoidable, and the new route files: new
  `src/app/api/assistant/v1/habits/route.ts`, new
  `src/app/api/assistant/v1/habits/today/route.ts`, new
  `src/app/api/assistant/v1/habits/chart/route.ts`, new
  `src/app/api/assistant/v1/habits/[id]/route.ts`, new
  `src/app/api/assistant/v1/habits/[id]/check/route.ts`, new
  `src/app/api/assistant/v1/habits/[id]/skip/route.ts`, new
  `src/app/api/assistant/v1/habits/[id]/hours/route.ts`, new
  `src/app/api/assistant/v1/habits/[id]/hours/[entryId]/route.ts`. Must not touch: `src/lib/habits/**`,
  `src/lib/habitsRead.ts`, undo files, actions, components. If a shared
  module lacks something, stop and report BLOCKED-ON-CONTRACT.
- **Rules:** mission 44's route rules (each file exports only `export const
  <METHOD> = assistantRoute(...)`; parse, call lib, shape; reads in one
  `server-only` read module with narrow `select`s, shaped by pure
  serializers). Every write pushes one `changes` entry per row with full
  copies (`toCopy` shapes from the actual rows), models `Habit`,
  `HabitParticipant`, `HabitLog`, `HabitTimeEntry`. A no-op (already
  checked, nothing to uncheck) records nothing and answers 200 with the
  count 0. Winnie's actor from `assistantHabitActor()` in every route;
  `loggedById`/`createdById` null; `today` from `householdToday`.
  Visibility: a habit Winnie may not see answers 404 like a missing one.
  `personId` must be an active household person (`HOUSEHOLD_PERSON_WHERE`)
  else 404; a person not on the habit is `canLogFor`'s refusal (404 via
  `missing`).
- **Shapes** (fields in `serializeHabits.ts`; dates as `YYYY-MM-DD`):
  - HABIT = `{ id, title, kind, mode, icon, lifeArea, timeOfDay, schedule,
    weekdays, times, anchorWeek, carryOver, sharing, isPrivate, everyone,
    archived, track, weeklyMinutes, paceDays, participants: [{ personId,
    streak, bestStreak }] }` (streak aged with `streakAfter`/`displayStreak`
    using the participant's vacations; chores show the person's chore
    streak from `UserPreferences`, aged with `choreStreakAfter`).
  - `GET /habits` → `{ habits: [HABIT] }`, live first then archived when
    `includeArchived=true`, ordered by title then id.
  - `GET /habits/today` → `{ date, people: [{ personId, rows: [{ habitId,
    title, kind, dueState, state: "done" | "late" | "skipped" | "left",
    carriedFrom, onVacation, skippedThisWeek, hours: { doneMinutes,
    targetMinutes, leftMinutes, met } | null }], choreStreak }] }`. Rows come
    from `loadTodayPage({ userId: personId, role }, today).rows` filtered by
    `canSeeHabit(assistantActor, row)` (rows carry `isPrivate` and
    participants). One person when `personId` is given (404 if unknown).
  - `GET /habits/{id}` → `{ habit: HABIT & { hoursWeek: HoursWeek-shaped per
    participant | null, recentLogs: [{ personId, day, status }] (14 days),
    createdByAssistant } }`.
  - `GET /habits/chart?personId=` → the `ChoreChartData` fields except
    `personName`, `subtitle` and chip names: `{ personId, today, defaultWeek,
    thisWeek }` with chore ids and titles only.
  - `POST /habits` body (zod, `.strict()`): `title` required; `kind`
    ("habit" default, or "chore"), `mode`, `icon`, `lifeArea`, `timeOfDay`,
    `schedule`, `weekdays`, `times`, `anchorWeek`, `carryOver`, `sharing`,
    `track`, `weeklyHours`, `paceDays` optional; `participantIds` (array)
    or `everyone: true` required, one of the two; **`isPrivate` not
    accepted** (400 as an unknown key). Apply H3's defaults, then build a
    full `HabitInput` and run `checkHabitInput(input, household)` so the
    app's rules and words decide: `kind` "habit", `mode` "build",
    `sharing` "each", `track` "checks", `carryOver` false, nulls for icon,
    lifeArea, timeOfDay; `schedule` "daily" for a habit and "weekdays" for
    a chore; `times` 1 for weekly and monthly; `paceDays` "monsat" for
    hours; `weeklyHours` required for hours (no default; refuse with the
    app's "Pick 1 to 80 hours a week." if missing). `isPrivate` = `track
    === "hours" && participantIds.length === 1` (H3 item 4, as the app's
    form does), else false. → 201 `{ habit: HABIT }`. Changes: the Habit
    create and one HabitParticipant create per person.
  - `PATCH /habits/{id}` body: any subset of the same fields plus
    `archived?: boolean`; the current row fills the rest, then
    `checkHabitInput`. Lock the habit `FOR UPDATE`, copy Habit and
    HabitParticipant rows before and after. `archived` alone calls
    `archiveHabit`/`restoreHabit`. → `{ habit: HABIT }`.
  - `POST /habits/{id}/check` `{ personId, day? }` → `{ checked: n, status }`;
    `POST /habits/{id}/skip` → `{ skipped: n }`;
    `DELETE /habits/{id}/check?personId=&day=` → `{ removed: n }`;
    `DELETE /habits/{id}/skip?...` → `{ removed: n }`.
  - `POST /habits/{id}/hours` `{ personId, minutes, day? }` → 201 `{ entry:
    { id, habitId, personId, day, minutes }, week: hours shape }`;
    `DELETE /habits/{id}/hours/{entryId}` → `{ removed: true }`; not hers →
    403 `forbidden` "Winnie can only remove time she logged herself."
    (H4); gone → 404. Minutes are checked by `checkEntryMinutes`
    (`habitHoursVocabulary.ts`, H6) through `logHours`; the zod schema
    only requires an integer so the shared rule gives the words.
  - `PATCH /habits/{id}` body may change `isPrivate`? **No**: not accepted
    (unknown key → 400). A PATCH that changes nothing records nothing and
    answers 200 (H1).
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port 3247,
  setup above), positive control first (`GET /openapi.json` 200 and lists
  the 12 operations; `GET /habits` count equals the DB count of visible
  habits), `ZZZ Assistant Test` habits only (made through `POST /habits`
  with the admin and the non-admin as participants, plus one Together
  habit, one hours habit, one chore, and by script one private habit for
  the admin and one private habit for the non-admin): each route once; then
  undo each write and show the row and the streak: **check 3 days running
  → `GET /habits/{id}` streak 3; undo the last → streak 2 and equal to a
  fresh `recomputeHabit` run by script; redo → 3**; undo a Together check
  (every participant's log gone); undo hours add (entry gone, week total
  back); undo a PATCH (title and participants back, streak columns
  untouched by the undo itself); undo a create (habit and participants
  gone). Refusals: family taps the habit by script, then undo Winnie's
  earlier check → 409 `changed_since`; remove a family-logged entry → 403,
  nothing changed; a day 8 back → 400; tomorrow → 400; minutes 45 → 400;
  `isPrivate` in a body → 400; a private habit of the non-admin → 404 on
  GET, check, PATCH; the admin's private habit visible with
  `ASSISTANT_OWNER_USER_ID` set and 404 with it unset (restart the server
  once). Counts before/after; all test rows and AssistantRequests deleted
  by id.
- **Evidence required:** outputs per check (a FAIL reported as FAIL),
  sizes, `git diff --stat` inside the boundary, commit hash.
- **Done criteria:** gauntlet green; every live line PASS; `openapi.test.ts`
  green with the 12 rows.
- **Status:** DONE at `17aa653` (17 files, +1629/-1).
- **Report:** tsc 0, `eslint .` 0, `npm test` 1298 (1265 + 33), UTC leg
  1291 + 7 self-skips, LA leg 1298, build 0 (8 new route paths listed).
  Live on dev, port 3247, tokenless `GET /habits` → 401; `GET
  /openapi.json` lists the 12 operations; `GET /habits` 17 = DB 17. Phase
  1 (owner set) 78 PASS, phase 2 (owner unset) 4 PASS, 0 FAIL. Headline
  proofs: 3 checks → streak 3; undo → 2, equal to a fresh `recomputeHabit`
  (`{"currentStreak":2,"bestStreak":2,"streakAsOf":"2026-11-05"}` both
  ways); redo → 3. Together check fans out and undoes as a pair. Family
  re-tap then undo of hers → 409 `changed_since`. Family-logged entry →
  403 with H4's words. `isPrivate` in any body → 400. Day 8 back,
  tomorrow, archived, 40/15/750 minutes → 400; 45 → 201 (H6; the contract
  line saying 45 → 400 predates H6). Parent's private habit → 404 on every
  verb. Owner unset: admin's private habit 404 and absent. Counts
  18/27/16/6/4 before and after; cleanup by id (11 habits, 1 entry, 95
  requests). Files: habitActor 15 (+54 test), schemasHabits 216 (+196),
  serializeHabits 261 (+222), habitReads 207, openapiHabitPaths 150,
  routes 306 in 8 files. Deviations: `GET /habits/today` never emits
  `late` as a row state (a late check lives on the carried day; `late`
  shows as `status` in the check response and in `recentLogs`); the chart
  includes `state` and `tag` per chore (a skipped or moved chore would
  otherwise look normal); `GET /habits/{id}` lists this week's hours
  entries with ids so Winnie can find one to remove; write responses are
  read ungated (she just wrote the row), which matters for H3 item 4: a
  one-person hours habit she makes for someone else is private to them,
  so later reads answer 404 (create tested live; hours-add and PATCH
  ungated paths not exercised). Side effect on dev: a test chore for the
  parent moved that person's `UserPreferences.choreStreakAsOf` to
  2026-11-06 (values 0/0 unchanged; recompute re-run). Test rows' `createdAt`
  backdated by script for the streak run (deleted).

### F1 - fixes from Vision pass 1 and Captain pass 1

- **Status:** DONE at `dfe563a` (21 files, +207/-136). Report below the
  Evidence line.
- **Objective:** close Vision's V1 and V2 and Captain's B1, B2, B3 and B5
  in one pass (B4 is Fury's STRUCTURE.md amendment A10).
- **Boundaries:** May touch: `src/lib/habits/tapWrites.ts` → moved to
  new `src/lib/habitTapWrites.ts`; `src/lib/habits/habitInput.ts` and
  `src/lib/habits/habitInput.test.ts` → moved to new `src/lib/habitInput.ts`
  and new `src/lib/habitInput.test.ts`; `src/lib/assistant/habitActor.ts` (+ test),
  new `src/lib/assistant/habitActorEnv.ts`; `src/lib/assistant/undoPlan.ts`,
  `undoHooks.ts`, `undoPlanHabits.test.ts`; `src/lib/assistant/habitReads.ts`,
  `schemasHabits.ts` (+ test); `src/app/actions/habitChecks.ts`,
  `habitHours.ts`, `habits.ts`; the 8 route files under
  `src/app/api/assistant/v1/habits/`; `src/components/HabitForm.tsx` (one
  import line only, if the type's source moves). Must not touch:
  `src/lib/habits/*Writes.ts`, `habitsRead.ts`, `undoModels.ts`,
  `undoWrites.ts`, `STRUCTURE.md`, `prisma/schema.prisma`.
- **Work:**
  1. **B1, B2 (placement):** `git mv` the two modules (and the test) to
     the top of `src/lib/`; fix their relative imports (`./habits/...`)
     and every importer (actions, routes, `schemasHabits.ts`, the comment
     in `habitActor.ts`). `HabitForm.tsx:20` may import `HabitInput` from
     `@/lib/habitInput` directly.
  2. **B3 (guard callback):** the tap functions take `guard: (habit:
     HabitForAction) => boolean` instead of `actor`, run it right after
     `loadHabitForAction` and before the day check (a refused habit and a
     missing one still answer `HABIT_NOT_FOUND`, a bad day still leaks
     nothing). `removeHours` takes `guard: (entry, habit) =>
     Promise<WriteError | null>` and runs it inside its transaction; the
     `[entryId]` route folds its `canLogFor` and `didAssistantCreate`
     checks into that guard (404 before 403 kept). Actions pass
     `(h) => canLogFor({ userId, role }, forUserId, h)`; routes the same
     with Winnie's actor.
  3. **B5 (env read):** `habitActor.ts` becomes pure:
     `habitActorFor(ownerId: string | undefined): HabitActor` (test it
     without `process.env`); the env read moves to a new `server-only`
     `habitActorEnv.ts` exporting `assistantHabitActor()`, imported by
     `habitReads.ts` and the routes.
  4. **V1 (chore streak after undo):** `streakWork` also returns
     `choreUsers` (every userId named by a HabitParticipant, HabitLog or
     HabitTimeEntry step, habit existing or not); `afterUndo` adds the
     current participants of every restored or re-created habit, then
     calls `recomputeChoreStreaks(choreUsers, today, tx)` once,
     unconditionally (idempotent). Tests for both groupings (undo of a
     chore create; undo of a habit-to-chore PATCH).
  5. **V2 (edit the result you can still see):** in the PATCH transaction,
     after `checkHabitInput`, refuse with
     `invalid(INCLUDE_YOURSELF)` when `!canEditHabit(actor, { isPrivate:
     checked.fields.isPrivate ?? false, participantIds })` (rolls back,
     nothing recorded). Export `INCLUDE_YOURSELF = "Include yourself, or
     ask a parent."` from `habitInput.ts`; `actions/habits.ts` imports it.
     Apply the same check on `POST /habits`. **Create default (pending
     Hill H8; Fury's call until she answers):** a one-person hours habit
     is private only when that person is the owner
     (`assistantHabitActor().userId`); for anyone else it is created not
     private, so the create is never refused on that count and Winnie can
     still see what she made.
- **Verification:** tsc, eslint, `npm test` (1298 plus the new tests),
  both TZ legs, build. Live on dev (setup above, reuse C3's `live.mts` and
  Vision's `vchore.mts`, `vmove.mts`): undo of a chore create → the
  person's `UserPreferences` chore streak equals a fresh
  `recomputeChoreStreak`; undo of a habit-to-chore PATCH, same; `PATCH`
  moving the owner's private habit to another person → 400 with
  `INCLUDE_YOURSELF`, nothing changed; `POST` of a one-person hours habit
  for the owner → private; for another person → not private, 201, then
  `GET` 200. Re-run C3's full live table (82 lines) after the move so
  nothing regressed. Counts restored; ZZZ rows by id.
- **Evidence required:** gauntlet tails, live lines PASS/FAIL, `git diff
  --stat` inside the boundary, `wc -l` of moved files, commit hash.
- **Report:** tsc 0, `eslint .` 0, `npm test` 1301 (1298 + 3 streakWork
  tests), UTC 1294 + 7 skips, LA 1301, build 0 (8 routes). Live: undo of a
  chore create → chore streak 0/0 → 1/1 = fresh recompute (was stuck at 0
  before); undo of a habit-to-chore PATCH, same; both for the non-admin
  (0/0 = 0/0); PATCH moving the owner's private habit → 400
  "Include yourself, or ask a parent.", row unchanged; one-person hours
  habit for the owner → private; for the other person → not private and
  `GET` 200 (H8); C3's full table re-run 78 + 4 PASS, 0 FAIL. Counts
  18/27/16/6/4 restored. Sizes: habitTapWrites 211, habitInput 144,
  habitActor 16, habitActorEnv 10, undoPlan 283, undoHooks 32, habitReads
  202, schemasHabits 219. Deviations: the `[entryId]` guard throws
  `ApiError(403)` (WriteError has no `forbidden` code and `writeError.ts`
  was off limits); C1's `parity.mts` still points at the old path and was
  not re-run (the live table and unit tests cover the module); the dev
  server was stopped by pid after a broad `pkill` was refused.

### C4 - records (after the gates)

- CLAUDE.md edits in Design, this file's Delivery, Captain's amendments if
  any. Fury writes these.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|
| 1 | Vision | BLOCKED | V1 chore streak not rebuilt after undo of a chore create or a habit-to-chore PATCH (proven in a rolled-back tx); V2 PATCH can move the owner's private habit to another person (app refuses) | H3 item 4 conflicts with the app's create rule (to Hill as H8); PATCH off "weekdays" drops this week's chore overrides and undo can't restore them (tell Winnie); boundary: `habitHoursVocabulary.ts` under H6 |
| 1 | Captain | BLOCKED | B1 `tapWrites.ts` and B2 `habitInput.ts` inside `src/lib/habits/` import files the engine may not (move up); B3 tap module gates on an actor (guard callback); B4 undo writes habit tables (A10 exception); B5 `habitActor.ts` reads env without `server-only` | A11 to A14 drafted; NOTEs: route holds raw `FOR UPDATE` (A14, next touch); `actions/habits.ts:39` duplicate NOT_FOUND; minutes wording away from its rule; OpenAPI literals; one-person-hours-private rule in two places; `habitReads` own `db.user` query; `streakWork` in the generic planner; undoModels growth; CLAUDE.md 413 lines; PENDING/DONE double status lines; Design says `streakWork` in undoHooks |

### Vision pass 1 (at `4e36d89`): BLOCKED

Gauntlet re-run green (1298; UTC 1291 + 7 skips; LA 1298; build; recordcheck
0 hard, 9 harmless REVIEW). Boundaries clean. 21 live probes PASS (401,
12 operations, 17 = 17, undo check 1 → 0 equals recompute, participant
restore equals recompute, no-ops record nothing, 400s, 404s, 5 people).
Privacy on script-made private rows: every verb 404, absent from every
list, nothing written. Blockers V1 and V2 above with scripts `vchore.mts`,
`vmove.mts`. Parity of the actions confirmed against 88d094b (two
disclosed harmless differences).

### Captain pass 1 (at `4e36d89`): BLOCKED

No cycles, `@/app` grep empty, route gate holds, tests in covered globs,
no file over 300 (largest undoWrites 286/229). Blockers B1 to B5 above.
Amendment texts: A10 is in STRUCTURE.md; A11 to A14 are below under
"Captain pass 2" (A10 pasted into
STRUCTURE.md by Fury; A11 to A14 for Bryce with mission 44's A1 to A4 and
45's A5 to A9).

## Handoff log

- 2026-11-06 - Branch cut from 88d094b; mission 47 free everywhere (45
  merged, 46 taken). Two Banner briefs taken. Plan approved by Bryce
  (plan mode, on Fable). Hill Q1 to Q7 dispatched. `npm ci` done; baseline
  tsc clean. Next: preflight C1 and C2, dispatch both Starks in parallel.
- 2026-11-06 - Hill H1 to H7 recorded. C2 done `fb8c60c`, C1 done
  `9ff4c26` (H6 folded in). C3 done `17aa653`. CLAUDE.md fixes `c0d2010`
  (the cookbook H1/H4 review line removed: Bryce said on 2026-11-06 he is
  fine with them; recorded here since no mission file held it). Gates pass
  1 at `4e36d89`: Vision BLOCKED (V1, V2), Captain BLOCKED (B1 to B5).
  A10 pasted into STRUCTURE.md (`9286f7f`). Hill H8 decided. F1 done
  `dfe563a`. Next: gate pass 2, both in parallel.

### Vision pass 2 (at `b386408`): PASS

Gauntlet re-run green (1301; UTC 1294 + 7 skips; LA 1301; build;
recordcheck 0 hard). F1 boundary clean. 16 of 16 live lines through the
real routes and `/audit/{id}/undo`: V1 closed (chore-create undo and
habit-to-chore PATCH undo both leave the chore streak equal to a fresh
recompute, for both people; Together chore; plain habit create undone);
V2 closed (private-habit move → 400, row byte-identical, 0 changes;
positive controls 200); H8 both ways; `removeHours` 404 before 403.
NOTEs: `HabitGuard` takes the person twice (closure plus `forUserId`),
harden to `(habit, forUserId)` at the next touch; Winnie can never add a
second person to the owner's private habit (the app's rule; tell her);
stale Design lines (fixed in C4); stale comment in
`habits/[id]/hours/route.ts:24` (fixed in C4); cleanup moved the
non-admin's `choreStreakAsOf` date only.

### Captain pass 2 (at `b386408`): PASS

B1 to B5 closed against the written rules; 0 cycles; `@/app` grep empty;
12 route exports; globs covered; no file over 300 (undoWrites 286,
undoPlan 283, serializeHabits 261, undoModels 258). Open NOTEs
(leftovers): `loadTimeEntryForAction` now has no callers (delete at the
next touch of `habitsRead.ts`; STRUCTURE.md:418 mentions it); the raw
`FOR UPDATE` and a redundant `findUniqueOrThrow` in
`habits/[id]/route.ts:48-54` (A14 grandfathers it; next touch moves the
lock into `habitWrites.ts` and uses `before.habit`); `actions/habits.ts:39`
duplicate `NOT_FOUND`; OpenAPI minutes literals; `habitReads.ts:70,180`
own `db.user` queries; `streakWork` in the generic planner; `undoModels`
growth; the result-edit check in four callers (a helper at the fifth);
CLAUDE.md 413 lines.

#### Amendments A11 to A14 (Captain's final texts, for Bryce to approve with mission 44's A1 to A4 and mission 45's A5 to A9; not yet in STRUCTURE.md)

**A11.** Add to Boundary rules after the Domain write modules paragraph.
In the habit engine paragraph, replace "(an action that needs one entry
uses `loadTimeEntryForAction`)" with "(the tap module's in-transaction
copies, rule below, are the one exception)".

> - **Habit taps and habit input (mission-47).** `src/lib/habitTapWrites.ts`
>   (`server-only`, no auth, no `revalidatePath`) is the only home of the tap
>   rules: check, skip, uncheck, unskip, add hours and remove hours, with the
>   guard order (the habit's row, the caller's guard, then the day), the day
>   window, the archived and track refusals and `statusForTap`. Its callers
>   are `actions/habitChecks.ts`, `actions/habitHours.ts` and the
>   `/api/assistant/v1/habits/` tap routes. Each caller passes its access
>   test as a callback (`HabitGuard`; for `removeHours`, a guard on the
>   entry and its habit that returns a `WriteError` or `null` and may
>   throw), never an actor, session or role, and the module imports nothing
>   from `habits/access.ts`. It writes only through `habits/habitWrites.ts`
>   and reads through `habitsRead.ts`, except the whole-row copies it reads
>   inside its own transaction (the day's `HabitLog` rows, the
>   `HabitTimeEntry` being removed) to hand back to the caller. Refusals
>   are `WriteError`s, and the tap messages are its exported constants: an
>   action re-declaring one is a second definition. A refusal with no
>   family counterpart (Winnie removing time the family logged) is thrown
>   by the route's guard as `ApiError(403, "forbidden")`. If a second write
>   module needs a 403, add a `forbidden` code to `writeError.ts` and map
>   it in `toWriteFailure` instead of throwing again.
>   `src/lib/habitInput.ts` (pure) is the only check of the habit editor's
>   form (`checkHabitInput`, the `HabitInput` type, `INCLUDE_YOURSELF`),
>   used by `actions/habits.ts` and the habit create and edit routes. The
>   household list is passed in. Both files sit at the top of `src/lib/`
>   because they import outside the engine's list, and nothing in
>   `src/lib/habits/` imports either. Each caller still runs its own
>   `canEditHabit` check on the result and answers `INCLUDE_YOURSELF`.

**A12.** Add after A11.

> - **Winnie's habit identity and reads (mission-47).**
>   `src/lib/assistant/habitActor.ts` (pure) builds the one `HabitActor`
>   the Assistant API uses for habits: `habitActorFor(ownerId)` is
>   `{ userId: ownerId ?? "", role: "admin" }`.
>   `src/lib/assistant/habitActorEnv.ts` (`server-only`) is the only reader
>   of `ASSISTANT_OWNER_USER_ID`, through `assistantHabitActor()`. Routes
>   and `assistant/habitReads.ts` take the actor from there and hand it to
>   `habits/access.ts` unchanged; no route states its own visibility rule.
>   `src/lib/assistant/habitReads.ts` (`server-only`) is the Assistant
>   API's reader of the habit tables (lists, detail, chore chart, and
>   `habitSnapshot` for audit copies). Only `/api/assistant/v1/habits/`
>   routes import it; pages and actions never do. `assistant/serializeHabits.ts`
>   (pure) is the only shape of habit JSON for Winnie, and
>   `newHabitInput` in `assistant/schemasHabits.ts` is the only home of
>   her create default (Hill's H8: a one-person hours habit is private only
>   when that person is the owner). `isPrivate` is in no request body.

**A13.** Append to the A10 sentence in the habit engine paragraph.

> `VOLATILE` in `assistant/undoModels.ts` is the only list of cache columns
> undo neither compares nor writes. `afterUndo` in `assistant/undoHooks.ts`
> (`server-only`) is the only work undo does after its steps, in the same
> transaction. It rebuilds the streaks the steps touched through
> `streakWrites.ts`, and the chore streak of every person the steps name
> plus the current participants of restored habits through
> `choreWrites.ts`. A new cache column joins `VOLATILE` and its rebuild
> joins `afterUndo`; no other undo file calls a habit writer. The pure
> grouping `streakWork` lives in `assistant/undoPlan.ts` for now, and moves
> to its own pure file next to `undoHooks.ts` when `undoPlan.ts` next
> grows. `assistant` may import `habits`; `habits` never imports
> `assistant`.

**A14.** Add to Boundary rules after A12.

> - **Audit copies inside a route's transaction (mission-47).** A route
>   that records before and after copies reads them in one
>   `db.$transaction` with the writer, after the parent row is locked with
>   `SELECT ... FOR UPDATE`, and rolls back when nothing changed so nothing
>   is recorded. The lock lives in the domain write module
>   (`recipeWrites.ts`, `cookbookWrites.ts`, `mealPlanWrites.ts` and
>   `groceryWrites.ts` are the instances). The habit edit route
>   (`/api/assistant/v1/habits/[id]/route.ts`) is grandfathered: it holds a
>   raw `FOR UPDATE` and its own `tx.habit` read because `habitWrites.ts`
>   was off limits. At its next touch both move into a helper in
>   `habits/habitWrites.ts` (for example `lockHabit(tx, id)`), and the
>   route uses `habitSnapshot`'s `before.habit` instead of reading again.
>   Any other route holding a raw lock is a BLOCKER.

## Delivery

- **Verdicts:** Vision PASS (pass 2 of 3), Captain PASS (pass 2 of 3).
  Strange not assembled: the only family-visible string change is H6's
  minutes sentence, which the app's half-hour stepper can never trigger.
  Hill decided H1 to H8.
- **Shipped for Winnie:** 12 habit routes (Design, Routes), every write
  with copies and undoable, the streak caches (habit and chore) rebuilt
  inside the undo transaction, proven live through the real routes by
  the builder (82 lines) and by Vision (21 + 16 lines).
- **For the family's app:** behaviour identical, proven by parity script
  (31 MATCH) and Vision's comparison against 88d094b. Three disclosed
  differences: a time entry of 45, 75, 105 ... minutes is now accepted
  by the server (the sheet still steps by 30, so nothing visible); a
  database failure in a guard read now answers "Couldn't ... Try again."
  instead of an error page; removing an already-gone time entry now
  refreshes the page.
- **No schema change. No migration.**
- **Records:** STRUCTURE.md gained A10 (a small edit to a shared file).
  CLAUDE.md: mission 44 and 45 "next for Winnie" lines, the cookbook H1/H4
  review line removed, the mission 47 bullet, Bryce's checklist row.
- **Shipped check:** filled at delivery (below the Handoff log).
- **Deliberate leftovers (next touch):** Vision's and Captain's NOTEs
  above; the chore week overrides a PATCH off "weekdays" drops cannot be
  restored by undo (`ChoreWeekOverride` is not an undo model; one week,
  same as the app's Edit); C1's `parity.mts` points at the old module
  path; CLAUDE.md at 413 lines against its ~250 rule (fold merged "passed
  its gates" bullets into What's built); mission 44's A1 to A4 and 45's A5
  to A9 still wait with A11 to A14.
- **For Bryce (review first):** the privacy preset (`ASSISTANT_OWNER_USER_ID`,
  his step in CLAUDE.md), H8 with H3 item 4, H3 items 1 to 3, H6, then
  A11 to A14.

### What to tell Winnie (plain English, for Bryce to paste or adapt)

> New in Marshee: you can see and work the family's habits and chores.
> Re-read `/api/assistant/v1/openapi.json` for the exact shapes. People
> are always `personId`s from `GET /family`.
>
> - **Today:** `GET /habits/today` gives every person's day (what is
>   due, done, skipped or left, plus hours progress and the chore
>   streak). Add `?personId=` for one person.
> - **The list:** `GET /habits` lists the habits and chores you may see,
>   with who is on each and their streaks; `?personId=` for one person,
>   `?includeArchived=true` to include archived ones. `GET /habits/{id}`
>   shows one in detail: streaks, this week's hours with each entry's id,
>   the last 14 days of checks, and `createdByAssistant`.
> - **The chore chart:** `GET /habits/chart?personId=` is that person's
>   week.
> - **Check and skip:** `POST /habits/{id}/check` and `POST
>   /habits/{id}/skip` with `{ "personId": "...", "day": "YYYY-MM-DD" }`
>   (`day` optional, default today; today or up to 7 days back, never the
>   future). A Together habit checks everyone on it at once. Undo a check
>   with `DELETE /habits/{id}/check?personId=&day=`, a skip with `DELETE
>   /habits/{id}/skip?...`. Checking an already-checked day changes
>   nothing.
> - **Hours:** `POST /habits/{id}/hours` with `{ "personId", "minutes",
>   "day"? }`; minutes are 30 to 720 in steps of 15. `DELETE
>   /habits/{id}/hours/{entryId}` removes an entry, but only one you
>   logged yourself (403 otherwise): ask Bryce to remove the family's.
> - **Add and edit:** `POST /habits` with at least `title` and either
>   `participantIds` or `"everyone": true`; `kind` is "habit" or "chore";
>   a chore needs `weekdays` (7 characters of 0/1, Sunday first); an hours
>   habit needs `"track": "hours"` and `weeklyHours`. `PATCH /habits/{id}`
>   changes any of those, or `"archived": true/false`. Never send
>   `isPrivate`: you get 400. You cannot delete a habit; archive it
>   instead.
> - **Private habits:** you see Bryce's private habits and nobody else's.
>   A habit for one person other than Bryce is never private when you
>   make it (they can make it private in the app). You cannot add a
>   second person to Bryce's private habit; he turns Private off first.
>   If a habit answers 404, it may be private: ask, don't guess.
> - **Undo:** every change above can be undone for 30 days with `POST
>   /audit/{requestId}/undo`; streaks are recomputed with it. Undo refuses
>   if a family member changed the same row since; tell Bryce instead of
>   forcing it. One gap: if you change a chore's schedule off "weekdays",
>   this week's moves and skips on it are dropped and undo cannot bring
>   them back.

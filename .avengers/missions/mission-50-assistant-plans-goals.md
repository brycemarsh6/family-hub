# Mission 50: Winnie's plans and goals (Assistant API)

**Project:** family-hub (Marshee)
**Status:** PLANNED (contracts written, Hill H1 to H9 decided; build waits
for Bryce to switch Fury back to Opus)
**Started:** 2026-11-07 · **Updated:** 2026-11-07
**Branch:** `claude/plans-goals-assistant-mission-1a9a26` from `origin/main`
`d0397e2` (holds `fc9772b`, mission 47's records). Worktree
`marshee-send-feedback-d53a21`. Number 49 is taken by
`claude/dashboard-w2-calendar-widget-40bbe6`.

## Brief

- **Goal:** Winnie can read and act on Plans & Goals: the goals list (life
  area, target date or Ongoing, Mine or Together, progress, check-in
  history), one goal with its plan items, the This week view and the Vision
  board; add and edit goals, add check-ins to a goal's number, add and edit
  plan items under a goal, add and edit Vision statements. Never delete a
  goal, a Vision statement or a plan item.
- **Done means:** the routes in Design answer in production behind the token
  (each new path answers 401 to a tokenless `curl`, read-only check); every
  write records before/after copies and `POST /audit/{requestId}/undo`
  reverses it **with the goal's number cache (`currentValue`,
  `checkedInAt`) rebuilt inside the undo** (proven live on dev: two
  check-ins 80 then 78, undo the second, `currentValue` is 80 and equals a
  fresh `numberAfterCheckIns`; redo gives 78); undoing a plan item that
  made a habit removes the habit too; the family's Server Actions behave
  identically (parity script on dev); Vision and Captain PASS; gauntlet
  green in both time zones; CLAUDE.md record fixes in the same PR.
- **Out of scope** (leftovers, not built): deleting a goal, plan item or
  vision statement; changing a goal's `visibility` through the API;
  reordering plan items; a goals line in `GET /summary`; `PlanLog` (no code
  reads or writes it since mission 30); vision photos; calendar and tasks
  (next, after CD1); replacing the app's Claude features with Winnie.

## Standing rulings (Bryce, don't re-litigate)

- Mission 40: whole app except passwords, family members and roles. One
  token, no per-person permissions. Every write undoable 30 days. She
  deletes only what she created (`didAssistantCreate`).
- **Goals, vision statements, plan items: add and edit, never delete**
  (Bryce, 2026-11-07, this mission). Habits: never delete (mission 40).
- Removing her own check-ins is fine if Hill agrees (Q1).
- **Privacy default, set by Bryce for this mission and listed for his
  review:** Winnie is Bryce (`ASSISTANT_OWNER_USER_ID`) for private goals,
  and sees other people's goals only when they are not private. The existing
  rules (`canSee`, `canEdit`, `canLog` in `src/lib/goals.ts`;
  `canEditVision` in `src/lib/visions.ts`) stay the one source of truth.
  Hill may not decide who sees private data.
- Habit plan items are logged through mission 47's `/habits/{id}/...`
  routes; nothing here duplicates them.

## Fury's privacy preset (for Bryce to review; follows from the rulings)

What the existing rules give Winnie, acting as Bryce through a viewer
`{ userId: ownerId, isDevice: false }`:

1. **Sees:** every non-private goal, plus Bryce's private goals. Emily's
   private goals answer 404, same as a missing goal.
2. **Edits** (goal fields, check-ins, plan items, steps done): Bryce's goals
   and Together goals only. Emily's non-private Mine goals are read-only to
   Winnie (`canEdit` compares the owner), so "add a check-in to Emily's
   weight goal" is refused with the app's words ("You can't change that
   goal."). Bryce may want this widened later; that is a rule change in
   `goals.ts`, not a route option.
3. **"Mine" means Bryce.** A Mine goal Winnie makes is Bryce's. With
   `ASSISTANT_OWNER_USER_ID` unset she can still read non-private goals
   and work Together goals, but making a Mine goal or writing a Mine vision
   board is refused (400), never stored with an empty owner.
4. **Vision:** reads every board (no private option exists); writes the
   Together board and Bryce's board only (`canEditVision`).
5. **`visibility` is in no request body** (mission 47's `isPrivate`
   precedent): a goal she makes is shared; Bryce flips Private in the app.
   A plan habit she adds under Bryce's private goal is private, as the app
   makes it (`habitInputFromPlan`).

## Decided by Hill (2026-11-07; Bryce can overturn any)

Hill read hill.md, missions 47, 40 and 38, the goals plan, the three
actions, `goals.ts`, `visions.ts`, the readers and the goal components.
Nothing asked was BRYCE ONLY.

- **H1 remove her own check-in (high):** yes, `DELETE` when
  `didAssistantCreate("GoalCheckIn")`; a family check-in answers 403
  `forbidden`, exactly "Winnie can only remove check-ins she added
  herself." The remove points `currentValue` / `checkedInAt` back at the
  newest check-in left (or the start value) in the same transaction, as
  the app's `deleteCheckIn` does, with Goal copies before and after.
- **H2 removing a goal's number (high):** refuse with 400 when the goal has
  any check-in (hers or the family's), exactly "This goal has check-ins, so
  its number can't be removed here. Ask Bryce to do it in Marshee."; allowed
  when it has none.
- **H3 create defaults (high; Bryce to glance at the shared line):**
  `title`, `area` and `ownership` ("mine" = Bryce, or "together") required;
  `targetDate` or `ongoing: true`, and with neither the date is
  `targetDateChips(today)[0].date` (the form's "End of this year");
  `why`, `measureUnit`, `startValue`, `targetValue` optional under
  `validateGoalInput`'s words; `visibility` in no body. **Trap:**
  `toGoalVisibility(undefined)` fails closed to "private", so the route
  sets `visibility: "shared"` itself before validation (the app's recorded
  default, "Goals are shared by default"). Ownership is required, not
  defaulted, because it can never change by editing.
- **H4 habit item to step or reminder (high):** refuse with 400, exactly "A
  habit can't be changed to a step or reminder here. Ask Bryce to do it in
  Marshee." Step ↔ reminder and step or reminder → habit stay allowed.
- **H5 clearing a vision (high):** empty or whitespace-only text answers
  400, exactly "Write something for this vision. Winnie can't clear one."
  Length keeps the app's "Keep it under 500 characters."
- **H6 `GET /vision` (high):** `board` ("together" or a personId) and
  `horizon` (5, 10, 15) both optional; no horizon gives all three; no board
  gives every board, Together first, then each active person in household
  order (`User.familyOrder`).
- **H7 `GET /goals/week` (high):** default is the app's Everyone chip
  (every goal she can see, tagged `ownership` and `ownerId`, the app's
  order as `ThisWeekList.tsx:82-94`), plus `weekSummary`'s done of total,
  the next steps, and the recap on Sundays (Denver, `isRecapDay`);
  `personId` narrows to that person's goals plus Together
  (`countsInScope`).
- **H8 completing (high):** `PATCH /goals/{id}` takes `completed`;
  `PATCH /plan-items/{id}` takes `done` for a step only, else 400 with the
  app's words "Only a step can be checked off."; habit items are logged
  through mission 47's `/habits/{habitId}/check`, every plan item carries
  `habitId`; no separate log route. A legacy habit item with `habitId`
  null can't be checked until re-saved (tell Winnie).
- **H9 order (high):** new items go last (`sortOrder` max + 1); no reorder
  route.

**For Bryce to look at first:** the privacy preset above, and H3's
`visibility: "shared"` default for goals Winnie makes.

## Design (Fury's structural calls)

### Winnie's goal viewer

- `src/lib/assistant/habitActor.ts` gains pure `goalViewerFor(ownerId)`
  → `{ userId: ownerId ?? "", isDevice: false }` (the `Viewer` type from
  `goals.ts`). `habitActorEnv.ts` stays the one reader of
  `ASSISTANT_OWNER_USER_ID` and gains `assistantGoalViewer()` and
  `assistantOwnerId(): string | null` (null when unset or empty).
- The viewer goes unchanged into `canSee` / `canEdit` / `canLog` /
  `canEditVision` and the page readers. No route states its own rule.
- `createdById` / `updatedById` are `null` on her writes (shopping and
  habits precedent); ownership is the audit log.

### Routes (`src/app/api/assistant/v1/...`)

| Method and path | Does | Backed by |
|---|---|---|
| `GET /goals?status=active\|done\|all&personId=` | goals she can see: area, targetDate or ongoing, ownership, ownerId, private, why, number (unit, start, target, current, progress, pace), completed, plan item count, latest check-in | `loadPlansPage` (+ `goalsInScope` for `personId`) |
| `GET /goals/{id}` | one goal with plan items (kind, habitId, this week's count, step done), every check-in newest first (id, value, at, createdByAssistant), the vision line | `loadGoal`, `loadGoalVision` |
| `GET /goals/week?personId=` | the This week view: each goal's plan items with counts, week summary, next steps, Sunday recap | `loadPlansPage`, `weekSummary`, `weekTodo`, `loadWeekRecap` |
| `GET /vision?board=&horizon=` | Vision boards (Q6) with text and goal counts per area | `loadVisionBoard`, `loadBoards` |
| `POST /goals` | add a goal (Q3) | `goalWrites.createGoal` |
| `PATCH /goals/{id}` | edit fields; `completed: true/false` (Q8); removing the number per Q2 | `goalWrites.updateGoal`, `setGoalCompleted` |
| `POST /goals/{id}/check-ins` `{ value }` | add a check-in | `goalWrites.addCheckIn` |
| `DELETE /goals/{id}/check-ins/{checkInId}` | remove one she added (Q1; 403 otherwise) | `goalWrites.removeCheckIn` |
| `POST /goals/{id}/plan-items` | add a habit, step or reminder (a habit makes its Habit) | `planItemWrites.createPlanItem` |
| `PATCH /plan-items/{id}` | edit; `done: true/false` on a step (Q8); habit to step/reminder refused (Q4) | `planItemWrites.updatePlanItem`, `setStepDone` |
| `PUT /vision/{board}/{area}/{horizon}` `{ text }` | write one statement; empty refused (Q5) | `visionWrites.saveVision` |

(Q-dependent rows follow Hill's H1 to H9.) A goal Winnie may not
see answers 404 like a missing one. A goal she may see but not edit answers
404 with the app's `NOT_ALLOWED` words ("You can't change that goal."),
exactly as the app's `loadEditable` treats hidden and forbidden alike.
`personId` must be an active household person (`requireHouseholdPerson`).
`board` is "together" or such a person's id.

### Shared write modules (actions and routes behave identically)

Three new `server-only` modules at the top of `src/lib/` (beside
`habitTapWrites.ts`, since they call `habits/habitWrites.ts` and read
through `goalsRead`-level code), no auth, no `revalidatePath`, refusals as
`WriteError` with the actions' exact strings exported as constants:

- **`src/lib/goalWrites.ts`:** `createGoal(fields, client)`,
  `updateGoal(guard, id, raw, today, client)`, `setGoalCompleted(guard, id,
  done, client)`, `addCheckIn(guard, id, value, createdById, client)`,
  `removeCheckIn(guard, checkInId, client)`. The guard is
  `GoalGuard = (goal: GoalPolicyRow) => boolean`, run right after the row
  is read and before anything else (hidden and forbidden stay one answer).
  `removeCheckIn` takes `(checkIn, goal) => WriteError | null` like
  `removeHours`, run inside its transaction. Each returns the rows it
  wrote, read inside the same transaction: `{ before, after }` for the
  goal, created or removed `GoalCheckIn` rows (including every check-in a
  number removal deletes).
- **`src/lib/planItemWrites.ts`:** `createPlanItem(guard, goalId, raw,
  createdById, client)` (the habit made with it comes back as Habit and
  HabitParticipant rows), `updatePlanItem(guard, id, raw, today, client)`
  (returns before/after of the item and any Habit/participants created,
  updated or removed), `setStepDone(guard, id, done, client)`. Guard
  `(goal: GoalPolicyRow) => boolean`, the caller deciding edit or log.
  The app's habit-tap actions in `planItems.ts` (`logHabit`,
  `undoHabitLog`) are not part of this mission and stay as they are.
- **`src/lib/visionWrites.ts`:** `saveVision(guard, input, updatedById,
  client)` returning `{ before, after }` (after null when empty text
  deleted the row, the app's path; Winnie's route refuses empty text before
  calling, per Q5). Guard `(ownerId: string | null) => boolean`.
- The actions (`goals.ts`, `planItems.ts`, `visions.ts`) become thin: session,
  device refusal, call the module with `(g) => allowed(...)` built from
  `canSee`/`canEdit`/`canLog`, map `WriteError` to `{ error }`,
  `revalidatePath`. No family-visible string changes. `planItems.ts` is
  315 lines today and should end well under 300.

### Undo learns goals

- `undoModels.ts`: `Goal` and `VisionStatement` (tier 0; Goal a parent),
  `GoalCheckIn` and `PlanItem` (tier 1). `REFERENCES.Goal` = GoalCheckIn,
  PlanItem (covered), PlanLog (always in use, like `VoiceChange`);
  `REFERENCES.PlanItem` = PlanLog (always in use). `REFERENCES.Habit`'s
  PlanItem entry becomes a covered reference: a plan that removes or
  restores the PlanItem away from the habit in the same undo does not
  count it. FOREIGN_KEYS: `goalId` refuse; `habitId` on PlanItem refuse
  (re-creating an item whose habit is gone is refused, not unlinked);
  `ownerId` on Goal and VisionStatement refuse (a deleted person is not
  silently turned into Together); `createdById`, `updatedById` null.
- **Volatile:** `Goal → currentValue, checkedInAt` join `VOLATILE`.
- **After-undo rebuild** (`undoHooks.ts`): for every goal named by a Goal
  or GoalCheckIn step that still exists, set `currentValue` and
  `checkedInAt` from its remaining check-ins with `numberAfterCheckIns`
  (`goalsProgress.ts`), the rule the app's `deleteCheckIn` already uses,
  through one new writer in `goalWrites.ts` (`rebuildGoalNumber(tx,
  goalId)`) that the app's `removeCheckIn` path uses too. Pure grouping
  `goalWork(steps)` goes in a new pure `src/lib/assistant/undoWork.ts`,
  and mission 47's `streakWork` moves there with it (Captain's A13 said it
  moves when `undoPlan.ts` next grows; it is at 283).
- `undoWrites.ts` is 286 lines: if the new tables would push it past 300,
  `delegate()`, `countReferences()` and `parentExists()` move to a new
  `server-only` `src/lib/assistant/undoTables.ts`.

### Records

- This file; CLAUDE.md Current status (add the mission 50 bullet; mission
  47 bullet's "Next for Winnie" line → calendar/tasks after CD1, then
  replacing the app's Claude features); OpenAPI rows; "What to tell
  Winnie" below in Delivery.

## Danger register

- AGENTS.md in full. Dev branch only; `npm run db:seed` / `db:reset`
  forbidden; never write the `User` table (reads of id and role are fine,
  **print ids and counts only, never names**); agents never open, print or
  edit `.env`.
- Winnie's real token never appears anywhere. Live tests use a throwaway
  hash in the dev server's process env only. **Never write to
  production**; the production check is `curl` without a token → 401.
- Test rows are `ZZZ Assistant Test …` goals (and their check-ins, plan
  items, habits). Vision rows are keyed by board, area and horizon and are
  unique, so **vision tests write only an empty slot**
  (a `boardKey`/area/horizon with no row on dev, found by script first)
  and delete that row by id afterwards; if none is empty, report it and
  skip. Never edit, check in on, or complete a family goal in a test.
- Parallel chats own other branches; this mission edits no
  `prisma/schema.prisma`, `STRUCTURE.md` (Captain drafts amendments here)
  or component files.
- Stage by explicit path; `git show --stat HEAD` after each commit.

## Gauntlet

- `npx tsc --noEmit` · `npx eslint .` · `npm test` · `npm run build`
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts src/lib/habits/*.test.ts` (and `TZ=America/Los_Angeles`)
- `node ~/.claude/skills/avengers/recordcheck.mjs`
- Baseline at `d0397e2`: tsc clean.

## Assembled

- **Stark + Vision** (always).
- **Captain:** three new lib modules, undo registry changes, new routes;
  the diff will pass 300 lines.
- **Strange: out** unless a family-visible string changes (none planned).
- **Banner:** one brief taken (models, actions, access, reads, undo,
  OpenAPI), recorded in Design.
- **Hill:** Q1 to Q9. Dispatched as a general-purpose agent on Fable
  reading `.claude/agents/hill.md`, because this session's agent list did
  not load the project's `hill` type.

## Contracts

### Live-test setup (every contract that says "live")

- Worktree has no `.env`: `ln -s ../../../.env .env` from the worktree root
  (gitignored). Never open, print or edit it. Fury removes it at delivery.
- Scripts importing `server-only` modules: `node --require <stub making
  require('server-only') return {}> --import tsx --env-file=.env <script>`,
  scripts in the scratchpad only.
- Throwaway token: random token + SHA-256 hex hash via `node:crypto`;
  server `ASSISTANT_API_TOKEN_HASH=<hash> ASSISTANT_OWNER_USER_ID=<id> npx
  next dev --port 3250` in the background; stop it by pid after.
- People: one `admin` and one non-admin, non-device, active user id from
  dev (ids only). Report counts before/after of Goal, GoalCheckIn,
  PlanItem, VisionStatement, Habit, HabitParticipant, AssistantRequest.
- **Commit rule (parallel builders share this worktree):** commit with
  `git commit -m "<msg>" -- <your paths>` (`git add -N` new files first).
  `npm run build` waits for Fury (shared `.next`).

### C1 - shared goal, plan item and vision writes; thin actions

- **Objective:** one `server-only` home each for goal, plan item and vision
  writes, returning the rows they wrote, with the family's actions as thin
  wrappers that behave the same.
- **Boundaries:** May touch: new `src/lib/goalWrites.ts`, new
  `src/lib/planItemWrites.ts`, new `src/lib/visionWrites.ts`,
  `src/app/actions/goals.ts`, `src/app/actions/planItems.ts`,
  `src/app/actions/visions.ts`. Must not touch: `src/lib/assistant/**`
  (C2 runs in parallel), `src/lib/goals.ts`, `src/lib/visions.ts`,
  `src/lib/goalsRead.ts`, `src/lib/goalsProgress.ts`, `src/lib/habits/**`,
  components, routes, `prisma/schema.prisma`, `STRUCTURE.md`.
- **Work:** as Design, Shared write modules. Validation stays in
  `validateGoalInput` / `validatePlanItemInput` / `validateVisionInput`
  (called by the modules). The stored row decides ownership on edit, the
  date may not move earlier, a number removal deletes the check-ins in the
  same transaction (all three as today). Habit plan items call
  `createHabit` / `updateHabit` / `deleteHabit` with the same transaction,
  as today. `rebuildGoalNumber(tx, goalId)` holds the
  `numberAfterCheckIns` write that `deleteCheckIn` does today. Export every
  message constant; the actions import them. `createdById` is a parameter
  (the action passes the user, the route `null`).
- **Verification:** tsc, eslint, `npm test`, both TZ legs. **Parity script**
  (scratchpad, dev only, `ZZZ Assistant Test parity` goals, cleanup by id):
  OLD action bodies (from `d0397e2`, minus auth and `revalidatePath`) and
  the new modules side by side on separate test goals for: create Mine,
  create Together, create Ongoing, a past date (refused), edit title, move
  the date earlier (refused), add a number, check in twice, remove the
  newest check-in (number falls back), remove the number (check-ins gone),
  complete and reopen, a guard that refuses (same words as missing), add a
  habit item (Habit and participants made), a step, a reminder, step done
  and undone, reminder → habit, habit → step (habit deleted, the app's
  path), vision save, vision overwrite, vision empty (deleted). Rows match
  field by field (ids and timestamps aside) and every returned row equals
  the database row. Counts before/after.
- **Evidence required:** outputs per case (FAIL reported as FAIL), `wc -l`
  of new and changed files, `git diff --stat` inside the boundary, commit
  hash.
- **Done criteria:** gauntlet green; parity all MATCH; no string in the
  three actions changed (moves only).
- **Status:** DONE at `ee30bc3` (6 files, +640/-328).
- **Report:** tsc 0, `eslint .` 0, `npm test` 1341, UTC 1334 + 7 skips, LA
  1341. Parity (`scratchpad/parity/parity.ts`, dev only): OLD (actions at
  `d0397e2`), NEW (thin actions) and MOD (modules direct) on 45 cases, 0
  comparison FAIL; returned rows vs database 69 MATCH, 0 FAIL; error
  words identical. Counts restored (Goal 8, GoalCheckIn 3, PlanItem 2,
  VisionStatement 0, Habit 18, HabitParticipant 27); vision slot used was
  empty before and after. Sizes: goalWrites 255, planItemWrites 244,
  visionWrites 62; actions goals 264 → 145, planItems 315 → 199, visions
  47 → 33. Deviations: `updatePlanItem` takes `createdById` (a step turned
  habit keeps the creator); new `GOAL_NEEDS_OWNER` (a Mine goal with a null
  owner is refused, never stored as Together); `planItemRowOf` exported
  for C3's H4 check; the vision upsert retry now re-runs the whole attempt
  (a failed statement can't continue in a Postgres transaction); habit →
  step's cascaded logs are not returned (Winnie's route refuses it, H4).
  `rebuildGoalNumber` bumps `updatedAt` like the app always did, so **the
  undo hook keeps its own `updatedAt`-preserving write and C3 does not swap
  it** (C2 deviation 3); both use `numberAfterCheckIns`.

### C2 - undo learns goals

- **Objective:** undo can restore, remove and re-create `Goal`,
  `GoalCheckIn`, `PlanItem` and `VisionStatement` rows, ignores the goal's
  number cache when matching, and rebuilds it in the same transaction.
- **Boundaries:** May touch: `src/lib/assistant/undoModels.ts`,
  `undoPlan.ts`, `undoWrites.ts`, `undoHooks.ts`, new
  `src/lib/assistant/undoWork.ts`, new `undoTables.ts` (only if
  `undoWrites.ts` would pass 300), new `undoPlanGoals.test.ts`,
  `undoPlanHabits.test.ts` (import path of `streakWork` only). Must not
  touch: `undoPlan.test.ts`, `src/lib/goalWrites.ts` (C1 owns it: the hook
  rebuilds the number with its own call to `numberAfterCheckIns` in C2,
  and C3 swaps it for `rebuildGoalNumber`), actions, routes, schema.
- **Work:** as Design, Undo learns goals. Column maps typed
  `Record<keyof Goal | GoalCheckIn | PlanItem | VisionStatement,
  ColumnKind>` (dates: `targetDate`, `checkedInAt`, `completedAt`, `at`,
  `doneAt`, `createdAt`, `updatedAt`).
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Tests in
  `undoPlanGoals.test.ts`: undo of a goal create with a check-in removes
  the check-in before the goal; undo of a plan item create that made a
  habit removes PlanItem, then participants, then Habit, and the Habit's
  PlanItem reference is not `in_use`; undo of reminder → habit restores
  the item and removes the habit; a Goal copy differing only in
  `currentValue`/`checkedInAt` is not stale and restores without writing
  them; `goalWork` grouping; `streakWork` tests still pass from the new
  file. Fake column in `GOAL_COLUMNS` fails tsc (show it, remove it).
- **Evidence required:** test names, counts before/after, `wc -l` of
  touched files, `git diff --stat`, commit hash.
- **Done criteria:** gauntlet green; fake-column failure shown.
- **Status:** DONE at `4334282` (7 files, +374/-77).
- **Report:** tsc 0, `eslint .` 0, `npm test` 1341 (12 new in
  `undoPlanGoals.test.ts`); UTC 1334 + 7 skips; LA 1341. Fake column in
  `GOAL_CHECK_IN_COLUMNS` fails tsc (TS2353), removed. Sizes: undoModels
  293, undoPlan 261, undoWork 64 (new; `streakWork` moved here), undoHooks
  52, undoWrites 292 (no `undoTables.ts` needed). Deviations: (1) PlanLog
  sits under `REFERENCES.PlanItem` only (it has no `goalId`); PlanItem is
  now a parent table. (2) **Ordering change for every model:** re-created
  tier-0 rows now run before restores (`kindOrder`), else a redo of
  reminder → habit restores the item before its Habit exists (FK). Gates
  to look at. (3) The hook's rebuild keeps the goal's `updatedAt` so a
  redo does not hit `changed_since`; C3's swap to `rebuildGoalNumber`
  must keep that (or the hook keeps its own write).

### C3 - goal and vision routes (after C1 and C2)

- **Objective:** the routes in Design, every write undoable with the
  number right afterwards, documented in OpenAPI.
- **Boundaries:** May touch: `src/lib/assistant/habitActor.ts` (+ test),
  `habitActorEnv.ts`, new `src/lib/assistant/goalReads.ts`, new
  `serializeGoals.ts` (+ test), new `schemasGoals.ts` (+ test), new
  `openapiGoalPaths.ts`, `openapi.ts` (import + spread only), and new
  route files
  under `src/app/api/assistant/v1/goals/`, `.../plan-items/`,
  `.../vision/`. Must not touch: `src/lib/goals*.ts`, `visions*.ts`, the
  three write modules (BLOCKED-ON-CONTRACT if one lacks something),
  actions, components, schema.
- **Rules:** mission 44's route rules (each file only `export const
  <METHOD> = assistantRoute(...)`; parse, call lib, shape; reads in one
  `server-only` read module, shaped by pure serializers; no names in any
  response, people are ids). Every write pushes one `changes` entry per
  row with full copies (models Goal, GoalCheckIn, PlanItem,
  VisionStatement, Habit, HabitParticipant). A no-op records nothing and
  answers 200. Winnie's viewer from `assistantGoalViewer()`; `today` from
  `householdToday`. Body schemas `.strict()`; `visibility` not accepted.
- **Verification:** tsc, eslint, `npm test`, both TZ legs. Live (port 3250,
  setup above), positive control first (`GET /openapi.json` lists the new
  operations; `GET /goals?status=all` count equals the DB count of goals
  visible under `canSee`). `ZZZ Assistant Test` goals made through the
  routes (one Mine, one Together with a number) plus by script one private
  goal for the admin and one for the non-admin. Each route once; then undo
  each write: **check-ins 80 then 78 → undo the second → `currentValue`
  80 = fresh `numberAfterCheckIns`; redo → 78**; undo a goal create (goal
  and its check-ins gone); undo a habit plan item create (item, habit,
  participants gone); undo reminder → habit; undo a PATCH (fields back,
  number cache right); undo a vision save on an empty slot (row gone) and
  an overwrite of it (text back). Refusals: family checks in by script,
  then undo of Winnie's earlier check-in → 409 `changed_since`; remove a
  family check-in → 403; `visibility` in a body → 400; the non-admin's
  private goal → 404 on every verb; the non-admin's non-private Mine goal
  → readable, every write 404 "You can't change that goal."; Mine create
  and Mine vision write with `ASSISTANT_OWNER_USER_ID` unset → 400 and the
  admin's private goal 404 (restart once). Counts before/after; all test
  rows and AssistantRequests deleted by id.
- **Evidence required:** outputs per check, sizes, `git diff --stat`,
  commit hash.
- **Done criteria:** gauntlet green; every live line PASS; `openapi.test.ts`
  green.
- **Status:** DONE at `8ad6a97` (19 files, +1473/-3).
- **Report:** tsc 0, `eslint .` 0, `npm test` 1370 (29 new), UTC 1363 + 7
  skips, LA 1370, `openapi.test.ts` 8/8, build compiled (its exit code was
  not captured; the gates re-run it). Live on dev, port 3250
  (`scratchpad/c3/live.ts`): run 1 had 2 FAILs from the script's own wrong
  expectation (a date later than today but earlier than the stored date is
  allowed by the app); run 2 125 PASS, 0 FAIL. Counts identical before and
  after (Goal 8, GoalCheckIn 3, PlanItem 2, VisionStatement 0, Habit 18,
  HabitParticipant 27, AssistantRequest 4). Headline: check-ins 80 then 78,
  undo → 80 = fresh `numberAfterCheckIns`, redo → 78. Habit plan item
  create, reminder → habit, PATCH, step done, vision create and overwrite
  all undo and redo. H1, H2, H4, H5 words exact. Privacy: the non-admin's
  private goal 404 on every verb; their non-private Mine goal readable,
  every write 404 "You can't change that goal."; owner unset → Mine create
  400, owner board 400, owner's private goal 404. Sizes: goalReads 115,
  serializeGoals 269, schemasGoals 206, openapiGoalPaths 150, routes 9
  files (largest 76), 11 operations. Deviations: (1) `GET /vision` uses
  one vision query plus one `loadPlansPage` instead of `loadVisionBoard`
  per board and horizon (up to 15 loads, and its "Mine" board key would be
  "" with the owner unset); (2) **Stark's own words**: a board that is
  neither Together nor the owner's → 403 "Winnie can only write the
  Together board and the owner's board."; owner unset → 400 "Winnie can't
  tell which board is the owner's, so she can only write the Together
  board."; (3) PATCH removes a number with `removeNumber: true`; (4) the
  Sunday recap with `personId` exists only for the owner (null for anyone
  else; `loadWeekRecap` has two scopes); (5) PATCH routes roll back on a
  no-op; (6) undo of a goal create not run live (unit-tested in C2).

### C4 - records (after the gates)

- CLAUDE.md edits in Design, Records; this file's Delivery with "What to
  tell Winnie"; Captain's amendment texts. Fury writes these.

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-07 - Branch reset to `origin/main` `d0397e2`; number 50
  reserved (stub commit `b942236`). Bryce switched Fury to Fable for planning.
  Banner brief taken. Contracts written. Hill H1 to H9 recorded. Next:
  Bryce switches back to Opus, then C1 and C2 go out in parallel.

## Delivery

(Not yet.)

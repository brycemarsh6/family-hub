# Mission 29: Plans & Goals PR 3 (dashboard tile, Sunday recap, check-in history)

**Project:** family-hub (Marshee)
**Status:** CONTRACTED
**Started:** 2026-11-04 · **Updated:** 2026-11-04
**Branch:** `claude/plans-goals-p3` from `origin/main` at `bd8d4d1` (PR #38 merged)
**Direction:** `.avengers/plans/plans-goals-v1.md` (read first)
**Layout:** Fury's inline mock shown to Bryce 2026-11-04 (screens A, B, C),
described in words below.

## Bryce's decisions (final, 2026-11-04, "Yes, as recommended")

- **A. Dashboard tile "Goals this week".** Full width, second in the
  default order, right under Today's meals. Header: `Target` icon and the
  title. Body: "{done} of {total} done" (this week's habit taps, the same
  numbers as the This week header), a `ProgressBar`, then "Still to do:"
  and up to three lines "{habit title} · {n} left". The whole tile is the
  one tap target and opens `/plans` (This week).
- **Whose goals the tile counts:** the viewer's own plus Together goals
  (This week's default "Mine and Together"). A device login (the wall
  tablet) counts every goal it may see.
- **B. Sunday recap.** On Sundays only (Denver), all day, a card at the top
  of This week sums up the week that just ended (Sunday to Saturday). No
  dismiss button, no notification. It follows This week's Mine and
  Together / Everyone chips.
- **C. Check-in history.** Every check-in is kept. The goal page lists the
  newest three under The result, newest first, as "{date}" and
  "{value with unit}", then "Show all {n}" when there are more. A row
  swipes right to left to a one-tap Delete (no confirmation, like the rest
  of the app). Deleting moves the goal's current number back to the
  newest check-in left.
- **Existing check-ins carry over:** each goal's saved latest number
  becomes its first history entry.
- **"Show in Routines" stays deferred** until Routines exists.

## Brief

PR 3 of Plans & Goals. Wording below is Fury's, inside Bryce's approved
layout. Each line of wording names its source so a gate can check it.

**Tile (A).** Title "Goals this week". Body line 1 "{done} of {total}
done". Line "Still to do:" then rows "{title} · {n} left", at most three,
taken in This week's order (goals soonest target date first, habits in
their plan order), skipping habits already done. When every habit is
done: "All done this week" instead of the list. When there are no habits
this week (total 0): "No habits planned" and no bar. Monthly habits are
left out, the same as the This week header (`weekSummary`).

**Recap (B).** A card in `bg-accent-soft` with a small uppercase label
"Last week · {Mon d} to {Mon d}" (for example "Last week · Nov 1 to 7";
the month repeats only when it changes, "Oct 25 to Nov 1"), the big line
"{done} of {total} done", then one row per day or week habit "{title}
{count} of {target}", with a `Check` icon when met. Then, for each goal
with a number that had a check-in during the week: "{goal title}: {from}
to {to}", where "from" is the value just before the week (the newest
check-in before Sunday, else the goal's start value) and "to" is the
newest check-in inside the week, both formatted with `formatMeasure`.
Then "Steps finished: {titles joined with ', '}" when any step's `doneAt`
fell in the week. The card is hidden when the week had no habits, no
measured check-ins and no finished steps. Monthly habits are left out.
Completed goals are included if they were active during the week
(completedAt null or inside or after the week).

**History (C).** A `CheckInHistory` block inside The result card:
heading "History" in the existing small uppercase label style, rows
`min-h-12`, date by `formatShortCalendarDate` in the household zone,
value by `formatMeasure`. "Show all {n}" is a text button that expands
in place (client state). Swipe actions: Delete (danger), only when the
viewer `canEdit`. Hidden entirely when the goal has no number or no
check-ins.

## Danger register

- Local dev runs against the Neon `dev` branch (`ep-hidden-pine`).
  Production's connection string lives only in Vercel. If `DATABASE_URL`
  is not the dev endpoint, stop. Never print `.env`.
- `npm run db:seed`, `npm run db:reset`, `prisma migrate reset`, `prisma db
  push` and `prisma migrate dev` are forbidden. **Stark never touches the
  database.** Stark writes the migration SQL from a schema-to-schema
  `npx prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script`
  (old schema from `git show origin/main:prisma/schema.prisma` into the
  scratchpad), appends the backfill `INSERT` by hand, and runs `npx prisma
  generate`. **Fury** confirms the dev host, reviews the SQL (CREATE TABLE,
  CREATE INDEX, ADD CONSTRAINT and one INSERT ... SELECT only; nothing that
  drops, alters or updates an existing column or row), and applies it with
  `npx prisma migrate deploy`. Bryce's decision 5 (carry existing check-ins
  over) is the permission for that INSERT; on merge the Vercel build runs
  the same INSERT against production.
- The dev branch holds real family data. Count rows, never quote them.
- Never write a clean or reset script for `User`.
- No push, no PR, no merge without Bryce's go-ahead. Stage by explicit
  path; `git show --stat HEAD` after every commit.

## Gauntlet

- `npx tsc --noEmit`
- `npx eslint .`
- `npm test` (536 before this mission; must rise)
- `TZ=UTC node --import tsx --test src/lib/*.test.ts src/lib/voice/*.test.ts src/lib/assistant/*.test.ts`
- `node /private/tmp/claude-501/-Users-brycemarsh-Developer-family-hub--claude-worktrees-github-pull-source-check-f0f1a7/53a6940d-06dc-4a80-849b-ac656ea01738/scratchpad/cycles.mjs "$PWD"`
- `npm run build`

## Assembled

Stark (builder), Vision (correctness, `model: "opus"`), Strange (design,
three new visible pieces), Captain (structure: a new table, new lib and
component files). Banner not needed: Fury read the code inline. All gates
on Opus 5.5 (Bryce's standing rule). Budget 3 passes per gate.

## Facts the contracts hang on

- Dashboard registry: `src/lib/dashboardWidgets.ts` (`DASHBOARD_WIDGET_IDS`
  is the default order; a test pins the record's key order to it).
  `parseDashboardLayout` in `src/lib/dashboardLayout.ts` appends registry
  ids missing from a saved layout **at the end**, so as written Bryce and
  Emily would get the new tile last, not second. Tiles are built in
  `src/app/(app)/(home)/page.tsx` as a `Record<DashboardWidgetId, ReactNode>`
  using `DashboardTile` (one tap target, no inner links or buttons).
- `weekSummary` (`src/lib/goalsProgress.ts:101`) counts day and week
  habits only, capped at target. `logWindow` gives a day habit `times × 7`
  per week. Weeks start Sunday (`startOfWeek`).
- This week's goal filter lives inline in `ThisWeekList.tsx:71-75`:
  active goals, and for a person on "Mine and Together" those whose
  `whoseGoal` is not "theirs". The tile needs the same rule, so it moves to
  one place.
- `goalsRead.ts` `goalInclude(today)` loads logs from
  `earliestWindowStart(today)` (this week or this month). The recap needs
  the previous week too.
- Check-ins today: `checkInGoal` (`src/app/actions/goals.ts:200`) writes
  `currentValue` + `checkedInAt` on the goal. A measured goal has all four
  of unit, start, target, current set. `GoalDetail.tsx` is 316 lines (cap
  350), so history gets its own component.
- Latest migration `20261104200000_add_vision_statements`.

## Contracts

C1, then C2, then C3, then C4. Each is one Stark dispatch.

### C1: Pure logic: tile summary, weekly recap, the shared goal filter, layout insertion
- **Status:** DONE (Stark, verified by Fury: npm test 556/556, eslint clean)
- **Boundaries:** may touch: `src/lib/dashboardWidgets.ts`,
  `src/lib/dashboardLayout.ts`, `src/lib/dashboardLayout.test.ts`, the
  registry test if it is a separate file, `src/lib/goals.ts`,
  `src/lib/goals.test.ts`, `src/lib/goalsProgress.ts`, new
  `src/lib/goalsRecap.ts`, new `src/lib/goalsRecap.test.ts`,
  `src/components/ThisWeekList.tsx` (only to call the lifted filter)
  · must not touch: `prisma/`, `src/app/`, every other component.
- **Spec:**
  1. Registry: add `goals: { label: "Goals this week", width: "full",
     defaultEnabled: true }`, second in `DASHBOARD_WIDGET_IDS` (after
     `todayMeals`). Update the order test.
  2. `parseDashboardLayout`: a registry id missing from a saved layout is
     inserted directly after the nearest registry id that comes before it
     in `DASHBOARD_WIDGET_IDS` and is present in the saved list (at the
     start if none is). Existing behavior otherwise unchanged. Tests: a
     saved four-widget layout gains `goals` second; a saved layout that
     moved `todayMeals` last gains `goals` right after it; a saved layout
     with `todayMeals` missing too gets both back in registry order; the
     doc comment says the new rule.
  3. `goals.ts`: add `goalsInScope(goals, viewer, scope: "mine" | "everyone")`
     returning active goals (completedAt null) the viewer counts: device or
     "everyone" keeps all, otherwise those whose `whoseGoal` is not
     "theirs". Tests. `ThisWeekList` uses it in place of its inline filter
     (behavior identical).
  4. `goalsProgress.ts`: add `weekTodo(goals, limit)`: the habits counted
     by `weekSummary`, in goal order then item order, not yet done, as
     `{ title, left }` (left = target minus count), at most `limit`.
     Tests.
  5. New `goalsRecap.ts`, pure, with `isRecapDay(today)` (Sunday) and
     `weekRecap(input, weekStart)` where input is per goal: the goal row,
     its plan items, their logs and its check-ins (`{ value, at }`). Output
     `{ start, end, done, total, habits: { title, count, target, met }[],
     measures: { goalTitle, from, to, unit }[], stepsDone: string[] } | null`
     following the Brief exactly (null when there is nothing to show).
     Week boundaries in the household zone: logs by their `day` (UTC
     midnight convention), check-ins and `doneAt` as instants compared
     with `zoneMidnightInstant(..., HOUSEHOLD_TIME_ZONE)`. Add
     `recapRangeLabel(start, end)` for "Nov 1 to 7" / "Oct 25 to Nov 1".
     Tests cover: day habit target 7 × times, monthly habits left out, a
     log on Saturday counts and one on the next Sunday does not, the
     "from" fallback to start value, a check-in at 11:30 pm Denver
     Saturday counts in the week, steps finished, the all-empty null, a
     goal completed mid-week included, both label forms.
- **Verification:** the gauntlet minus build.
- **Evidence required:** a line per item with file:line; outputs; test
  count before and after; line counts of touched files.
- **Done criteria:** Vision re-runs the tests; `ThisWeekList` diff is the
  filter swap only.
- **Report:** all five items as specified; 20 new tests. One expected break, accepted by Fury: `tsc` fails only in `src/app/(app)/(home)/page.tsx` because the registry gained `goals` and the page's tile record (C3's file) does not have it yet. That was Fury's contract error (the registry and the page cannot change apart). C3 must leave tsc at zero errors. Stark also skips goals created after the recap week ended (tested, beyond the Brief, accepted: a new goal should not add to a week it did not exist in) and caps recap counts at the target like `weekSummary`.

### C2: Data: the GoalCheckIn table, backfill, reader and actions
- **Status:** DONE (Stark; Fury reviewed the SQL and applied it on dev with `prisma migrate deploy` after confirming the `ep-hidden-pine` host)
- **Boundaries:** may touch: `prisma/schema.prisma`, new
  `prisma/migrations/20261105000000_add_goal_check_ins/migration.sql`,
  `src/lib/goalsRead.ts`, `src/lib/goals.ts` (view types only),
  `src/app/actions/goals.ts` · must not touch: every other file. Never run
  a database command except `npx prisma generate` and `npx prisma migrate
  diff`.
- **Spec:**
  1. `model GoalCheckIn { id String @id @default(cuid()); goalId String;
     goal Goal @relation(fields: [goalId], references: [id], onDelete:
     Cascade); value Float; at DateTime @default(now()); createdById
     String?; createdBy User? @relation(fields: [createdById], references:
     [id], onDelete: SetNull); @@index([goalId, at]) }` with doc comments
     in the schema's style, plus back-relations on `Goal` (`checkIns`) and
     `User`.
  2. Migration from the schema diff, then a hand-written backfill:
     `INSERT INTO "GoalCheckIn" ("id", "goalId", "value", "at")
     SELECT 'ci_' || "id", "id", "currentValue", "checkedInAt" FROM "Goal"
     WHERE "currentValue" IS NOT NULL AND "checkedInAt" IS NOT NULL;` with a
     SQL comment saying why. Nothing else.
  3. `checkInGoal` writes the goal update and a `GoalCheckIn` row in one
     `db.$transaction`. New `deleteCheckIn(id)`: guard (`getVerifiedUser`,
     device refused, `canEdit` on the parent goal), delete the row (already
     gone is success), then set the goal's `currentValue` / `checkedInAt`
     to the newest remaining check-in, or to `startValue` / null when none
     remain, all in one transaction. `refreshPlansViews()` after both.
  4. `goalsRead.ts`: `goalInclude` loads logs from one week before
     `earliestWindowStart(today)`; `loadGoal` also returns the goal's
     check-ins newest first; add `loadWeekRecap(viewer, today, scope)`
     returning `weekRecap(...)` for the week before `startOfWeek(today)`
     when `isRecapDay(today)`, else null, over the goals `canSee` allows
     (scope is applied client-side, so return the per-goal recap inputs
     shape the client can filter, or return both scopes; pick one and say
     which); add `loadGoalsTile(viewer, today)` returning `{ done, total,
     todo }` for scope "mine" (device: everyone). Both reuse
     `loadPlansPage` paths rather than a second query shape where they
     can. `GoalView` gains `checkIns: { id, value, at }[]` (empty unless
     loaded).
- **Verification:** tsc, eslint, `npm test`, `npx prisma validate`,
  `npx prisma generate`; paste the full migration SQL.
- **Evidence required:** the SQL; a line per item; outputs.
- **Done criteria:** Fury reviews and applies the SQL on dev, then
  counts rows (`GoalCheckIn` rows equals goals with a check-in).
- **Report:** all four items. `loadWeekRecap(viewer, today)` returns `{ mine, everyone }` (both scopes, so the client chips need no second call; only the summary reaches the browser), null off Sundays; "mine" keeps goals completed mid-week, so it does not use `goalsInScope`. `buildGoalView` gained `checkIns: []` (needed by the type). Check-ins load with every goal read (small rows). Row count on dev after the migration: 0 history rows for 0 goals with a check-in (matches, but vacuously: the dev copy has no checked-in goals). Open question for Bryce: removing a goal's number to track leaves its old history rows behind.

### C3: Screens: the tile, the recap card, check-in history
- **Status:** DONE (Stark, verified by Fury: tsc 0 errors, eslint, npm test 556/556)
- **Boundaries:** may touch: `src/app/(app)/(home)/page.tsx`, new
  `src/components/GoalsTile.tsx` (only if the tile body is more than a few
  lines), new `src/components/WeekRecapCard.tsx`, new
  `src/components/CheckInHistory.tsx`, `src/components/ThisWeekList.tsx`,
  `src/components/GoalDetail.tsx`, `src/app/(app)/plans/page.tsx`,
  `src/app/(app)/plans/goals/[id]/page.tsx` · must not touch: `prisma/`,
  `src/lib/` except reading, `globals.css`, the actions.
- **Spec:** build A, B and C exactly as the Brief says, with existing
  vocabulary only: `DashboardTile`, `ProgressBar`, `SwipeActions`, the
  small uppercase label style, job-named color tokens, Lucide outline
  icons (`Target`, `Check`, `Trash2`). Touch only: every control at least
  44px, rows `min-h-12`. History delete is optimistic with revert and an
  inline `role="alert"` error, the way `GoalDetail` handles check-ins.
  `GoalDetail.tsx` stays under 350 lines.
- **Verification:** the full gauntlet including build.
- **Evidence required:** a line per piece with file:line; outputs; line
  counts.
- **Done criteria:** Fury's browser check at 375 and 820, light and dark,
  on a Sunday clock and a weekday clock.
- **Report:** GoalsTile (53 lines), WeekRecapCard (38), CheckInHistory (78), GoalDetail 335 lines; home page uses `householdToday`. Deviation accepted pending Bryce: the recap hides its big "{done} of {total}" line when total is 0. Note: an optimistic check-in shows in History only after the refresh.

### C4: Records
- **Status:** PENDING
- **Boundaries:** `DESIGN.md`, `STRUCTURE.md`, `CLAUDE.md`,
  `.avengers/plans/plans-goals-v1.md` only.
- **Spec:** DESIGN.md vocabulary gains `WeekRecapCard` and
  `CheckInHistory` with reasons; STRUCTURE.md one-source list gains
  `goalsInScope` (the only This week / tile scope rule), `goalsRecap.ts`
  (the only recap logic), the `GoalCheckIn` table as the only check-in
  history, and the layout insertion rule; CLAUDE.md "What's built" and
  Current status; the direction file marks PR 3 and moves "A check-in
  history table" out of "Deferred on purpose".
- **Verification:** recordcheck, CLAUDE.md under 250 lines.
- **Report:** (pending)

## Gate ledger

| Pass | Gate | Verdict | Blockers | Notes |
|---|---|---|---|---|

## Handoff log

- 2026-11-04: Bryce approved the mock and all five recommendations. Fury
  wrote this file. Next: C1 to Stark.

## Delivery

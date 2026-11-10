# STRUCTURE.md companion: Plans & Goals

Part of [STRUCTURE.md](../../STRUCTURE.md)'s "One source of truth" list,
cut from it word for word at commit e62056c on 2026-11-09 by mission 59.
Every rule here binds exactly like STRUCTURE.md; a second definition is a
BLOCKER. Each entry continues the headline kept in STRUCTURE.md.

## One source of truth

### The goal policy

`src/lib/goalsRead.ts` is the only page reader of goal rows.
  **Ongoing goals (mission-38):** `Goal.targetDate` is nullable; null means
  Ongoing. `validateGoalInput` in `goals.ts` is the only place that decides
  whether a goal is ongoing or dated: only an explicit `ongoing: true` lets
  a blank date through, and the past-date check applies only to a date.
  Actions save its result as is, with no second check. `paceStatus` in
  `goalsProgress.ts` is the only pace rule for an ongoing goal ("reached"
  or null). `findGoals` in `goalsRead.ts` orders ongoing goals last
  (`nulls: "last"`). `ONGOING_LABEL` in `goalVocabulary.ts` is the only
  "Ongoing" wording; a component or page that types the word itself is a
  BLOCKER. `isOngoingGoal(goal)` in `goals.ts`, beside `isPrivateGoal`, is
  the only "is this goal Ongoing" check (mission-50; added when the
  tripwire was crossed). A page, component, action, route or serializer
  that compares `targetDate` with `null` itself is a BLOCKER. The one
  sanctioned inline check is in `paceStatus` (`goalsProgress.ts`),
  commented, because `goals.ts` imports `goalsProgress.ts` and importing it
  back would make a cycle. The form
  limits `GOAL_TITLE_MAX` / `GOAL_WHY_MAX` / `MEASURE_UNIT_MAX` /
  `HABIT_TIMES_MAX` are exported from `goals.ts` (the `MIN_PASSWORD_LENGTH`
  precedent). `goalOnBoard(goal, board)` there is how a goal is matched to a
  vision board, so nothing outside `goals.ts` compares a goal's `ownerId`
  for that. (Added 2026-11-04, mission-27; Bryce approved the plan. The
  `goalOnBoard` line was added by mission-28.)

### Plans & Goals scope, recap and check-in history

`countsInScope(goal, viewer, scope)` in `goals.ts` is the one scope rule
  (a device or "everyone" keeps all, otherwise a goal that is not "theirs");
  `goalsInScope` is its active-only wrapper, the only This week / tile
  filter, and `loadWeekRecap` calls `countsInScope` for "mine" because a goal
  completed mid-week still counts. An inline copy of the rule is a BLOCKER.
  `src/lib/goalsRecap.ts` is the only recap logic: pure, with habit windows
  and counts taken from `goalsProgress.ts` (`buildPlanItemView`,
  `weekSummary`) and no target math of its own. **Dependency direction:**
  `goalsRecap.ts` takes only types from `goals.ts`, and `goals.ts` and
  `goalsProgress.ts` never import `goalsRecap.ts`. The `GoalCheckIn` table
  is the only check-in history; `Goal.currentValue` / `checkedInAt` mirror
  its newest row and are written only by `src/lib/goalWrites.ts`
  (mission-50): `addCheckIn`; removing the number in `updateGoal`; and
  `rebuildGoalNumber(tx, goalId, { keepUpdatedAt? })`, the one writer of
  the fallback, which skips a write that changes nothing and keeps
  `updatedAt` when asked. It is called by check-in removal and by
  `afterUndo` (`assistant/undoHooks.ts`, with `keepUpdatedAt: true`, for the
  goals `goalWork` in `assistant/undoWork.ts` names); undo never writes the
  cache columns itself (`VOLATILE` in `undoModels.ts`). `lockGoal(tx, id)`
  in `goalWrites.ts` is the only goal row lock. They are read for pages
  only by `goalsRead.ts`.
  `numberAfterCheckIns` in `goalsProgress.ts` is the one fallback rule (the
  newest remaining check-in, else the start value). **Two places must
  change together:** the two `PlanItemRow` builders (`planItemRowOf` in
  `planItemWrites.ts`, and `goalsRead.ts`), and the two check-in flags in `goalsRead.ts`
  (`goalInclude` and `toView`). **Size watch:** `GoalDetail.tsx` is 277
  lines (soft cap 350) after mission 37 moved "The result" card into
  `GoalResultCard.tsx`; `goals.ts` is 343 (mission-50) and `GoalForm.tsx` 334 (its target-date field, with the
  chips and Ongoing, is the split seam); `goals.test.ts`
  is 344 after mission 30 split its habit tests into `goalsHabitInput.test.ts`;
  the next goal test goes in a new file by concern.

import "server-only";

// The database half of undo (the pure planning is undoPlan.ts). One request is
// reversed in ONE transaction, all or nothing:
//   1. read the request and its changes, and refuse if it cannot be undone;
//   2. read every row it touched and refuse (409 changed_since) naming the
//      ones that no longer match what the request left;
//   3. restore edited rows, delete created rows, re-create deleted rows.
// Step 2 is the friendly message; step 3 is the real guard: every write is
// keyed on the full row the request left (`updateMany` / `deleteMany` where
// every column matches), so a family edit that lands after the read makes the
// count 0 and the whole transaction rolls back. The undo's own changes carry
// copies too, which is what makes undoing an undo (a redo) work.

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { isForeignKeyViolationError, isUniqueViolationError } from "@/lib/prismaErrors";
import { ApiError, notFound } from "./errors";
import { afterUndo } from "./undoHooks";
import type { ChangeInput } from "./audit";
import {
  FOREIGN_KEYS,
  PARENT_TABLES,
  type ParentModel,
  type Reference,
} from "./undoModels";
import {
  findStale,
  fromCopy,
  planUndo,
  referenceChecks,
  toCopy,
  undoPathFor,
  type StaleRecord,
  type UndoModel,
  type UndoRefusal,
  type UndoStep,
} from "./undoPlan";

export type UndoResult = { undone: string; restored: number; removed: number; recreated: number };

const MESSAGES: Record<Exclude<UndoRefusal["reason"], "changed_since">, string> = {
  not_undoable: "That request can't be undone: it changed nothing, or it was recorded without copies, or it touched something undo doesn't cover.",
  too_old: "That request is more than 30 days old, so it can no longer be undone.",
  failed_request: "That request failed, so there is nothing to undo.",
  already_undone: "That request was already undone. To bring its changes back, undo the undo.",
};

function refuse(refusal: UndoRefusal): ApiError {
  if (refusal.reason === "changed_since") return changedSince(refusal.records);
  return new ApiError(409, "conflict", MESSAGES[refusal.reason], { reason: refusal.reason });
}

function changedSince(records: StaleRecord[]): ApiError {
  return new ApiError(
    409,
    "conflict",
    "Something changed after that request, so undoing it could lose that change. Nothing was changed.",
    { reason: "changed_since", records },
  );
}

type Delegate = {
  findMany(args: { where: object }): Promise<Record<string, unknown>[]>;
  findUnique(args: { where: object }): Promise<Record<string, unknown> | null>;
  updateMany(args: { where: object; data: object }): Promise<{ count: number }>;
  deleteMany(args: { where: object }): Promise<{ count: number }>;
  create(args: { data: object }): Promise<Record<string, unknown>>;
};

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function delegate(tx: Tx, model: UndoModel): Delegate {
  const tables: Record<UndoModel, unknown> = {
    PantryItem: tx.pantryItem,
    GroceryItem: tx.groceryItem,
    Recipe: tx.recipe,
    Tag: tx.tag,
    RecipeTag: tx.recipeTag,
    Cookbook: tx.cookbook,
    CookbookRecipe: tx.cookbookRecipe,
    MealPlan: tx.mealPlan,
    MealPlanEntry: tx.mealPlanEntry,
    Habit: tx.habit,
    HabitParticipant: tx.habitParticipant,
    HabitLog: tx.habitLog,
    HabitTimeEntry: tx.habitTimeEntry,
    Goal: tx.goal,
    GoalCheckIn: tx.goalCheckIn,
    PlanItem: tx.planItem,
    VisionStatement: tx.visionStatement,
  };
  return tables[model] as Delegate;
}

/** Rows of `ref.child` pointing at `parentId`, leaving out `exclude` (rows this plan removes). */
function countReferences(tx: Tx, ref: Reference, parentId: string, exclude: string[]): Promise<number> {
  const where = { [ref.column]: parentId, id: { notIn: exclude } };
  const tables = {
    GroceryItem: tx.groceryItem,
    VoiceChange: tx.voiceChange,
    RecipeTag: tx.recipeTag,
    CookbookRecipe: tx.cookbookRecipe,
    MealPlanEntry: tx.mealPlanEntry,
    HabitParticipant: tx.habitParticipant,
    HabitLog: tx.habitLog,
    HabitTimeEntry: tx.habitTimeEntry,
    HabitPlannedDay: tx.habitPlannedDay,
    ChoreWeekOverride: tx.choreWeekOverride,
    Nudge: tx.nudge,
    PlanItem: tx.planItem,
    GoalCheckIn: tx.goalCheckIn,
    PlanLog: tx.planLog,
  };
  return (tables[ref.child] as unknown as { count(args: { where: object }): Promise<number> }).count({ where });
}

async function parentExists(tx: Tx, parent: string, id: string): Promise<boolean> {
  const where = { where: { id }, select: { id: true } };
  const tables = {
    PantryItem: tx.pantryItem, User: tx.user, Recipe: tx.recipe, Tag: tx.tag,
    Cookbook: tx.cookbook, MealPlan: tx.mealPlan, Habit: tx.habit, Goal: tx.goal,
  } as Record<string, unknown>;
  const found = await (tables[parent] as { findUnique(args: object): Promise<unknown> }).findUnique(where);
  return found !== null;
}

/** Everything but the id, for an update's data. */
function withoutId(values: Record<string, unknown>) {
  const { id: _id, ...rest } = values;
  void _id;
  return rest;
}

/**
 * Reverse request `requestId`. Returns the response and the changes to log
 * (the caller pushes them only after this resolves: a refusal logs none).
 */
export async function undoRequest(
  requestId: string,
  now: Date,
): Promise<{ result: UndoResult; changes: ChangeInput[] }> {
  const undoPath = undoPathFor(requestId);

  return db.$transaction(async (tx) => {
    const request = await tx.assistantRequest.findUnique({
      where: { id: requestId },
      include: { changes: true },
    });
    if (!request) throw notFound();

    const alreadyUndone =
      (await tx.assistantRequest.count({
        where: { path: undoPath, status: { gte: 200, lt: 300 } },
      })) > 0;

    const plan = planUndo({
      request,
      changes: request.changes,
      now,
      undoPath,
      alreadyUndone,
    });
    if (!plan.ok) throw refuse(plan);

    // What the rows look like now.
    const current = new Map<string, Record<string, unknown>>();
    for (const model of new Set(plan.steps.map((s) => s.model))) {
      const ids = plan.steps.filter((s) => s.model === model).map((s) => s.recordId);
      for (const row of await delegate(tx, model).findMany({ where: { id: { in: ids } } })) {
        current.set(`${model}:${row.id as string}`, row);
      }
    }
    const stale = findStale(plan.steps, current);
    if (stale.length > 0) throw changedSince(stale);

    // Removing a parent row would silently null (or cascade away) any link the
    // family has made to it since (a shopping line, a voice log, a meal-plan
    // entry), so refuse instead. Links that this same plan removes don't count:
    // they go first. The parents are locked first (model by model, ids sorted,
    // so two undoes cannot deadlock): a family insert of a link needs a share
    // lock on its parent row, so it waits here and is then counted.
    const removing = plan.steps.filter((s) => s.kind === "remove");
    const parentIds = (model: ParentModel) =>
      removing.filter((s) => s.model === model).map((s) => s.recordId).sort();
    for (const model of Object.keys(PARENT_TABLES).sort() as ParentModel[]) {
      const ids = parentIds(model);
      if (ids.length === 0) continue;
      await tx.$queryRaw`SELECT id FROM ${Prisma.raw(`"${PARENT_TABLES[model]}"`)} WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
    }
    const inUse: StaleRecord[] = [];
    for (const { model, recordId, ref, exclude } of referenceChecks(plan.steps)) {
      if (inUse.some((r) => r.model === model && r.recordId === recordId)) continue;
      if ((await countReferences(tx, ref, recordId, exclude)) > 0) {
        inUse.push({ model, recordId, problem: "in_use" });
      }
    }
    if (inUse.length > 0) throw changedSince(inUse);

    const logged: ChangeInput[] = [];
    const done = { restored: 0, removed: 0, recreated: 0 };

    for (const step of plan.steps) {
      const table = delegate(tx, step.model);
      const name = [{ model: step.model, recordId: step.recordId, problem: "changed" as const }];
      const detail = { undoes: requestId, step: step.kind };

      if (step.kind === "restore") {
        let count: number;
        try {
          ({ count } = await table.updateMany({
            where: fromCopy(step.model, step.after!),
            data: withoutId(fromCopy(step.model, step.before!)),
          }));
        } catch (error) {
          // The old copy points at a row the family deleted since.
          if (isForeignKeyViolationError(error)) throw changedSince([{ ...name[0], problem: "missing" }]);
          throw error;
        }
        if (count !== 1) throw changedSince(name);
        // Our own write holds the row until commit, so this read is exact.
        const row = await table.findUnique({ where: { id: step.recordId } });
        logged.push({
          model: step.model,
          recordId: step.recordId,
          action: "update",
          summary: detail,
          before: step.after,
          after: toCopy(step.model, row!),
        });
        done.restored++;
      } else if (step.kind === "remove") {
        const { count } = await table.deleteMany({ where: fromCopy(step.model, step.after!) });
        if (count !== 1) throw changedSince(name);
        logged.push({
          model: step.model,
          recordId: step.recordId,
          action: "delete",
          summary: detail,
          before: step.after,
          after: null,
        });
        done.removed++;
      } else {
        const data = await recreateData(tx, step);
        let row: Record<string, unknown>;
        try {
          row = await table.create({ data });
        } catch (error) {
          if (isUniqueViolationError(error)) {
            throw changedSince([{ ...name[0], problem: "exists" }]);
          }
          if (isForeignKeyViolationError(error)) {
            throw changedSince([{ ...name[0], problem: "missing" }]);
          }
          throw error;
        }
        logged.push({
          model: step.model,
          recordId: step.recordId,
          action: "create",
          summary: detail,
          before: null,
          after: toCopy(step.model, row),
        });
        done.recreated++;
      }
    }

    // Streak caches are not undone, they are rebuilt (same transaction).
    await afterUndo(tx, plan.steps, now);

    return { result: { undone: requestId, ...done }, changes: logged };
  });
}

/**
 * The columns to re-create a deleted row from. A link whose target no longer
 * exists comes back empty when the database would have emptied it too (a
 * shopping line's pantry item or adder, a meal-plan entry's recipe). Any other
 * missing target means the row cannot come back: 409, naming the target.
 */
async function recreateData(tx: Tx, step: UndoStep): Promise<Record<string, unknown>> {
  const data = fromCopy(step.model, step.before!);
  for (const fk of FOREIGN_KEYS[step.model] ?? []) {
    const id = data[fk.column] as string | null;
    if (!id || (await parentExists(tx, fk.parent, id))) continue;
    if (fk.onMissing === "null") data[fk.column] = null;
    else throw changedSince([{ model: fk.parent, recordId: id, problem: "missing" }]);
  }
  return data;
}

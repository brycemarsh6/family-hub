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
import { isUniqueViolationError } from "@/lib/prismaErrors";
import { ApiError, notFound } from "./errors";
import type { ChangeInput } from "./audit";
import {
  findStale,
  fromCopy,
  planUndo,
  toCopy,
  type StaleRecord,
  type UndoModel,
  type UndoRefusal,
  type UndoStep,
} from "./undoPlan";

const V1 = "/api/assistant/v1";

/** The path a request to undo `requestId` is logged under. */
export const undoPathFor = (requestId: string) => `${V1}/audit/${requestId}/undo`;

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
  return (model === "PantryItem" ? tx.pantryItem : tx.groceryItem) as unknown as Delegate;
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
    for (const model of ["PantryItem", "GroceryItem"] as const) {
      const ids = plan.steps.filter((s) => s.model === model).map((s) => s.recordId);
      if (ids.length === 0) continue;
      for (const row of await delegate(tx, model).findMany({ where: { id: { in: ids } } })) {
        current.set(`${model}:${row.id as string}`, row);
      }
    }
    const stale = findStale(plan.steps, current);
    if (stale.length > 0) throw changedSince(stale);

    const logged: ChangeInput[] = [];
    const done = { restored: 0, removed: 0, recreated: 0 };

    for (const step of plan.steps) {
      const table = delegate(tx, step.model);
      const name = [{ model: step.model, recordId: step.recordId, problem: "changed" as const }];
      const detail = { undoes: requestId, step: step.kind };

      if (step.kind === "restore") {
        const { count } = await table.updateMany({
          where: fromCopy(step.model, step.after!),
          data: withoutId(fromCopy(step.model, step.before!)),
        });
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

    return { result: { undone: requestId, ...done }, changes: logged };
  });
}

/**
 * The columns to re-create a deleted row from. A shopping line whose pantry
 * item (or whose adder) no longer exists comes back with that link empty,
 * the same thing the database does when those rows are deleted.
 */
async function recreateData(tx: Tx, step: UndoStep): Promise<Record<string, unknown>> {
  const data = fromCopy(step.model, step.before!);
  if (step.model === "GroceryItem") {
    const pantryItemId = data.pantryItemId as string | null;
    if (pantryItemId && !(await tx.pantryItem.findUnique({ where: { id: pantryItemId }, select: { id: true } }))) {
      data.pantryItemId = null;
    }
    const addedById = data.addedById as string | null;
    if (addedById && !(await tx.user.findUnique({ where: { id: addedById }, select: { id: true } }))) {
      data.addedById = null;
    }
  }
  return data;
}

/** Which of these requests have been undone (a 2xx undo request exists)? */
export async function undoneRequestIds(requestIds: string[]): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set();
  const rows = await db.assistantRequest.findMany({
    where: { path: { in: requestIds.map(undoPathFor) }, status: { gte: 200, lt: 300 } },
    select: { path: true },
    distinct: ["path"],
  });
  const paths = new Set(rows.map((r) => r.path));
  return new Set(requestIds.filter((id) => paths.has(undoPathFor(id))));
}

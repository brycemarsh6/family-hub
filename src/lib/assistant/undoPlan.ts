// The pure half of the Assistant API's undo: from one logged request and its
// changes, decide whether it can be reversed, and if so what to do to which
// rows. No database, so every refusal is testable. undoWrites.ts runs the plan.
//
// A request's changes each carry full copies of a row (see changeCopy.ts).
// Several changes may touch the same row (two merge-adds onto one line), so
// they are collapsed per row: the earliest `before` and the latest `after`.

import type { GroceryItem, PantryItem } from "@/generated/prisma/client";
import { decodeChangeSummary, type RowCopy } from "./changeCopy";

export const UNDO_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type UndoModel = "PantryItem" | "GroceryItem";

type ColumnKind = "date" | "value";

/**
 * Every column of each model we may restore, and which of them are dates.
 * Typed over the generated Prisma rows, so a column added to the schema stops
 * `tsc` here until it is classified (otherwise undo would silently skip it).
 */
const PANTRY_COLUMNS: Record<keyof PantryItem, ColumnKind> = {
  id: "value", name: "value", location: "value", quantity: "value", unit: "value",
  category: "value", lowThreshold: "value", expiresAt: "date", restockedAt: "date",
  createdAt: "date", updatedAt: "date",
};

const GROCERY_COLUMNS: Record<keyof GroceryItem, ColumnKind> = {
  id: "value", name: "value", quantity: "value", unit: "value", category: "value",
  checked: "value", addedBy: "value", note: "value", store: "value", addedById: "value",
  location: "value", categoryEdited: "value", pantryItemId: "value", createdAt: "date",
  checkedAt: "date",
};

function describe(kinds: Record<string, ColumnKind>) {
  const columns = Object.keys(kinds);
  return { columns, dates: columns.filter((c) => kinds[c] === "date") };
}

const MODELS: Record<UndoModel, { columns: readonly string[]; dates: readonly string[] }> = {
  PantryItem: describe(PANTRY_COLUMNS),
  GroceryItem: describe(GROCERY_COLUMNS),
};

/** The path a request to undo `requestId` is logged under. */
export const undoPathFor = (requestId: string) => `/api/assistant/v1/audit/${requestId}/undo`;

export function isUndoModel(model: string): model is UndoModel {
  return Object.hasOwn(MODELS, model);
}

export function modelColumns(model: UndoModel): readonly string[] {
  return MODELS[model].columns;
}

export type UndoRequestInput = {
  status: number;
  path: string;
  createdAt: Date;
};

export type UndoChangeInput = {
  model: string;
  recordId: string;
  action: string;
  summary: string;
};

export type UndoRefusal =
  | { ok: false; reason: "failed_request" | "too_old" | "not_undoable" | "already_undone" }
  | { ok: false; reason: "changed_since"; records: StaleRecord[] };

export type StaleRecord = {
  model: string;
  recordId: string;
  problem: "changed" | "missing" | "exists" | "in_use";
};

/** One row to put right. `before`/`after` are the request's own, as JSON. */
export type UndoStep = {
  kind: "restore" | "remove" | "recreate";
  model: UndoModel;
  recordId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export type UndoPlan = { ok: true; steps: UndoStep[] };

const KIND_ORDER = { restore: 0, remove: 1, recreate: 2 } as const;

/** Stable text for comparing two copies. */
function key(copy: RowCopy | undefined): string {
  return JSON.stringify(copy ?? null);
}

function hasAllColumns(model: UndoModel, copy: Record<string, unknown>, recordId: string): boolean {
  return copy.id === recordId && MODELS[model].columns.every((c) => c in copy);
}

type Link = { before: Record<string, unknown> | null; after: Record<string, unknown> | null };

/**
 * Put one row's changes in the order they happened by following the copies:
 * a change comes first when no other change's `after` is its `before` (a
 * null copy, "no row", links nothing). Null
 * when the copies don't form a single chain.
 */
function chain(links: Link[]): Link[] | null {
  if (links.length === 1) return links;
  const remaining = [...links];
  const ordered: Link[] = [];
  while (remaining.length > 0) {
    const heads = remaining.filter((l, i) =>
      remaining.every((o, j) => i === j || l.before === null || key(o.after) !== key(l.before)),
    );
    if (heads.length !== 1) return null;
    ordered.push(heads[0]);
    remaining.splice(remaining.indexOf(heads[0]), 1);
  }
  return ordered;
}

/** Can this request be undone, and with which steps? */
export function planUndo(input: {
  request: UndoRequestInput;
  changes: UndoChangeInput[];
  now: Date;
  undoPath: string;
  /** True when a 2xx request with `undoPath` already exists. */
  alreadyUndone: boolean;
}): UndoPlan | UndoRefusal {
  const { request, changes } = input;
  if (request.status < 200 || request.status > 299) return { ok: false, reason: "failed_request" };
  if (input.now.getTime() - request.createdAt.getTime() > UNDO_WINDOW_MS) {
    return { ok: false, reason: "too_old" };
  }
  if (changes.length === 0) return { ok: false, reason: "not_undoable" };

  const byRecord = new Map<string, { model: UndoModel; recordId: string; links: Link[] }>();
  for (const change of changes) {
    if (!isUndoModel(change.model)) return { ok: false, reason: "not_undoable" };
    const decoded = decodeChangeSummary(change.summary);
    if (decoded.version !== 2 || decoded.before === undefined || decoded.after === undefined) {
      return { ok: false, reason: "not_undoable" };
    }
    for (const copy of [decoded.before, decoded.after]) {
      if (copy !== null && !hasAllColumns(change.model, copy, change.recordId)) {
        return { ok: false, reason: "not_undoable" };
      }
    }
    const k = `${change.model}:${change.recordId}`;
    const entry = byRecord.get(k) ?? { model: change.model, recordId: change.recordId, links: [] };
    entry.links.push({ before: decoded.before, after: decoded.after });
    byRecord.set(k, entry);
  }

  if (input.alreadyUndone) return { ok: false, reason: "already_undone" };

  const steps: UndoStep[] = [];
  for (const { model, recordId, links } of byRecord.values()) {
    const ordered = chain(links);
    if (!ordered) return { ok: false, reason: "not_undoable" };
    const before = ordered[0].before;
    const after = ordered[ordered.length - 1].after;
    if (before === null && after === null) continue; // made and removed inside the request
    const kind = before === null ? "remove" : after === null ? "recreate" : "restore";
    steps.push({ kind, model, recordId, before, after });
  }
  if (steps.length === 0) return { ok: false, reason: "not_undoable" };

  // Restores first, then deletes, then re-creates; ids sorted inside each so
  // every undo touches rows in the same order.
  steps.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.model.localeCompare(b.model) ||
      a.recordId.localeCompare(b.recordId),
  );
  return { ok: true, steps };
}

/** A database row as the JSON copy would have stored it (Dates as ISO). */
export function toCopy(model: UndoModel, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of MODELS[model].columns) {
    const value = row[column];
    out[column] = value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return out;
}

/** Column by column, so the order of keys in a stored copy never matters. */
export function sameCopy(
  model: UndoModel,
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null,
): boolean {
  if (a === null || b === null) return a === b;
  return MODELS[model].columns.every((c) => (a[c] ?? null) === (b[c] ?? null));
}

/** The columns of a copy as values Prisma writes (date strings to Dates). */
export function fromCopy(model: UndoModel, copy: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const column of MODELS[model].columns) {
    const value = copy[column] ?? null;
    out[column] = MODELS[model].dates.includes(column) && typeof value === "string" ? new Date(value) : value;
  }
  return out;
}

/**
 * Compare the rows as they are now with what each step expects, and name
 * every row that no longer matches. `current` maps "Model:id" to the row, or
 * leaves it out when the row does not exist. A re-created row only has
 * to find its id unused.
 */
export function findStale(
  steps: UndoStep[],
  current: Map<string, Record<string, unknown>>,
): StaleRecord[] {
  const stale: StaleRecord[] = [];
  for (const step of steps) {
    const row = current.get(`${step.model}:${step.recordId}`);
    const name = { model: step.model, recordId: step.recordId };
    if (step.kind === "recreate") {
      if (row) stale.push({ ...name, problem: "exists" });
    } else if (!row) {
      stale.push({ ...name, problem: "missing" });
    } else if (!sameCopy(step.model, toCopy(step.model, row), step.after)) {
      stale.push({ ...name, problem: "changed" });
    }
  }
  return stale;
}

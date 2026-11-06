import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import {
  UNDO_WINDOW_MS,
  findStale,
  fromCopy,
  planUndo,
  toCopy,
  type UndoChangeInput,
  type UndoStep,
} from "@/lib/assistant/undoPlan";

const NOW = new Date("2026-11-06T12:00:00.000Z");
const UNDO_PATH = "/api/assistant/v1/audit/req1/undo";
const T = "2026-11-06T10:00:00.000Z";

function grocery(id: string, over: Record<string, unknown> = {}) {
  return {
    id, name: "ZZZ", quantity: 1, unit: null, category: "Other", checked: false, addedBy: null,
    note: null, store: null, addedById: null, location: null, categoryEdited: false,
    pantryItemId: null, createdAt: T, checkedAt: null, ...over,
  };
}

function pantry(id: string, over: Record<string, unknown> = {}) {
  return {
    id, name: "ZZZ", location: "Pantry", quantity: 1, unit: null, category: "Other",
    lowThreshold: 1, expiresAt: null, restockedAt: T, createdAt: T, updatedAt: T, ...over,
  };
}

function change(
  model: string,
  recordId: string,
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): UndoChangeInput {
  return { model, recordId, action, summary: encodeChangeSummary({ detail: {}, before, after }) };
}

function plan(changes: UndoChangeInput[], over: Partial<Parameters<typeof planUndo>[0]> = {}) {
  return planUndo({
    request: { status: 200, path: "/x", createdAt: new Date(NOW.getTime() - 1000) },
    changes,
    now: NOW,
    undoPath: UNDO_PATH,
    alreadyUndone: false,
    ...over,
  });
}

test("undoPlan: an edit restores, a create removes, a delete re-creates", () => {
  const result = plan([
    change("GroceryItem", "e", "update", grocery("e", { quantity: 1 }), grocery("e", { quantity: 2 })),
    change("GroceryItem", "c", "create", null, grocery("c")),
    change("GroceryItem", "d", "delete", grocery("d"), null),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => [s.kind, s.recordId]), [
    ["restore", "e"],
    ["remove", "c"],
    ["recreate", "d"],
  ]);
});

test("undoPlan: collapse takes the earliest before and the latest after, whatever order they arrive", () => {
  const a = change("GroceryItem", "g", "update", grocery("g", { quantity: 1 }), grocery("g", { quantity: 2 }));
  const b = change("GroceryItem", "g", "update", grocery("g", { quantity: 2 }), grocery("g", { quantity: 3 }));
  for (const changes of [[a, b], [b, a]]) {
    const result = plan(changes);
    assert.ok(result.ok);
    assert.equal(result.steps.length, 1);
    assert.equal(result.steps[0].before?.quantity, 1);
    assert.equal(result.steps[0].after?.quantity, 3);
  }
});

test("undoPlan: created then merged into inside one request is still one removal", () => {
  const result = plan([
    change("GroceryItem", "g", "update", grocery("g", { quantity: 1 }), grocery("g", { quantity: 2 })),
    change("GroceryItem", "g", "create", null, grocery("g", { quantity: 1 })),
  ]);
  assert.ok(result.ok);
  assert.equal(result.steps[0].kind, "remove");
  assert.equal(result.steps[0].after?.quantity, 2);
});

test("undoPlan: a row made and removed inside the request needs no step", () => {
  const result = plan([
    change("GroceryItem", "g", "create", null, grocery("g")),
    change("GroceryItem", "g", "delete", grocery("g"), null),
    change("GroceryItem", "h", "create", null, grocery("h")),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => s.recordId), ["h"]);
});

test("undoPlan: steps run restores, then deletes, then re-creates, ids sorted", () => {
  const result = plan([
    change("GroceryItem", "z", "delete", grocery("z"), null),
    change("PantryItem", "p2", "create", null, pantry("p2")),
    change("PantryItem", "p1", "update", pantry("p1"), pantry("p1", { quantity: 2 })),
    change("GroceryItem", "a", "delete", grocery("a"), null),
    change("GroceryItem", "m", "update", grocery("m"), grocery("m", { checked: true })),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => `${s.kind}:${s.model}:${s.recordId}`), [
    "restore:GroceryItem:m",
    "restore:PantryItem:p1",
    "remove:PantryItem:p2",
    "recreate:GroceryItem:a",
    "recreate:GroceryItem:z",
  ]);
});

test("undoPlan: refuses a failed request (non-2xx)", () => {
  const changes = [change("GroceryItem", "g", "create", null, grocery("g"))];
  for (const status of [0, 199, 300, 409, 500]) {
    const result = plan(changes, { request: { status, path: "/x", createdAt: NOW } });
    assert.deepEqual(result, { ok: false, reason: "failed_request" });
  }
  assert.ok(plan(changes, { request: { status: 201, path: "/x", createdAt: NOW } }).ok);
});

test("undoPlan: refuses a request older than 30 days, allows exactly 30", () => {
  const changes = [change("GroceryItem", "g", "create", null, grocery("g"))];
  const old = new Date(NOW.getTime() - UNDO_WINDOW_MS - 1);
  const edge = new Date(NOW.getTime() - UNDO_WINDOW_MS);
  assert.deepEqual(plan(changes, { request: { status: 200, path: "/x", createdAt: old } }), { ok: false, reason: "too_old" });
  assert.ok(plan(changes, { request: { status: 200, path: "/x", createdAt: edge } }).ok);
});

test("undoPlan: refuses a request that was already undone", () => {
  const changes = [change("GroceryItem", "g", "create", null, grocery("g"))];
  assert.deepEqual(plan(changes, { alreadyUndone: true }), { ok: false, reason: "already_undone" });
});

test("undoPlan: not_undoable for no changes, old-format rows, unknown models, missing or partial copies", () => {
  const good = change("GroceryItem", "g", "create", null, grocery("g"));
  const notUndoable = { ok: false, reason: "not_undoable" };
  assert.deepEqual(plan([]), notUndoable);
  assert.deepEqual(plan([good, { model: "GroceryItem", recordId: "o", action: "update", summary: '{"quantity":2}' }]), notUndoable);
  assert.deepEqual(plan([{ model: "GroceryItem", recordId: "o", action: "update", summary: "not json" }]), notUndoable);
  assert.deepEqual(plan([change("Recipe", "r", "update", { id: "r" }, { id: "r" })]), notUndoable);
  const { createdAt: _c, ...partial } = grocery("g");
  void _c;
  assert.deepEqual(plan([change("GroceryItem", "g", "create", null, partial)]), notUndoable);
  assert.deepEqual(plan([change("GroceryItem", "g", "create", null, grocery("other"))]), notUndoable);
  const noKeys = { model: "GroceryItem", recordId: "g", action: "update", summary: '{"v":2,"detail":1}' };
  assert.deepEqual(plan([{ ...noKeys, summary: '{"v":2,"detail":1,"after":null}' }]), { ok: false, reason: "not_undoable" });
});

test("undoPlan: copies that do not form one chain are not undoable", () => {
  const result = plan([
    change("GroceryItem", "g", "update", grocery("g", { quantity: 1 }), grocery("g", { quantity: 2 })),
    change("GroceryItem", "g", "update", grocery("g", { quantity: 5 }), grocery("g", { quantity: 6 })),
  ]);
  assert.deepEqual(result, { ok: false, reason: "not_undoable" });
});

test("undoPlan: one change with a request-wide problem is enough to refuse the whole request", () => {
  const result = plan([
    change("GroceryItem", "g", "create", null, grocery("g")),
    change("Recipe", "r", "create", null, { id: "r" }),
  ]);
  assert.deepEqual(result, { ok: false, reason: "not_undoable" });
});

test("undoPlan: toCopy and fromCopy round trip a row, dates as ISO", () => {
  const row = { ...pantry("p"), expiresAt: new Date("2026-12-01T07:00:00.000Z"), extra: 1 };
  const copy = toCopy("PantryItem", row);
  assert.equal(copy.expiresAt, "2026-12-01T07:00:00.000Z");
  assert.equal("extra" in copy, false);
  const back = fromCopy("PantryItem", copy);
  assert.ok(back.expiresAt instanceof Date);
  assert.equal((back.updatedAt as Date).toISOString(), T);
  assert.equal(back.unit, null);
});

test("undoPlan: findStale names changed, missing and already-existing rows", () => {
  const steps: UndoStep[] = [
    { kind: "restore", model: "GroceryItem", recordId: "same", before: grocery("same"), after: grocery("same", { quantity: 2 }) },
    { kind: "restore", model: "GroceryItem", recordId: "moved", before: grocery("moved"), after: grocery("moved", { quantity: 2 }) },
    { kind: "remove", model: "GroceryItem", recordId: "gone", before: null, after: grocery("gone") },
    { kind: "recreate", model: "GroceryItem", recordId: "back", before: grocery("back"), after: null },
    { kind: "recreate", model: "GroceryItem", recordId: "free", before: grocery("free"), after: null },
  ];
  const rows = (id: string, over: Record<string, unknown> = {}) => {
    const g = grocery(id, over);
    return { ...g, createdAt: new Date(g.createdAt), checkedAt: null };
  };
  const current = new Map<string, Record<string, unknown>>([
    ["GroceryItem:same", rows("same", { quantity: 2 })],
    ["GroceryItem:moved", rows("moved", { quantity: 9 })],
    ["GroceryItem:back", rows("back")],
  ]);
  assert.deepEqual(findStale(steps, current), [
    { model: "GroceryItem", recordId: "moved", problem: "changed" },
    { model: "GroceryItem", recordId: "gone", problem: "missing" },
    { model: "GroceryItem", recordId: "back", problem: "exists" },
  ]);
});

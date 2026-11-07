import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import {
  UNDO_WINDOW_MS,
  findStale,
  fromCopy,
  modelColumns,
  planUndo,
  referenceChecks,
  toCopy,
  undoPathFor,
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

function recipe(id: string, over: Record<string, unknown> = {}) {
  return {
    id, title: "ZZZ", ingredients: "a", steps: "b", servings: null, prepTime: null, cookTime: null,
    sourceUrl: null, notes: null, shareToken: null, rating: null, lastCookedAt: null,
    nutritionCalories: null, nutritionProteinG: null, nutritionCarbsG: null, nutritionFatG: null,
    nutritionServings: null, nutritionFingerprint: null, createdAt: T, updatedAt: T, ...over,
  };
}

const tag = (id: string) => ({ id, name: `ZZZ ${id}`, createdAt: T });
const recipeTag = (id: string, recipeId: string, tagId: string) => ({ id, recipeId, tagId });
const cookbookRecipe = (id: string, recipeId: string) => ({ id, cookbookId: "cb", recipeId, addedAt: T });
const mealPlan = (id: string) => ({ id, weekStart: "2030-01-06T07:00:00.000Z", createdAt: T });
const entry = (id: string, mealPlanId: string, over: Record<string, unknown> = {}) => ({
  id, mealPlanId, dayOffset: 0, slot: "Dinner", title: "ZZZ", recipeId: null, createdAt: T, updatedAt: T, ...over,
});

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

test("undoPlan: a created recipe with its tags and cookbook link removes children before parents", () => {
  const result = plan([
    change("Recipe", "r", "create", null, recipe("r")),
    change("Tag", "t", "create", null, tag("t")),
    change("RecipeTag", "rt", "create", null, recipeTag("rt", "r", "t")),
    change("CookbookRecipe", "cr", "create", null, cookbookRecipe("cr", "r")),
    change("MealPlan", "mp", "create", null, mealPlan("mp")),
    change("MealPlanEntry", "e", "create", null, entry("e", "mp", { recipeId: "r" })),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => `${s.kind}:${s.model}`), [
    "remove:CookbookRecipe",
    "remove:MealPlanEntry",
    "remove:RecipeTag",
    "remove:MealPlan",
    "remove:Recipe",
    "remove:Tag",
  ]);
});

test("undoPlan: deleted recipe, tag, plan and their links re-create parents first", () => {
  const result = plan([
    change("RecipeTag", "rt", "delete", recipeTag("rt", "r", "t"), null),
    change("MealPlanEntry", "e", "delete", entry("e", "mp", { recipeId: "r" }), null),
    change("Recipe", "r", "delete", recipe("r"), null),
    change("MealPlan", "mp", "delete", mealPlan("mp"), null),
    change("Tag", "t", "delete", tag("t"), null),
    change("GroceryItem", "g", "delete", grocery("g", { pantryItemId: "p" }), null),
    change("PantryItem", "p", "delete", pantry("p"), null),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => `${s.kind}:${s.model}`), [
    "recreate:MealPlan",
    "recreate:PantryItem",
    "recreate:Recipe",
    "recreate:Tag",
    "recreate:GroceryItem",
    "recreate:MealPlanEntry",
    "recreate:RecipeTag",
  ]);
});

test("undoPlan: restores come first for the new models too, then removes, then re-creates", () => {
  const result = plan([
    change("Tag", "t", "create", null, tag("t")),
    change("Recipe", "r", "update", recipe("r"), recipe("r", { rating: 5 })),
    change("MealPlanEntry", "e", "update", entry("e", "mp"), entry("e", "mp", { title: "ZZZ 2" })),
    change("CookbookRecipe", "cr", "delete", cookbookRecipe("cr", "r"), null),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(result.steps.map((s) => `${s.kind}:${s.model}`), [
    "restore:MealPlanEntry",
    "restore:Recipe",
    "remove:Tag",
    "recreate:CookbookRecipe",
  ]);
});

test("referenceChecks: a removed parent is checked against each kind of row that points at it", () => {
  const result = plan([
    change("Recipe", "r", "create", null, recipe("r")),
    change("Tag", "t", "create", null, tag("t")),
    change("MealPlan", "mp", "create", null, mealPlan("mp")),
    change("PantryItem", "p", "create", null, pantry("p")),
  ]);
  assert.ok(result.ok);
  const checks = referenceChecks(result.steps).map((c) => `${c.model}:${c.recordId}:${c.ref.child}.${c.ref.column}`);
  assert.deepEqual(checks, [
    "MealPlan:mp:MealPlanEntry.mealPlanId",
    "PantryItem:p:GroceryItem.pantryItemId",
    "PantryItem:p:VoiceChange.pantryItemId",
    "Recipe:r:RecipeTag.recipeId",
    "Recipe:r:CookbookRecipe.recipeId",
    "Recipe:r:MealPlanEntry.recipeId",
    "Tag:t:RecipeTag.tagId",
  ]);
  assert.ok(referenceChecks(result.steps).every((c) => c.exclude.length === 0));
});

test("referenceChecks: rows this plan removes itself are left out of the count", () => {
  const result = plan([
    change("Recipe", "r", "create", null, recipe("r")),
    change("Tag", "t", "create", null, tag("t")),
    change("RecipeTag", "rt", "create", null, recipeTag("rt", "r", "t")),
    change("MealPlan", "mp", "create", null, mealPlan("mp")),
    change("MealPlanEntry", "e1", "create", null, entry("e1", "mp", { recipeId: "r" })),
    change("MealPlanEntry", "e2", "create", null, entry("e2", "mp", { dayOffset: 1, recipeId: "r" })),
    change("PantryItem", "p", "create", null, pantry("p")),
    change("GroceryItem", "g", "create", null, grocery("g", { pantryItemId: "p" })),
  ]);
  assert.ok(result.ok);
  const excluded = (model: string, child: string) =>
    referenceChecks(result.steps).find((c) => c.model === model && c.ref.child === child)?.exclude;
  assert.deepEqual(excluded("Recipe", "RecipeTag"), ["rt"]);
  assert.deepEqual(excluded("Tag", "RecipeTag"), ["rt"]);
  assert.deepEqual(excluded("Recipe", "MealPlanEntry")?.sort(), ["e1", "e2"]);
  assert.deepEqual(excluded("MealPlan", "MealPlanEntry")?.sort(), ["e1", "e2"]);
  assert.deepEqual(excluded("Recipe", "CookbookRecipe"), []);
  assert.deepEqual(excluded("PantryItem", "GroceryItem"), ["g"]);
  assert.deepEqual(excluded("PantryItem", "VoiceChange"), []);
});

test("referenceChecks: only removes are checked, not restores or re-creates", () => {
  const result = plan([
    change("Recipe", "r", "update", recipe("r"), recipe("r", { rating: 2 })),
    change("Tag", "t", "delete", tag("t"), null),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(referenceChecks(result.steps), []);
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
  assert.deepEqual(plan([change("Cookbook", "c", "create", null, { id: "c" })]), notUndoable);
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

test("column lists come from the schema types, dates included", () => {
  assert.equal(modelColumns("PantryItem").length, 11);
  assert.equal(modelColumns("GroceryItem").length, 15);
  assert.deepEqual(
    [
      modelColumns("Recipe").length, modelColumns("Tag").length, modelColumns("RecipeTag").length,
      modelColumns("CookbookRecipe").length, modelColumns("MealPlan").length,
      modelColumns("MealPlanEntry").length,
    ],
    [20, 3, 3, 4, 3, 8],
  );
  const r = fromCopy("Recipe", recipe("r", { lastCookedAt: "2026-11-01T00:00:00.000Z" }));
  assert.ok(r.lastCookedAt instanceof Date && r.updatedAt instanceof Date);
  assert.equal(r.shareToken, null);
  assert.ok(fromCopy("MealPlan", mealPlan("mp")).weekStart instanceof Date);
  assert.ok(fromCopy("CookbookRecipe", cookbookRecipe("cr", "r")).addedAt instanceof Date);
  const copy = fromCopy("GroceryItem", grocery("g"));
  assert.ok(copy.createdAt instanceof Date);
  assert.equal(copy.checkedAt, null);
});

test("undoPathFor is the path an undo request is logged under", () => {
  assert.equal(undoPathFor("req1"), UNDO_PATH);
});

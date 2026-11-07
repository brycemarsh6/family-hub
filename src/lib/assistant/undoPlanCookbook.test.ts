import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import {
  fromCopy,
  modelColumns,
  planUndo,
  referenceChecks,
  type UndoChangeInput,
} from "@/lib/assistant/undoPlan";

// Cookbooks as undo parents (mission 45). The general rules are in undoPlan.test.ts.

const NOW = new Date("2026-11-06T12:00:00.000Z");
const T = "2026-11-06T10:00:00.000Z";

const cookbook = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: "ZZZ Cookbook", shareToken: null, createdAt: T, updatedAt: T, ...over,
});
const filing = (id: string, cookbookId: string, recipeId: string) => ({
  id, cookbookId, recipeId, addedAt: T,
});
const recipe = (id: string) => ({
  id, title: "ZZZ", ingredients: "a", steps: "b", servings: null, prepTime: null, cookTime: null,
  sourceUrl: null, notes: null, shareToken: null, rating: null, lastCookedAt: null,
  nutritionCalories: null, nutritionProteinG: null, nutritionCarbsG: null, nutritionFatG: null,
  nutritionServings: null, nutritionFingerprint: null, createdAt: T, updatedAt: T,
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

function plan(changes: UndoChangeInput[]) {
  return planUndo({
    request: { status: 200, path: "/x", createdAt: new Date(NOW.getTime() - 1000) },
    changes,
    now: NOW,
    undoPath: "/api/assistant/v1/audit/req1/undo",
    alreadyUndone: false,
  });
}

test("undo cookbook: undoing a create that also filed recipes removes the filings first", () => {
  const result = plan([
    change("Cookbook", "cb", "create", null, cookbook("cb")),
    change("CookbookRecipe", "f1", "create", null, filing("f1", "cb", "r1")),
    change("CookbookRecipe", "f2", "create", null, filing("f2", "cb", "r2")),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(
    result.steps.map((s) => `${s.kind}:${s.model}:${s.recordId}`),
    ["remove:CookbookRecipe:f1", "remove:CookbookRecipe:f2", "remove:Cookbook:cb"],
  );
});

test("undo cookbook: undoing a delete re-creates the cookbook before its filings", () => {
  const result = plan([
    change("CookbookRecipe", "f1", "delete", filing("f1", "cb", "r1"), null),
    change("Cookbook", "cb", "delete", cookbook("cb", { shareToken: "tok" }), null),
    change("CookbookRecipe", "f2", "delete", filing("f2", "cb", "r2"), null),
  ]);
  assert.ok(result.ok);
  assert.deepEqual(
    result.steps.map((s) => `${s.kind}:${s.model}:${s.recordId}`),
    ["recreate:Cookbook:cb", "recreate:CookbookRecipe:f1", "recreate:CookbookRecipe:f2"],
  );
});

test("undo cookbook: a rename and a share token restore the row in place", () => {
  const renamed = plan([
    change("Cookbook", "cb", "update", cookbook("cb", { title: "Old" }), cookbook("cb", { title: "New" })),
  ]);
  assert.ok(renamed.ok);
  assert.equal(renamed.steps.length, 1);
  assert.equal(renamed.steps[0].kind, "restore");
  assert.equal((renamed.steps[0].before as { title: string }).title, "Old");

  const shared = plan([
    change("Cookbook", "cb", "update", cookbook("cb"), cookbook("cb", { shareToken: "tok" })),
  ]);
  assert.ok(shared.ok);
  assert.equal(shared.steps[0].kind, "restore");
  assert.equal((shared.steps[0].before as { shareToken: unknown }).shareToken, null);
  assert.deepEqual(referenceChecks(shared.steps), []);
});

test("undo cookbook: in_use ignores filings the same plan removes", () => {
  const withFilings = plan([
    change("Cookbook", "cb", "create", null, cookbook("cb")),
    change("CookbookRecipe", "f1", "create", null, filing("f1", "cb", "r1")),
    change("CookbookRecipe", "f2", "create", null, filing("f2", "cb", "r2")),
  ]);
  assert.ok(withFilings.ok);
  const [check, ...rest] = referenceChecks(withFilings.steps).filter((c) => c.model === "Cookbook");
  assert.equal(rest.length, 0);
  assert.deepEqual(check.ref, { child: "CookbookRecipe", column: "cookbookId" });
  assert.deepEqual(check.exclude.sort(), ["f1", "f2"]);

  // A cookbook created alone: any filing the family added since still counts.
  const alone = plan([change("Cookbook", "cb", "create", null, cookbook("cb"))]);
  assert.ok(alone.ok);
  assert.deepEqual(referenceChecks(alone.steps).map((c) => c.exclude), [[]]);
});

test("undo cookbook: a partial cookbook copy is not undoable, and columns and dates are classified", () => {
  assert.deepEqual(plan([change("Cookbook", "cb", "create", null, { id: "cb" })]), { ok: false, reason: "not_undoable" });
  assert.equal(modelColumns("Cookbook").length, 5);
  const back = fromCopy("Cookbook", cookbook("cb"));
  assert.ok(back.createdAt instanceof Date && back.updatedAt instanceof Date);
  assert.equal(back.shareToken, null);
  // A filing may point at a recipe the same request created: still one removal each.
  assert.ok(plan([change("Recipe", "r1", "create", null, recipe("r1"))]).ok);
});

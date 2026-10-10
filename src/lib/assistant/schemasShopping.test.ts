import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkOffBody,
  fromLowInventoryBody,
  putAwayBody,
  shoppingAddBody,
  shoppingListQuery,
  shoppingPatchBody,
} from "./schemasShopping";

const ok = (r: { success: boolean }) => r.success;

test("shoppingListQuery: store, none, checked coercion, strictness", () => {
  assert.equal(shoppingListQuery.parse({ checked: "true" }).checked, true);
  assert.equal(shoppingListQuery.parse({ checked: "false" }).checked, false);
  assert.ok(ok(shoppingListQuery.safeParse({ store: "Costco" })));
  assert.ok(ok(shoppingListQuery.safeParse({ store: "none" })));
  assert.ok(!ok(shoppingListQuery.safeParse({ store: "Aldi" })));
  assert.ok(!ok(shoppingListQuery.safeParse({ checked: "yes" })));
  assert.ok(!ok(shoppingListQuery.safeParse({ stor: "Costco" })));
});

test("shoppingAddBody: defaults, bounds, one-or-array, strictness", () => {
  const one = shoppingAddBody.parse({ name: "  Milk " });
  assert.ok(!Array.isArray(one));
  if (!Array.isArray(one)) {
    assert.equal(one.name, "Milk");
    assert.equal(one.quantity, 1);
    assert.equal(one.merge, true);
  }
  assert.ok(ok(shoppingAddBody.safeParse([{ name: "a" }, { name: "b", store: null }])));
  assert.ok(!ok(shoppingAddBody.safeParse([])));
  assert.ok(ok(shoppingAddBody.safeParse(Array.from({ length: 50 }, () => ({ name: "a" })))));
  assert.ok(!ok(shoppingAddBody.safeParse(Array.from({ length: 51 }, () => ({ name: "a" })))));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", quantity: 0 })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", quantity: 10001 })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "a".repeat(121) })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", note: "n".repeat(201) })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", unit: "u".repeat(31) })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", category: "Nope" })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", store: "Aldi" })));
  assert.ok(!ok(shoppingAddBody.safeParse({ name: "x", extra: 1 })));
});

test("shoppingPatchBody: needs a key, nullable fields, strictness", () => {
  assert.ok(!ok(shoppingPatchBody.safeParse({})));
  assert.ok(ok(shoppingPatchBody.safeParse({ location: null, store: null, note: null, unit: null })));
  assert.ok(ok(shoppingPatchBody.safeParse({ checked: true })));
  assert.ok(!ok(shoppingPatchBody.safeParse({ location: "Garage" })));
  assert.ok(!ok(shoppingPatchBody.safeParse({ quantity: -1 })));
  assert.ok(!ok(shoppingPatchBody.safeParse({ id: "x", name: "y" })));
});

test("checkOffBody: 1-100 unique ids, checked defaults true", () => {
  assert.equal(checkOffBody.parse({ ids: ["a"] }).checked, true);
  assert.equal(checkOffBody.parse({ ids: ["a"], checked: false }).checked, false);
  assert.ok(!ok(checkOffBody.safeParse({ ids: [] })));
  assert.ok(!ok(checkOffBody.safeParse({ ids: ["a", "a"] })));
  assert.ok(ok(checkOffBody.safeParse({ ids: Array.from({ length: 100 }, (_, i) => `i${i}`) })));
  assert.ok(!ok(checkOffBody.safeParse({ ids: Array.from({ length: 101 }, (_, i) => `i${i}`) })));
});

test("putAwayBody: both decision shapes, defaults, strictness", () => {
  assert.equal(putAwayBody.parse({}).acceptDefaults, false);
  assert.ok(ok(putAwayBody.safeParse({ decisions: [{ groceryItemId: "g", type: "merge", pantryItemId: "p", quantity: 2 }] })));
  const create = {
    groceryItemId: "g", type: "create", name: "Peas", quantity: 1, unit: null, category: "Produce", location: "Freezer",
  };
  assert.ok(ok(putAwayBody.safeParse({ decisions: [create] })));
  assert.ok(!ok(putAwayBody.safeParse({ decisions: [{ ...create, location: "Garage" }] })));
  assert.ok(!ok(putAwayBody.safeParse({ decisions: [{ ...create, extra: 1 }] })));
  assert.ok(!ok(putAwayBody.safeParse({ decisions: [{ groceryItemId: "g", type: "merge", quantity: 1 }] })));
  assert.ok(!ok(putAwayBody.safeParse({ decisions: [{ ...create, type: "delete" }] })));
  assert.ok(!ok(putAwayBody.safeParse({ acceptdefaults: true })));
});

test("fromLowInventoryBody: optional nullable store", () => {
  assert.ok(ok(fromLowInventoryBody.safeParse({})));
  assert.ok(ok(fromLowInventoryBody.safeParse({ store: null })));
  assert.ok(ok(fromLowInventoryBody.safeParse({ store: "Target" })));
  assert.ok(!ok(fromLowInventoryBody.safeParse({ store: "Aldi" })));
  assert.ok(!ok(fromLowInventoryBody.safeParse({ stores: "Target" })));
});

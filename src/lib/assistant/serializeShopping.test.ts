import { test } from "node:test";
import assert from "node:assert/strict";
import { toPutAwayClassification, toPutAwayReport, toShoppingItem } from "./serializeShopping";

const row = {
  id: "g1",
  name: "Milk",
  quantity: 2,
  unit: null,
  category: "Dairy Products",
  store: "Costco",
  checked: true,
  checkedAt: new Date("2026-10-09T12:00:00Z"),
  note: null,
  location: null,
  pantryItemId: "p1",
  createdAt: new Date("2026-10-01T12:00:00Z"),
  // Columns that must never reach the wire:
  addedById: "user-secret",
  categoryEdited: true,
};

test("toShoppingItem: exact key set, no raw addedById, ISO dates", () => {
  const out = toShoppingItem(row, { addedByName: "Emily", createdByAssistant: false });
  assert.deepEqual(Object.keys(out).sort(), [
    "addedBy", "category", "checked", "checkedAt", "createdAt", "fromInventoryId",
    "id", "location", "name", "note", "quantity", "store", "unit",
  ]);
  assert.equal(out.fromInventoryId, "p1");
  assert.equal(out.checkedAt, "2026-10-09T12:00:00.000Z");
  assert.ok(!JSON.stringify(out).includes("user-secret"));
});

test("toShoppingItem: addedBy variants", () => {
  assert.deepEqual(toShoppingItem(row, { addedByName: "Emily", createdByAssistant: false }).addedBy, { kind: "person", name: "Emily" });
  assert.deepEqual(toShoppingItem(row, { addedByName: null, createdByAssistant: true }).addedBy, { kind: "assistant" });
  assert.equal(toShoppingItem(row, { addedByName: null, createdByAssistant: false }).addedBy, null);
  assert.equal(toShoppingItem({ ...row, checkedAt: null }, { addedByName: null, createdByAssistant: false }).checkedAt, null);
});

test("toPutAwayClassification: field-by-field, suggestions renamed", () => {
  const out = toPutAwayClassification({
    knownCount: 3,
    newItems: [{
      groceryItemId: "g", name: "Peas", quantity: 1, unit: null, category: "Produce", location: "Other",
      suggestions: [{ pantryItemId: "p", name: "Frozen peas", quantity: 2, unit: "bags", location: "Freezer" }],
      secret: "x",
    } as never],
  });
  assert.equal(out.knownCount, 3);
  assert.deepEqual(Object.keys(out.newItems[0]).sort(), ["category", "groceryItemId", "location", "name", "quantity", "suggestions", "unit"]);
  assert.deepEqual(Object.keys(out.newItems[0].suggestions[0]).sort(), ["inventoryId", "location", "name", "quantity", "unit"]);
});

test("toPutAwayReport: counts and key set", () => {
  const out = toPutAwayReport({
    entries: [{ groceryItemId: "g", name: "Peas", action: "created", pantryItemId: "p", quantityAdded: 1, location: "Other" }],
  });
  assert.equal(out.putAway, 1);
  assert.deepEqual(Object.keys(out.items[0]).sort(), ["action", "groceryItemId", "inventoryId", "location", "name", "quantityAdded"]);
});

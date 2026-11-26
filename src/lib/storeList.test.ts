import { test } from "node:test";
import assert from "node:assert/strict";
import { STORES, toStore } from "./constants";
import {
  MAX_STORES,
  addStore,
  removeStore,
  renameInList,
  reorderStores,
  parseStoreList,
  serializeStoreList,
  storeFilterOptions,
} from "./storeList";

test("parseStoreList: null, empty and blank text fall back to the built-in list", () => {
  assert.deepEqual(parseStoreList(null), [...STORES]);
  assert.deepEqual(parseStoreList(undefined), [...STORES]);
  assert.deepEqual(parseStoreList(""), [...STORES]);
  assert.deepEqual(parseStoreList("  \n "), [...STORES]);
});

test("parseStoreList: keeps order and always ends with Other", () => {
  assert.deepEqual(parseStoreList("Aldi\nKroger"), ["Aldi", "Kroger", "Other"]);
});

test("parseStoreList: trims and collapses inner spaces", () => {
  assert.deepEqual(parseStoreList("  Trader   Joes \n\n"), ["Trader Joes", "Other"]);
});

test("parseStoreList: cuts a name at 24 characters", () => {
  const [name] = parseStoreList("A".repeat(40));
  assert.equal(name, "A".repeat(24));
});

test("parseStoreList: drops repeats in any case, first one wins", () => {
  assert.deepEqual(parseStoreList("Aldi\nALDI\naldi\nKroger"), ["Aldi", "Kroger", "Other"]);
});

test("parseStoreList: Other is forced last and never doubled", () => {
  assert.deepEqual(parseStoreList("other\nAldi\nOTHER"), ["Aldi", "Other"]);
});

test("parseStoreList: caps at 12 with Other still last", () => {
  const text = Array.from({ length: 15 }, (_, i) => `Store ${i + 1}`).join("\n");
  const list = parseStoreList(text);
  assert.equal(list.length, MAX_STORES);
  assert.equal(list[0], "Store 1");
  assert.equal(list[10], "Store 11");
  assert.equal(list[11], "Other");
});

test("serializeStoreList: cleans and joins with newlines", () => {
  assert.equal(serializeStoreList([" Aldi ", "aldi", "Other", "Kroger"]), "Aldi\nKroger");
});

test("storeFilterOptions: keeps a removed store while an item uses it, ignores null", () => {
  assert.deepEqual(
    storeFilterOptions(["Aldi", "Other"], ["Costco", null, "Aldi", "Costco", "Target"]),
    ["Aldi", "Other", "Costco", "Target"],
  );
});

test("toStore: built-in list by default, a given list when passed", () => {
  assert.equal(toStore("Costco"), "Costco");
  assert.equal(toStore("Aldi"), null);
  assert.equal(toStore("Aldi", ["Aldi", "Other"]), "Aldi");
  assert.equal(toStore("Costco", ["Aldi", "Other"]), null);
  assert.equal(toStore(42), null);
});

const BASE = ["Aldi", "Kroger", "Other"];

function stores(edit: ReturnType<typeof addStore>): string[] {
  assert.equal(edit.ok, true);
  return edit.ok ? edit.stores : [];
}

function error(edit: ReturnType<typeof addStore>): string {
  assert.equal(edit.ok, false);
  return edit.ok ? "" : edit.error;
}

test("addStore: goes before Other, trimmed and cut to 24 letters", () => {
  assert.deepEqual(stores(addStore(BASE, "  Trader   Joes ")), ["Aldi", "Kroger", "Trader Joes", "Other"]);
  assert.equal(stores(addStore(BASE, "x".repeat(40)))[2].length, 24);
});

test("addStore: refuses blank, duplicates in any case, and Other", () => {
  assert.equal(error(addStore(BASE, "   ")), "Type a store name first.");
  assert.equal(error(addStore(BASE, "aldi")), "That store is already on the list.");
  assert.equal(error(addStore(BASE, "OTHER")), "That store is already on the list.");
});

test("addStore: refuses a thirteenth store, allows the twelfth", () => {
  const eleven = Array.from({ length: 10 }, (_, i) => `S${i}`);
  const almost = [...eleven, "Other"];
  const full = stores(addStore(almost, "Last"));
  assert.equal(full.length, MAX_STORES);
  assert.equal(full[full.length - 1], "Other");
  assert.equal(error(addStore(full, "One more")), "You can have up to 12 stores.");
});

test("removeStore: removes one, never Other, never an unknown name", () => {
  assert.deepEqual(stores(removeStore(BASE, "Aldi")), ["Kroger", "Other"]);
  assert.equal(error(removeStore(BASE, "Other")), "Other can't be removed.");
  assert.equal(error(removeStore(BASE, "Nope")), "That store isn't on the list.");
});

test("renameInList: renames in place and keeps Other last", () => {
  assert.deepEqual(stores(renameInList(BASE, "Aldi", "Safeway")), ["Safeway", "Kroger", "Other"]);
});

test("renameInList: a capitals-only change is allowed", () => {
  assert.deepEqual(stores(renameInList(BASE, "Aldi", "ALDI")), ["ALDI", "Kroger", "Other"]);
});

test("renameInList: refuses Other, a clash with another store in any case, and blank", () => {
  assert.equal(error(renameInList(BASE, "Other", "Misc")), "Other can't be renamed.");
  assert.equal(error(renameInList(BASE, "Aldi", "kroger")), "That store is already on the list.");
  assert.equal(error(renameInList(BASE, "Aldi", "other")), "That store is already on the list.");
  assert.equal(error(renameInList(BASE, "Aldi", "  ")), "Type a store name first.");
  assert.equal(error(renameInList(BASE, "Nope", "Safeway")), "That store isn't on the list.");
});

test("reorderStores: new order wins and Other stays last", () => {
  assert.deepEqual(stores(reorderStores(BASE, ["Kroger", "Aldi"])), ["Kroger", "Aldi", "Other"]);
  assert.deepEqual(stores(reorderStores(BASE, ["Kroger", "Aldi", "Other"])), ["Kroger", "Aldi", "Other"]);
});

test("reorderStores: refuses a different set, a repeat, or Other moved up", () => {
  const message = "That order doesn't match the stores on the list.";
  assert.equal(error(reorderStores(BASE, ["Kroger"])), message);
  assert.equal(error(reorderStores(BASE, ["Kroger", "Aldi", "Extra"])), message);
  assert.equal(error(reorderStores(BASE, ["Kroger", "Kroger"])), message);
  assert.equal(error(reorderStores(BASE, ["Other", "Kroger", "Aldi"])), message);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { STORES, toStore } from "./constants";
import {
  MAX_STORES,
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

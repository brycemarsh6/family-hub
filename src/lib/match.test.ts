// Tests for match.ts: findExactName only so far (matchItem and searchItems
// are checked against the real inventory by script; see the file's header).

import { test } from "node:test";
import assert from "node:assert/strict";
import { findExactName } from "./match";

const rows = [
  { id: "1", name: "Milk" },
  { id: "2", name: "Kids Favorites" },
  { id: "3", name: "50% Dark chocolate" },
];

test("findExactName: matches ignoring capitals", () => {
  assert.equal(findExactName("milk", rows)?.id, "1");
  assert.equal(findExactName("MILK", rows)?.id, "1");
});

test("findExactName: % and _ are plain characters, not wildcards", () => {
  assert.equal(findExactName("%", rows), undefined);
  assert.equal(findExactName("M_lk", rows), undefined);
  assert.equal(findExactName("Kids_Favorites", rows), undefined);
  assert.equal(findExactName("50% dark chocolate", rows)?.id, "3");
});

test("findExactName: not fuzzy, no partial or padded matches", () => {
  assert.equal(findExactName("Mil", rows), undefined);
  assert.equal(findExactName("Milk ", rows), undefined);
  assert.equal(findExactName("oat milk", rows), undefined);
});

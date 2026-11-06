import { test } from "node:test";
import assert from "node:assert/strict";
import { isExactHouseholdOrder } from "./householdOrder";

const household = ["a", "b", "c"];

test("isExactHouseholdOrder: the exact set passes, in any order", () => {
  assert.equal(isExactHouseholdOrder(["a", "b", "c"], household), true);
  assert.equal(isExactHouseholdOrder(["c", "a", "b"], household), true);
});

test("isExactHouseholdOrder: a missing id fails", () => {
  assert.equal(isExactHouseholdOrder(["a", "b"], household), false);
});

test("isExactHouseholdOrder: an extra id fails", () => {
  assert.equal(isExactHouseholdOrder(["a", "b", "c", "d"], household), false);
});

test("isExactHouseholdOrder: a duplicate fails even at the right length", () => {
  assert.equal(isExactHouseholdOrder(["a", "a", "c"], household), false);
  assert.equal(isExactHouseholdOrder(["a", "b", "c", "c"], household), false);
});

test("isExactHouseholdOrder: a device or deactivated id (not in the household) fails", () => {
  assert.equal(isExactHouseholdOrder(["a", "b", "device-1"], household), false);
});

test("isExactHouseholdOrder: an empty list only matches an empty household", () => {
  assert.equal(isExactHouseholdOrder([], []), true);
  assert.equal(isExactHouseholdOrder([], household), false);
});

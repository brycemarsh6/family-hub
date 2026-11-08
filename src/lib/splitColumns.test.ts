import { test } from "node:test";
import assert from "node:assert/strict";
import { columnCountFor, splitByWeight } from "./splitColumns";

const one = () => 1;
const sizes = (cols: unknown[][]) => cols.map((c) => c.length);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

test("an empty list gives every column empty", () => {
  assert.deepEqual(splitByWeight([], 3, one), [[], [], []]);
});

test("one item lands in column 1 only", () => {
  assert.deepEqual(splitByWeight(["a"], 2, one), [["a"], []]);
  assert.deepEqual(splitByWeight(["a"], 3, one), [["a"], [], []]);
});

test("10 items of weight 1 split 2 ways give 5 and 5", () => {
  assert.deepEqual(sizes(splitByWeight(range(10), 2, one)), [5, 5]);
});

test("10 items of weight 1 split 3 ways differ by at most one", () => {
  const s = sizes(splitByWeight(range(10), 3, one));
  assert.equal(s.reduce((a, b) => a + b, 0), 10);
  assert.ok(Math.max(...s) - Math.min(...s) <= 1, `sizes ${s}`);
});

test("a heavy first item sits alone in column 1", () => {
  const items = [100, 1, 1, 1, 1];
  const cols = splitByWeight(items, 2, (n) => n);
  assert.deepEqual(cols, [[100], [1, 1, 1, 1]]);
});

test("order is preserved across columns", () => {
  for (const n of [2, 3]) {
    const items = range(17);
    const cols = splitByWeight(items, n, (i) => (i % 4) + 1);
    assert.equal(cols.length, n);
    assert.deepEqual(cols.flat(), items);
  }
});

test("weights below 1 count as 1", () => {
  assert.deepEqual(sizes(splitByWeight(range(4), 2, () => 0)), [2, 2]);
});

test("one column returns a copy of the list", () => {
  const items = [1, 2, 3];
  const cols = splitByWeight(items, 1, one);
  assert.equal(cols.length, 1);
  assert.deepEqual(cols[0], items);
});

test("columnCountFor follows the thresholds", () => {
  assert.equal(columnCountFor(0, 3), 1);
  assert.equal(columnCountFor(767, 3), 1);
  assert.equal(columnCountFor(768, 3), 2);
  assert.equal(columnCountFor(1023, 3), 2);
  assert.equal(columnCountFor(1024, 3), 3);
  assert.equal(columnCountFor(1024, 2), 2);
  assert.equal(columnCountFor(1500, 1), 1);
});

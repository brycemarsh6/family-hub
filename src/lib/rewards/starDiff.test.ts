// Pins starDiff.ts: the optimistic move of the star bank on a tap.

import { test } from "node:test";
import assert from "node:assert/strict";
import { shownBanks, starDiff, type StarDiffRow } from "./starDiff";

function row(id: string, stars: number | null | undefined, done: Record<string, boolean>, carriedFrom: unknown | null = null): StarDiffRow {
  return { id, stars, carriedFrom, participants: Object.entries(done).map(([userId, isDone]) => ({ userId, done: isDone })) };
}

test("an Each check pays only that person", () => {
  const server = [row("h", 5, { a: false, b: false })];
  const shown = [row("h", 5, { a: true, b: false })];
  assert.deepEqual(starDiff(server, shown, "full"), { a: 5 });
});

test("a Together check pays every participant", () => {
  const server = [row("h", 3, { a: false, b: false })];
  const shown = [row("h", 3, { a: true, b: true })];
  assert.deepEqual(starDiff(server, shown, "full"), { a: 3, b: 3 });
});

test("a habit held twice counts once", () => {
  const server = [row("h", 10, { a: false, b: false }), row("h", 10, { a: false, b: false })];
  const shown = [row("h", 10, { a: true, b: true }), row("h", 10, { a: true, b: true })];
  assert.deepEqual(starDiff(server, shown, "full"), { a: 10, b: 10 });
});

test("a late check pays full, half rounded up, or nothing", () => {
  const server = [row("h", 5, { a: false }, { day: 1 })];
  const shown = [row("h", 5, { a: true }, { day: 1 })];
  assert.equal(starDiff(server, shown, "full").a, 5);
  assert.equal(starDiff(server, shown, "half").a, 3);
  assert.equal(starDiff(server, shown, "none").a ?? 0, 0);
});

test("an un-check takes the stars back", () => {
  const server = [row("h", 5, { a: true })];
  const shown = [row("h", 5, { a: false })];
  assert.deepEqual(starDiff(server, shown, "full"), { a: -5 });
});

test("a skip pays nothing (done stays false)", () => {
  const server = [row("h", 5, { a: false })];
  const shown = [row("h", 5, { a: false })];
  assert.deepEqual(starDiff(server, shown, "full"), {});
});

test("a habit with no stars pays nothing", () => {
  const server = [row("h", null, { a: false }), row("g", undefined, { a: false })];
  const shown = [row("h", null, { a: true }), row("g", undefined, { a: true })];
  assert.deepEqual(starDiff(server, shown, "full"), {});
});

test("unchanged rows give an empty result", () => {
  const rows = [row("h", 5, { a: true, b: false })];
  assert.deepEqual(starDiff(rows, rows, "full"), {});
});

test("a row the optimistic page dropped is left alone", () => {
  assert.deepEqual(starDiff([row("h", 5, { a: false })], [], "full"), {});
});

test("shownBanks adds the diff to each bank and keeps people the diff does not name", () => {
  assert.deepEqual(shownBanks({ a: 10, b: 3 }, { a: 4 }), { a: 14, b: 3 });
  assert.deepEqual(shownBanks({ a: 10 }, { a: -5, c: 2 }), { a: 5, c: 2 });
  assert.deepEqual(shownBanks({ a: 1 }, {}), { a: 1 });
});

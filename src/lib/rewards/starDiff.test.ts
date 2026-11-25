// Pins starDiff.ts: the optimistic move of the star bank on a tap.

import { test } from "node:test";
import assert from "node:assert/strict";
import { starDiff, type StarDiffRow } from "./starDiff";
import { applyHabitChange, type HabitRowState } from "../habitChanges";

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

test("it fits the real reducer: an Each tap, a Together tap, then an un-check", () => {
  const base = { sharing: "each", viewerId: "a", doneToday: false, skippedToday: false, carriedFrom: null, dueState: "required" };
  type R = HabitRowState & { stars: number };
  const each: R = { ...base, id: "e", stars: 4, participants: [{ userId: "a", done: false, skipped: false }, { userId: "b", done: false, skipped: false }] };
  const together: R = { ...base, id: "t", sharing: "together", stars: 2, participants: [{ userId: "a", done: false, skipped: false }, { userId: "b", done: false, skipped: false }] };
  const server = [each, together];
  let shown = applyHabitChange(server, { type: "check", habitId: "e", userId: "b" });
  shown = applyHabitChange(shown, { type: "check", habitId: "t" });
  assert.deepEqual(starDiff(server, shown, "full"), { b: 6, a: 2 });
  const doneServer = shown;
  const undone = applyHabitChange(doneServer, { type: "uncheck", habitId: "t" });
  assert.deepEqual(starDiff(doneServer, undone, "full"), { a: -2, b: -2 });
});

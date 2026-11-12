// Real unit tests (node:test) for the optimistic task tick, mission 74 F1.
// No React, no database: plain values in, plain values out.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTaskDone, pruneTaskDone, pruneTaskDoneByState } from "./taskDoneOverrides";
import type { CalendarTaskView } from "./types";

const done = new Date("2026-11-11T12:00:00Z");
const task = (id: string, completedAt: Date | null): CalendarTaskView => ({
  id,
  title: id,
  details: null,
  dueDate: new Date("2026-11-12T00:00:00Z"),
  completedAt,
  people: [],
  isMine: true,
});

test("applyTaskDone returns the same array when there are no overrides", () => {
  const tasks = [task("a", null)];
  assert.equal(applyTaskDone(tasks, new Map()), tasks);
});

test("applyTaskDone returns the same array when no override changes a task", () => {
  const tasks = [task("a", done), task("b", null)];
  const overrides = new Map<string, Date | null>([
    ["a", done],
    ["b", null],
    ["gone", done],
  ]);
  assert.equal(applyTaskDone(tasks, overrides), tasks);
});

test("applyTaskDone ticks a task and leaves the others as the same objects", () => {
  const a = task("a", null);
  const b = task("b", null);
  const out = applyTaskDone([a, b], new Map([["a", done]]));
  assert.notEqual(out, undefined);
  assert.equal(out[0].completedAt, done);
  assert.equal(out[1], b);
});

test("applyTaskDone un-ticks a completed task", () => {
  const out = applyTaskDone([task("a", done)], new Map([["a", null]]));
  assert.equal(out[0].completedAt, null);
});

test("pruneTaskDone keeps an override while the server disagrees", () => {
  const overrides = new Map<string, Date | null>([["a", done]]);
  assert.equal(pruneTaskDone(overrides, [task("a", null)]), overrides);
});

test("pruneTaskDone keeps an override for a task the server did not send", () => {
  const overrides = new Map<string, Date | null>([["a", null]]);
  assert.equal(pruneTaskDone(overrides, [task("b", null)]), overrides);
});

test("pruneTaskDone drops an override once the server agrees, keeping the rest", () => {
  const overrides = new Map<string, Date | null>([
    ["a", done],
    ["b", null],
  ]);
  const out = pruneTaskDone(overrides, [task("a", done), task("b", done)]);
  assert.deepEqual([...out.keys()], ["b"]);
  assert.equal(overrides.size, 2);
});

test("pruneTaskDone returns the same map when it is empty", () => {
  const overrides = new Map<string, Date | null>();
  assert.equal(pruneTaskDone(overrides, [task("a", null)]), overrides);
});

test("pruneTaskDoneByState keeps an override while the state disagrees or is missing", () => {
  const overrides = new Map<string, Date | null>([["a", null]]);
  assert.equal(pruneTaskDoneByState(overrides, new Map([["a", true]])), overrides);
  assert.equal(pruneTaskDoneByState(overrides, new Map([["b", false]])), overrides);
});

test("pruneTaskDoneByState drops an override once the state agrees, keeping the rest", () => {
  const overrides = new Map<string, Date | null>([
    ["a", done],
    ["b", null],
  ]);
  const out = pruneTaskDoneByState(overrides, new Map([["a", true], ["b", true]]));
  assert.deepEqual([...out.keys()], ["b"]);
  assert.equal(overrides.size, 2);
});

test("pruneTaskDoneByState returns the same map when it is empty", () => {
  const overrides = new Map<string, Date | null>();
  assert.equal(pruneTaskDoneByState(overrides, new Map([["a", false]])), overrides);
});

test("pruneTaskDoneByState: the Undo-inside-the-round-trip sequence keeps the null override until the not-done rows land", () => {
  // Rows start not done; tick then Undo sets null. A stale not-done state would drop it, so the
  // caller must not prune until the rows change: done (tick refresh) disagrees, not done (Undo refresh) agrees.
  const overrides = new Map<string, Date | null>([["a", null]]);
  const afterTick = pruneTaskDoneByState(overrides, new Map([["a", true]]));
  assert.equal(afterTick, overrides);
  const afterUndo = pruneTaskDoneByState(afterTick, new Map([["a", false]]));
  assert.equal(afterUndo.size, 0);
});

// Pins habitsDashboard.ts: which rows the Habits and Chores today tiles list,
// in what order, and which empty line they say (decisions 132, 133, 137).

import { test } from "node:test";
import assert from "node:assert/strict";
import { choresTileRows, habitsTileRows, keepShownRows, pickableHabits } from "./habitsDashboard";
import {
  CHORES_TILE_EMPTY,
  HABITS_TILE_ALL_DONE,
  HABITS_TILE_NOTHING_DUE,
  HABITS_TILE_PICKED_LABEL,
} from "./habitVocabulary";

type Row = Parameters<typeof habitsTileRows>[0][number];

function row(id: string, overrides: Partial<Row> = {}): Row {
  return {
    id,
    kind: "habit",
    dueState: "required",
    carriedFrom: null,
    doneToday: false,
    skippedToday: false,
    onVacation: false,
    skippedThisWeek: false,
    ...overrides,
  };
}

const ids = (rows: Row[]) => rows.map((r) => r.id);
const carried = { year: 2026, month: 11, day: 4 };

// --- Habits tile --------------------------------------------------------

test("habits: picks keep picked order, not Today's order", () => {
  const rows = [row("a"), row("b"), row("c")];
  const tile = habitsTileRows(rows, ["c", "a"]);
  assert.deepEqual(ids(tile.rows), ["c", "a"]);
  assert.equal(tile.label, HABITS_TILE_PICKED_LABEL);
  assert.equal(tile.empty, null);
});

test("habits: picked ones that are done or skipped still show", () => {
  const rows = [row("a", { doneToday: true }), row("b", { skippedToday: true }), row("c", { dueState: "none", doneToday: true })];
  assert.deepEqual(ids(habitsTileRows(rows, ["a", "b", "c"]).rows), ["a", "b", "c"]);
});

test("habits: picks keep every row Today shows, open ones included (decision 132)", () => {
  const rows = [row("a", { dueState: "none" }), row("b"), row("c", { dueState: "open" })];
  const tile = habitsTileRows(rows, ["a", "b", "c", "gone"]);
  assert.deepEqual(ids(tile.rows), ["b", "c"]);
});

test("habits: a picked habit that is carried shows, a repeated or chore pick does not duplicate or leak", () => {
  const rows = [row("a", { dueState: "none", carriedFrom: carried }), row("k", { kind: "chore" })];
  assert.deepEqual(ids(habitsTileRows(rows, ["a", "a", "k"]).rows), ["a"]);
});

test("habits: picks with nothing to show say Nothing due today, never All done", () => {
  const tile = habitsTileRows([row("a", { dueState: "none" }), row("b", { doneToday: true })], ["a"]);
  assert.deepEqual(tile.rows, []);
  assert.equal(tile.empty, HABITS_TILE_NOTHING_DUE);
  assert.equal(tile.label, HABITS_TILE_PICKED_LABEL);
});

test("habits: no picks gives at most three due and not done, in Today's order", () => {
  const rows = [row("a"), row("b", { doneToday: true }), row("c", { skippedToday: true }), row("d"), row("e"), row("f"), row("g")];
  const tile = habitsTileRows(rows, []);
  assert.deepEqual(ids(tile.rows), ["a", "d", "e"]);
  assert.equal(tile.label, null);
});

test("habits: no picks counts a carried row as due and leaves out open, none and chores", () => {
  const rows = [
    row("carry", { dueState: "none", carriedFrom: carried }),
    row("open", { dueState: "open" }),
    row("none", { dueState: "none" }),
    row("chore", { kind: "chore" }),
    row("due"),
  ];
  assert.deepEqual(ids(habitsTileRows(rows, []).rows), ["carry", "due"]);
});

test("habits: empty line says All done only when something was due and all is done or skipped", () => {
  const allDone = habitsTileRows([row("a", { doneToday: true }), row("b", { skippedToday: true })], []);
  assert.deepEqual(allDone.rows, []);
  assert.equal(allDone.empty, HABITS_TILE_ALL_DONE);
});

test("habits: empty line says Nothing due today when nothing was due", () => {
  assert.equal(habitsTileRows([], []).empty, HABITS_TILE_NOTHING_DUE);
  const untouched = [row("a", { dueState: "none" }), row("b", { dueState: "open" }), row("c", { kind: "chore", doneToday: true })];
  assert.equal(habitsTileRows(untouched, []).empty, HABITS_TILE_NOTHING_DUE);
});

// --- Chores tile --------------------------------------------------------

test("chores: due, carried and done chores show; habits do not", () => {
  const rows = [
    row("due", { kind: "chore" }),
    row("carry", { kind: "chore", dueState: "none", carriedFrom: carried }),
    row("done", { kind: "chore", dueState: "none", doneToday: true }),
    row("habit"),
  ];
  const tile = choresTileRows(rows);
  assert.deepEqual(ids(tile.rows), ["due", "carry", "done"]);
  assert.equal(tile.empty, null);
  assert.equal(tile.label, null);
});

test("chores: undone skipped, week-skipped and vacation rows stay out", () => {
  const rows = [
    row("skipped", { kind: "chore", skippedToday: true }),
    row("week", { kind: "chore", skippedThisWeek: true }),
    row("vacation", { kind: "chore", onVacation: true }),
    row("open", { kind: "chore", dueState: "open" }),
  ];
  assert.deepEqual(ids(choresTileRows(rows).rows), []);
});

test("chores: a chore done today stays, vacation or week-skipped (decision 150)", () => {
  const rows = [
    row("doneOnVacation", { kind: "chore", doneToday: true, onVacation: true }),
    row("doneWeekSkipped", { kind: "chore", doneToday: true, skippedThisWeek: true }),
    row("doneAndSkipped", { kind: "chore", dueState: "none", doneToday: true, skippedToday: true }),
  ];
  assert.deepEqual(ids(choresTileRows(rows).rows), ["doneOnVacation", "doneWeekSkipped", "doneAndSkipped"]);
});

test("chores: empty says No chores today", () => {
  assert.equal(choresTileRows([]).empty, CHORES_TILE_EMPTY);
  assert.equal(choresTileRows([row("skipped", { kind: "chore", skippedToday: true })]).empty, CHORES_TILE_EMPTY);
});

// --- kept rows (decision 147) ------------------------------------------

test("keepShownRows: a row the server dropped stays as the last tap left it", () => {
  const held = row("a", { doneToday: true });
  const fresh = row("b");
  const out = keepShownRows(["a", "b"], [fresh], [held, row("b", { skippedToday: true })]);
  assert.deepEqual(out, [held, fresh]);
});

test("keepShownRows: the fresh row wins when the server still sends it", () => {
  const fresh = row("a", { skippedToday: true });
  assert.equal(keepShownRows(["a"], [fresh], [row("a")])[0], fresh);
});

test("keepShownRows: a new row never slides in, and shown order is kept", () => {
  const out = keepShownRows(["b", "a"], [row("a"), row("z"), row("b")], []);
  assert.deepEqual(ids(out), ["b", "a"]);
});

test("keepShownRows: three checked rows stay three, not All done", () => {
  const held = ["a", "b", "c"].map((id) => row(id, { doneToday: true }));
  const out = keepShownRows(["a", "b", "c"], [row("d")], held);
  assert.deepEqual(ids(out), ["a", "b", "c"]);
  assert.ok(out.every((r) => r.doneToday));
});

test("keepShownRows: an id with no fresh and no held row is gone", () => {
  assert.deepEqual(keepShownRows(["a", "x"], [], [row("a")]).map((r) => r.id), ["a"]);
});

// --- picker -------------------------------------------------------------

test("pickableHabits: kind habit, not archived, in the given order", () => {
  const items = [
    { id: "a", kind: "habit" as const, archived: false },
    { id: "b", kind: "chore" as const, archived: false },
    { id: "c", kind: "habit" as const, archived: true },
    { id: "d", kind: "habit" as const, archived: false },
  ];
  assert.deepEqual(pickableHabits(items).map((i) => i.id), ["a", "d"]);
});

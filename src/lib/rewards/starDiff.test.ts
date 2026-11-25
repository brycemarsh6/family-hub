// Pins starDiff.ts: the optimistic move of the star bank on a tap.

import { test } from "node:test";
import assert from "node:assert/strict";
import { shownBanks, starDiff, type StarDiffRow } from "./starDiff";
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

// The family page: an Each habit has one copy per column, each built for that column's person (`viewerId`), and the server decides late for the tapped person.
const CARRIED = { year: 2026, month: 11, day: 23 };
const members = () => [{ userId: "dad", done: false, skipped: false }, { userId: "kid", done: false, skipped: false }];
function eachCopy(viewerId: string, carriedFrom: unknown | null): HabitRowState & StarDiffRow {
  return { id: "feed-dog", sharing: "each", doneToday: false, skippedToday: false, dueState: "required", stars: 4, viewerId, carriedFrom, participants: members() };
}
function tapKid(copies: (HabitRowState & StarDiffRow)[]) {
  const change = { type: "check" as const, habitId: "feed-dog", userId: "kid" };
  return copies.flatMap((copy) => applyHabitChange([copy], change));
}

for (const [late, pays] of [["half", 2], ["none", 0]] as const) {
  test(`Each copies that differ: Kid's carried copy is second, Late checks ${late}, the tap pays Kid ${pays}`, () => {
    const server = [eachCopy("dad", null), eachCopy("kid", CARRIED)];
    assert.equal(starDiff(server, tapKid(server), late).kid ?? 0, pays);
  });

  test(`Each copies that differ: Dad's copy is carried, Kid's is not, Late checks ${late}, the tap pays Kid the full 4`, () => {
    const server = [eachCopy("dad", CARRIED), eachCopy("kid", null)];
    assert.equal(starDiff(server, tapKid(server), late).kid, 4);
  });

  test(`Each copies that differ: Kid's carried copy is first (control), Late checks ${late}, the tap pays Kid ${pays}`, () => {
    const server = [eachCopy("kid", CARRIED), eachCopy("dad", null)];
    assert.equal(starDiff(server, tapKid(server), late).kid ?? 0, pays);
  });
}

test("Each copies that differ: un-checking a carried copy takes back the late amount", () => {
  const server = [eachCopy("dad", null), eachCopy("kid", CARRIED)].map((copy) => ({ ...copy, participants: copy.participants.map((p) => (p.userId === "kid" ? { ...p, done: true } : p)) }));
  const change = { type: "uncheck" as const, habitId: "feed-dog", userId: "kid" };
  const shown = server.flatMap((copy) => applyHabitChange([copy], change));
  assert.equal(starDiff(server, shown, "half").kid, -2);
});

test("shownBanks adds the diff to each bank and keeps people the diff does not name", () => {
  assert.deepEqual(shownBanks({ a: 10, b: 3 }, { a: 4 }), { a: 14, b: 3 });
  assert.deepEqual(shownBanks({ a: 10 }, { a: -5, c: 2 }), { a: 5, c: 2 });
  assert.deepEqual(shownBanks({ a: 1 }, {}), { a: 1 });
});

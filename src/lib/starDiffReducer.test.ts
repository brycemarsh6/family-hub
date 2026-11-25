// Pins starDiff.ts against the real reducer in habitChanges.ts. It lives here, not in
// rewards/, because the rewards folder never imports the habit engine (docs/structure/rewards.md).

import { test } from "node:test";
import assert from "node:assert/strict";
import { starDiff, type StarDiffRow } from "./rewards/starDiff";
import { applyHabitChange, type HabitRowState } from "./habitChanges";

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

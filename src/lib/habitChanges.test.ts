import test from "node:test";
import assert from "node:assert/strict";
import { applyHabitChange, type HabitRowState } from "./habitChanges";

const row = (over: Partial<HabitRowState> = {}): HabitRowState => ({
  id: "h1",
  sharing: "each",
  viewerId: "me",
  doneToday: false,
  skippedToday: false,
  participants: [
    { userId: "me", done: false, skipped: false },
    { userId: "kid", done: false, skipped: false },
  ],
  ...over,
});

test("check marks the viewer's row done and touches no one else", () => {
  const [out] = applyHabitChange([row()], { type: "check", habitId: "h1" });
  assert.equal(out.doneToday, true);
  assert.deepEqual(out.participants.map((p) => p.done), [true, false]);
});

test("an Each check for someone else changes only their entry, not the viewer's flags", () => {
  const [out] = applyHabitChange([row()], { type: "check", habitId: "h1", userId: "kid" });
  assert.equal(out.doneToday, false);
  assert.deepEqual(out.participants.map((p) => p.done), [false, true]);
});

test("a Together check marks everyone done", () => {
  const [out] = applyHabitChange([row({ sharing: "together" })], { type: "check", habitId: "h1", userId: "kid" });
  assert.equal(out.doneToday, true);
  assert.deepEqual(out.participants.map((p) => p.done), [true, true]);
});

test("uncheck clears done; on a row that is not done it changes nothing", () => {
  const done = row({ doneToday: true, participants: [{ userId: "me", done: true, skipped: false }] });
  const [out] = applyHabitChange([done], { type: "uncheck", habitId: "h1" });
  assert.equal(out.doneToday, false);
  assert.equal(out.participants[0].done, false);
  const fresh = row();
  assert.deepEqual(applyHabitChange([fresh], { type: "uncheck", habitId: "h1" })[0], fresh);
});

test("skip marks skipped, not done; unskip brings it back", () => {
  const [skipped] = applyHabitChange([row()], { type: "skip", habitId: "h1" });
  assert.equal(skipped.skippedToday, true);
  assert.equal(skipped.doneToday, false);
  const [back] = applyHabitChange([skipped], { type: "unskip", habitId: "h1" });
  assert.equal(back.skippedToday, false);
  assert.equal(back.participants[0].skipped, false);
});

test("a day that already has a check or a skip ignores a second tap, like the server", () => {
  const done = row({ doneToday: true });
  assert.equal(applyHabitChange([done], { type: "skip", habitId: "h1" })[0].skippedToday, false);
  const skipped = row({ skippedToday: true });
  assert.equal(applyHabitChange([skipped], { type: "check", habitId: "h1" })[0].doneToday, false);
});

test("uncheck leaves a skip alone and unskip leaves a check alone", () => {
  const skipped = row({ skippedToday: true });
  assert.equal(applyHabitChange([skipped], { type: "uncheck", habitId: "h1" })[0].skippedToday, true);
  const done = row({ doneToday: true });
  assert.equal(applyHabitChange([done], { type: "unskip", habitId: "h1" })[0].doneToday, true);
});

test("other rows and an unknown habit id come back unchanged", () => {
  const rows = [row(), row({ id: "h2" })];
  const out = applyHabitChange(rows, { type: "check", habitId: "h2" });
  assert.equal(out[0], rows[0]);
  assert.equal(out[1].doneToday, true);
  assert.deepEqual(applyHabitChange(rows, { type: "check", habitId: "nope" }), rows);
});

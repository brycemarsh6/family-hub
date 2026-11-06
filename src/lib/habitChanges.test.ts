import test from "node:test";
import assert from "node:assert/strict";
import { applyHabitChange, type HabitRowState } from "./habitChanges";
import { addHoursMinutes } from "./habitsHours";

const row = (over: Partial<HabitRowState> = {}): HabitRowState => ({
  id: "h1",
  sharing: "each",
  viewerId: "me",
  doneToday: false,
  skippedToday: false,
  carriedFrom: null,
  dueState: "open",
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

test("skipCarried drops a carried row that is not due today", () => {
  const carried = row({ carriedFrom: { year: 2026, month: 11, day: 3 }, dueState: "none" });
  const out = applyHabitChange([carried, row({ id: "h2" })], { type: "skipCarried", habitId: "h1" });
  assert.deepEqual(out.map((r) => r.id), ["h2"]);
});

test("skipCarried on a carried row that is also due today ends the carry and keeps today's row open", () => {
  const carried = row({ carriedFrom: { year: 2026, month: 11, day: 3 }, dueState: "required" });
  const [out] = applyHabitChange([carried], { type: "skipCarried", habitId: "h1" });
  assert.equal(out.carriedFrom, null);
  assert.equal(out.skippedToday, false);
  assert.equal(out.doneToday, false);
});

test("skipCarried on a row that is not carried changes nothing", () => {
  const plain = row();
  assert.deepEqual(applyHabitChange([plain], { type: "skipCarried", habitId: "h1" }), [plain]);
});

// --- Hours habits ---

const hoursView = (done: number) => addHoursMinutes({ done, target: 600, doneText: "", leftText: null, leftShort: null, met: false, fraction: 0, paceDays: "monsat", daysLeft: 2 }, 0);

test("addTime redraws the viewer's bar and marks the row done when the goal is reached", () => {
  const hours = hoursView(540);
  const [part] = applyHabitChange([row({ hours })], { type: "addTime", habitId: "h1", minutes: 30 });
  assert.equal(part.hours?.doneText, "9½ of 10 hours this week");
  assert.equal(part.doneToday, false);
  const [met] = applyHabitChange([row({ hours })], { type: "addTime", habitId: "h1", minutes: 60 });
  assert.equal(met.hours?.doneText, "10 of 10 hours this week · done");
  assert.equal(met.doneToday, true);
  assert.deepEqual(met.participants.map((p) => p.done), [true, false], "only the viewer's own entry");
});

test("addTime changes nothing on a checks row or for another person", () => {
  const plain = row();
  assert.deepEqual(applyHabitChange([plain], { type: "addTime", habitId: "h1", minutes: 60 }), [plain]);
  const mine = row({ hours: hoursView(0) });
  assert.deepEqual(applyHabitChange([mine], { type: "addTime", habitId: "h1", minutes: 60, userId: "kid" }), [mine]);
});

// Pins starHistoryRows.ts: private habit names, late checks and household days.

import { test } from "node:test";
import assert from "node:assert/strict";
import { toHistoryEntries, toRecentEntries, type StarLogRow } from "./starHistoryRows";

function log(over: Partial<StarLogRow> & { isPrivate?: boolean; participants?: string[] } = {}): StarLogRow {
  const { isPrivate = false, participants = ["kid1"], ...rest } = over;
  return {
    id: "l1", day: new Date("2026-11-24T00:00:00Z"), status: "done", stars: 5, createdAt: new Date("2026-11-24T15:00:00Z"),
    habit: { title: "Journal", isPrivate, participants: participants.map((userId) => ({ userId })) }, ...rest,
  };
}

const noWinnie: ReadonlySet<string> = new Set();
const none = { redemptions: [], adjustments: [] };

test("a private habit's name is hidden from a non-participant and from the device, shown to a participant", () => {
  const rows = { ...none, logs: [log({ isPrivate: true })] };
  const [mine] = toHistoryEntries(rows, { userId: "kid1", role: "kid" }, noWinnie);
  assert.deepEqual([mine.title, mine.nameHidden], ["Journal", false]);
  const [parent] = toHistoryEntries(rows, { userId: "parent1", role: "parent" }, noWinnie);
  assert.deepEqual([parent.title, parent.nameHidden], [null, true]);
  const [device] = toHistoryEntries(rows, { userId: "kid1", role: "device" }, noWinnie);
  assert.deepEqual([device.title, device.nameHidden], [null, true]);
});

test("a public habit shows its name to everyone", () => {
  const [entry] = toHistoryEntries({ ...none, logs: [log()] }, { userId: "other", role: "kid" }, noWinnie);
  assert.deepEqual([entry.title, entry.nameHidden], ["Journal", false]);
});

test("a late log becomes kind late; a log that paid nothing is left out; the day comes from the stored UTC midnight", () => {
  const entries = toHistoryEntries({ ...none, logs: [log({ status: "late", stars: 3 }), log({ id: "l2", stars: null })] }, { userId: "kid1", role: "kid" }, noWinnie);
  assert.equal(entries.length, 1);
  assert.deepEqual([entries[0].kind, entries[0].amount, entries[0].dayKey, entries[0].dayText], ["late", 3, "2026-11-24", "Tue, Nov 24"]);
});

test("a redemption at 11:30 PM Denver lands on the Denver day, not the UTC day", () => {
  const redeemedAt = new Date("2026-11-25T06:30:00Z");
  const [entry] = toHistoryEntries({ logs: [], redemptions: [{ id: "r1", title: "Cupcake", emoji: "🧁", cost: 20, redeemedAt }], adjustments: [] }, { userId: "p", role: "parent" }, noWinnie);
  assert.deepEqual([entry.kind, entry.amount, entry.dayKey, entry.dayText, entry.emoji], ["redeem", -20, "2026-11-24", "Tue, Nov 24", "🧁"]);
});

test("adjustments take their sign for kind, the giver's name and the household day", () => {
  const createdAt = new Date("2026-11-25T06:30:00Z");
  const entries = toHistoryEntries(
    { logs: [], redemptions: [], adjustments: [
      { id: "a1", amount: 5, note: "Nice", createdAt, createdBy: { displayName: "Dad" } },
      { id: "a2", amount: -2, note: null, createdAt, createdBy: null },
    ] },
    { userId: "p", role: "parent" },
    noWinnie,
  );
  assert.deepEqual(entries.map((e) => [e.kind, e.giverName, e.note, e.dayKey]), [["bonus", "Dad", "Nice", "2026-11-24"], ["take", null, null, "2026-11-24"]]);
});

test("recent entries keep the plain row id and name the person and giver", () => {
  const at = new Date("2026-11-25T18:00:00Z");
  const out = toRecentEntries({
    redemptions: [{ id: "r1", title: "Cupcake", emoji: null, cost: 20, redeemedAt: at, user: { displayName: "Ellie" }, redeemedBy: { displayName: "Dad" } }],
    adjustments: [{ id: "a1", amount: -4, note: "Mess", createdAt: at, createdBy: null, user: { displayName: "Sam" } }],
  }, noWinnie);
  assert.deepEqual(out.map((e) => [e.id, e.kind, e.amount, e.personName, e.giverName, e.dayKey]), [
    ["r1", "redeem", -20, "Ellie", "Dad", "2026-11-25"],
    ["a1", "take", -4, "Sam", null, "2026-11-25"],
  ]);
});

test("a giverless adjustment Winnie made names her; one she did not make stays giverless; a named giver wins", () => {
  const createdAt = new Date("2026-11-25T18:00:00Z");
  const adjustments = [
    { id: "w1", amount: 5, note: "Great", createdAt, createdBy: null },
    { id: "w2", amount: -3, note: null, createdAt, createdBy: null },
    { id: "g1", amount: 2, note: null, createdAt, createdBy: null },
    { id: "d1", amount: 4, note: null, createdAt, createdBy: { displayName: "Dad" } },
  ];
  const winnie = new Set(["w1", "w2", "d1"]);
  const history = toHistoryEntries({ logs: [], redemptions: [], adjustments }, { userId: "p", role: "parent" }, winnie);
  assert.deepEqual(history.map((e) => [e.kind, e.giverName]), [["bonus", "Winnie"], ["take", "Winnie"], ["bonus", null], ["bonus", "Dad"]]);
  const recent = toRecentEntries({ redemptions: [], adjustments: adjustments.map((a) => ({ ...a, user: { displayName: "Sam" } })) }, winnie);
  assert.deepEqual(recent.map((e) => e.giverName), ["Winnie", "Winnie", null, "Dad"]);
});

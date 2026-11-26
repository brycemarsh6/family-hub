// Pins starHistory.ts: the history sheet's days and lines, and Manage's Recent list.

import { test } from "node:test";
import assert from "node:assert/strict";
import { recentLines, starHistory, type HistoryEntry, type RecentEntry } from "./starHistory";

const TODAY = "2026-11-25";
const YESTERDAY = "2026-11-24";

function entry(over: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "e", kind: "check", amount: 5, at: 1000, dayKey: TODAY, dayText: "Wed, Nov 25",
    title: "Make bed", nameHidden: false, giverName: null, note: null, emoji: null, ...over,
  };
}

function lines(entries: HistoryEntry[]) {
  return starHistory(entries, TODAY, YESTERDAY).flatMap((day) => day.lines);
}

test("a check is the habit's name; a late check adds Late under it", () => {
  const [check, late] = lines([entry({ id: "a" }), entry({ id: "b", kind: "late", at: 500 })]);
  assert.deepEqual([check.text, check.sub, check.amountText, check.tone], ["Make bed", null, "+5", "plus"]);
  assert.deepEqual([late.text, late.sub], ["Make bed", "Late"]);
});

test("a hidden habit name reads A private habit", () => {
  const [line] = lines([entry({ nameHidden: true })]);
  assert.equal(line.text, "A private habit");
  const [late] = lines([entry({ kind: "late", nameHidden: true })]);
  assert.deepEqual([late.text, late.sub], ["A private habit", "Late"]);
});

test("a bonus and a take-away name the giver and put the note under", () => {
  const [bonus, take] = lines([
    entry({ id: "b", kind: "bonus", title: null, giverName: "Dad", note: "Great job", amount: 10, at: 2 }),
    entry({ id: "t", kind: "take", title: null, giverName: "Mom", note: "Messy room", amount: -3, at: 1 }),
  ]);
  assert.deepEqual([bonus.text, bonus.sub, bonus.amountText], ["Bonus from Dad", "Great job", "+10"]);
  assert.deepEqual([take.text, take.sub, take.amountText, take.tone], ["Taken away by Mom", "Messy room", "-3", "minus"]);
});

test("a bonus or take-away with no note or no giver still reads well", () => {
  const [bonus, take] = lines([
    entry({ id: "b", kind: "bonus", title: null, giverName: null, note: null, at: 2 }),
    entry({ id: "t", kind: "take", title: null, giverName: "Mom", note: null, amount: -3, at: 1 }),
  ]);
  assert.deepEqual([bonus.text, bonus.sub], ["Bonus stars", null]);
  assert.deepEqual([take.text, take.sub], ["Taken away by Mom", null]);
});

test("a redeem is the picture and Redeemed (title)", () => {
  const [line] = lines([entry({ kind: "redeem", title: "Cupcake", emoji: "🧁", amount: -20 })]);
  assert.deepEqual([line.text, line.emoji, line.amountText, line.tone], ["Redeemed Cupcake", "🧁", "-20", "minus"]);
});

test("days are newest first with Today, Yesterday and the formatted day; lines newest first", () => {
  const days = starHistory(
    [
      entry({ id: "old", dayKey: "2026-11-21", dayText: "Sat, Nov 21", at: 1 }),
      entry({ id: "t1", at: 10 }),
      entry({ id: "y1", dayKey: YESTERDAY, dayText: "Tue, Nov 24", at: 5 }),
      entry({ id: "t2", at: 20 }),
    ],
    TODAY,
    YESTERDAY,
  );
  assert.deepEqual(days.map((d) => d.label), ["Today", "Yesterday", "Sat, Nov 21"]);
  assert.deepEqual(days[0].lines.map((l) => l.id), ["t2", "t1"]);
  assert.deepEqual(starHistory([], TODAY, YESTERDAY), []);
});

function recent(over: Partial<RecentEntry>): RecentEntry {
  return {
    id: "r", kind: "redeem", amount: -20, at: 1, dayKey: TODAY, dayText: "Wed, Nov 25",
    personName: "Ellie", title: "Cupcake", emoji: "🧁", giverName: null, note: null, ...over,
  };
}

test("Recent: a redeem reads (title) redeemed over (name) · (cost) stars · (day)", () => {
  const [line] = recentLines([recent({})], TODAY, YESTERDAY);
  assert.deepEqual([line.title, line.sub, line.emoji], ["Cupcake redeemed", "Ellie · 20 stars · Today", "🧁"]);
});

test("Recent: bonus and take-away, with and without a note, newest first", () => {
  const out = recentLines(
    [
      recent({ id: "a", kind: "bonus", amount: 5, giverName: "Dad", note: "Chores", title: null, emoji: null, at: 3 }),
      recent({ id: "b", kind: "take", amount: -2, giverName: "Mom", note: null, title: null, emoji: null, at: 4, dayKey: YESTERDAY }),
      recent({ id: "c", kind: "bonus", amount: 1, giverName: null, note: null, title: null, emoji: null, at: 2, dayKey: "2026-11-21", dayText: "Sat, Nov 21" }),
    ],
    TODAY,
    YESTERDAY,
  );
  assert.deepEqual(out.map((l) => l.id), ["b", "a", "c"]);
  assert.deepEqual([out[0].title, out[0].sub], ["Stars taken away", "Ellie · -2 from Mom · Yesterday"]);
  assert.deepEqual([out[1].title, out[1].sub], ["Bonus: Chores", "Ellie · +5 from Dad · Today"]);
  assert.deepEqual([out[2].title, out[2].sub], ["Bonus stars", "Ellie · +1 · Sat, Nov 21"]);
});

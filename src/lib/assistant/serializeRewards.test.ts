import { test } from "node:test";
import assert from "node:assert/strict";
import type { RewardView } from "@/lib/rewardsRead";
import type { HistoryDay, RecentLine } from "@/lib/rewards/starHistory";
import { toHistoryAnswer, toRecentAnswer, toRewardsAnswer, toStarSummary } from "./serializeRewards";

const people = [{ id: "a", displayName: "Ann" }, { id: "b", displayName: "Ben" }];
const reward = (over: Partial<RewardView>): RewardView => ({
  id: "r", ownerId: "a", title: "Movie", emoji: null, cost: 50, repeatable: false, redeemedCount: 0, ...over,
});
const rewards: RewardView[] = [
  reward({ id: "done", title: "Done", redeemedCount: 1 }),
  reward({ id: "saving", cost: 80, emoji: "🎬" }),
  reward({ id: "ready", cost: 40, repeatable: true, redeemedCount: 3 }),
  reward({ id: "wish", cost: null }),
  reward({ id: "bens", ownerId: "b", cost: 10 }),
  // Columns that must never reach the wire:
  ...[({ ...reward({ id: "extra" }), createdById: "secret" } as RewardView)],
];

test("toRewardsAnswer: people in order, each with their own bank and rewards, earned last", () => {
  const out = toRewardsAnswer({ people, banks: { a: 45, b: 12 }, rewards, createdByAssistant: new Set(["wish"]), lateStars: "full" });
  assert.equal(out.lateStars, "full");
  assert.deepEqual(out.people.map((p) => [p.personId, p.name, p.stars]), [["a", "Ann", 45], ["b", "Ben", 12]]);
  assert.deepEqual(out.people[0].rewards.map((r) => r.id), ["saving", "ready", "wish", "extra", "done"]);
  assert.deepEqual(out.people[1].rewards.map((r) => [r.id, r.status]), [["bens", "ready"]]);
});

test("toRewardsAnswer: status and progress come from rewardStatus; createdByAssistant from the set", () => {
  const out = toRewardsAnswer({ people, banks: { a: 45, b: 0 }, rewards, createdByAssistant: new Set(["wish"]), lateStars: "half" });
  const by = Object.fromEntries(out.people[0].rewards.map((r) => [r.id, r]));
  assert.equal(by.saving.status, "saving");
  assert.equal(by.saving.progress, "45 of 80");
  assert.equal(by.ready.status, "ready");
  assert.equal(by.ready.progress, null);
  assert.equal(by.ready.timesRedeemed, 3);
  assert.equal(by.wish.status, "wish");
  assert.equal(by.wish.cost, null);
  assert.equal(by.done.status, "earned");
  assert.equal(by.wish.createdByAssistant, true);
  assert.equal(by.saving.createdByAssistant, false);
  assert.deepEqual(Object.keys(by.saving).sort(), [
    "cost", "createdByAssistant", "emoji", "id", "progress", "repeatable", "status", "timesRedeemed", "title",
  ]);
});

test("toRewardsAnswer: a person missing from the banks reads 0, and no pin or creator field ever appears", () => {
  const out = toRewardsAnswer({ people, banks: {}, rewards, createdByAssistant: new Set(), lateStars: "none" });
  assert.equal(out.people[0].stars, 0);
  assert.ok(!JSON.stringify(out).toLowerCase().includes("pin"));
  assert.ok(!JSON.stringify(out).includes("secret"));
});

test("toHistoryAnswer: days and lines by field, the display amount text left out", () => {
  const days = [{
    dayKey: "2026-11-25", label: "Today",
    lines: [{ id: "log-1", kind: "check", text: "A private habit", sub: null, amount: 5, amountText: "+5", tone: "plus", emoji: null }],
  }] as HistoryDay[];
  const out = toHistoryAnswer(people[0], 20, days);
  assert.deepEqual(out, {
    personId: "a", name: "Ann", stars: 20,
    days: [{ date: "2026-11-25", label: "Today", lines: [{ id: "log-1", kind: "check", text: "A private habit", sub: null, amount: 5, emoji: null }] }],
  });
});

test("toRecentAnswer: id, kind, title, sub and emoji only", () => {
  const lines = [{ id: "x", kind: "bonus", title: "T", sub: "S", emoji: null, extra: 1 }] as unknown as RecentLine[];
  assert.deepEqual(toRecentAnswer(lines), { lines: [{ id: "x", kind: "bonus", title: "T", sub: "S", emoji: null }] });
});

test("toStarSummary: banks in household order and the wishes still waiting for a cost", () => {
  assert.deepEqual(toStarSummary(people, { a: 7 }, rewards), {
    banks: [{ personId: "a", name: "Ann", stars: 7 }, { personId: "b", name: "Ben", stars: 0 }],
    wishesWaiting: 1,
  });
});

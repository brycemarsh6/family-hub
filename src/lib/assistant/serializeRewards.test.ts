import { test } from "node:test";
import assert from "node:assert/strict";
import type { RewardView } from "@/lib/rewardsRead";
import type { HistoryDay, RecentLine } from "@/lib/rewards/starHistory";
import { adjustmentChange, rewardChange, toAdjustmentAnswer, toHistoryAnswer, toRecentAnswer, toRewardsAnswer, toStarSummary } from "./serializeRewards";

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

const T = new Date("2026-11-26T10:00:00.000Z");
const row = (over: Record<string, unknown> = {}) => ({
  id: "r1", ownerId: "a", title: "Movie", emoji: null, cost: 50, repeatable: false, sortOrder: 2, createdById: null,
  createdAt: T, updatedAt: T, ...over,
});

test("rewardChange: model Reward, the whole row as a copy (dates as ISO), only the sides the action has", () => {
  const created = rewardChange("create", null, row());
  assert.equal(created.model, "Reward");
  assert.equal(created.recordId, "r1");
  assert.equal(created.action, "create");
  assert.equal(created.before, null);
  assert.deepEqual(created.after, {
    id: "r1", ownerId: "a", title: "Movie", emoji: null, cost: 50, repeatable: false, sortOrder: 2, createdById: null,
    createdAt: T.toISOString(), updatedAt: T.toISOString(),
  });
  assert.deepEqual(created.summary, { title: "Movie", cost: 50 });
  const removed = rewardChange("delete", row({ cost: null }), null);
  assert.equal(removed.after, null);
  assert.equal(removed.before?.cost, null);
  assert.deepEqual(removed.summary, { title: "Movie", cost: null });
});

test("rewardChange: an update carries both rows, and a column added to the row later does not reach the copy", () => {
  const change = rewardChange("update", row({ cost: null }), row({ cost: 25, secret: "x" }));
  assert.equal(change.before?.cost, null);
  assert.equal(change.after?.cost, 25);
  assert.ok(!("secret" in (change.after ?? {})));
});

test("adjustmentChange: model StarAdjustment, a create with the whole row as its after copy", () => {
  const change = adjustmentChange({ id: "s1", userId: "a", amount: -5, note: "Late", createdById: null, createdAt: T });
  assert.equal(change.model, "StarAdjustment");
  assert.equal(change.action, "create");
  assert.equal(change.before, null);
  assert.deepEqual(change.after, { id: "s1", userId: "a", amount: -5, note: "Late", createdById: null, createdAt: T.toISOString() });
  assert.deepEqual(change.summary, { amount: -5 });
});

test("toAdjustmentAnswer: field by field, the creator left off", () => {
  const out = toAdjustmentAnswer({ id: "s1", userId: "a", amount: 5, note: null, createdAt: T, createdById: "p" } as Parameters<typeof toAdjustmentAnswer>[0]);
  assert.deepEqual(out, { id: "s1", personId: "a", amount: 5, note: null, createdAt: T.toISOString() });
});

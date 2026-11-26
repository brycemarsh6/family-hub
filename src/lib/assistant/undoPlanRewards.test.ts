// Tests for undoPlan.ts on Rewards and star adjustments (mission 85). The
// general rules are in undoPlan.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import { FOREIGN_KEYS } from "@/lib/assistant/undoModels";
import {
  fromCopy,
  planUndo,
  referenceChecks,
  toCopy,
  type UndoChangeInput,
} from "@/lib/assistant/undoPlan";

const NOW = new Date("2026-11-26T12:00:00.000Z");
const T = "2026-11-26T10:00:00.000Z";

const reward = (id: string, over: Record<string, unknown> = {}) => ({
  id, ownerId: "uA", title: "ZZZ Assistant Test", emoji: null, cost: 10, repeatable: false,
  sortOrder: 0, createdById: null, createdAt: T, updatedAt: T, ...over,
});
const adjustment = (id: string, over: Record<string, unknown> = {}) => ({
  id, userId: "uA", amount: 5, note: "ZZZ", createdById: null, createdAt: T, ...over,
});

function change(
  model: string,
  recordId: string,
  action: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): UndoChangeInput {
  return { model, recordId, action, summary: encodeChangeSummary({ detail: {}, before, after }) };
}

function plan(changes: UndoChangeInput[]) {
  return planUndo({
    request: { status: 200, path: "/x", createdAt: new Date(NOW.getTime() - 1000) },
    changes,
    now: NOW,
    undoPath: "/api/assistant/v1/audit/req1/undo",
    alreadyUndone: false,
  });
}

function steps(changes: UndoChangeInput[]) {
  const p = plan(changes);
  assert.ok(p.ok);
  return p.steps;
}

test("undoing a reward create removes it and checks for redemptions", () => {
  const s = steps([change("Reward", "r1", "create", null, reward("r1"))]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.model}`), ["remove:Reward"]);
  const checks = referenceChecks(s);
  assert.equal(checks.length, 1);
  assert.equal(checks[0].ref.child, "RewardRedemption");
  assert.equal(checks[0].ref.column, "rewardId");
  assert.deepEqual(checks[0].exclude, []); // a redemption is never removed by a plan
});

test("undoing a reward edit restores the old row", () => {
  const s = steps([change("Reward", "r1", "update", reward("r1", { cost: null }), reward("r1", { cost: 10 }))]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.model}`), ["restore:Reward"]);
  assert.equal(fromCopy("Reward", s[0].before!).cost, null);
  assert.deepEqual(referenceChecks(s), []);
});

test("undoing a reward delete re-creates it, pointing at the owner (refuse) and the creator (null)", () => {
  const s = steps([change("Reward", "r1", "delete", reward("r1"), null)]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.model}`), ["recreate:Reward"]);
  assert.deepEqual(FOREIGN_KEYS.Reward, [
    { column: "ownerId", parent: "User", onMissing: "refuse" },
    { column: "createdById", parent: "User", onMissing: "null" },
  ]);
  assert.deepEqual(FOREIGN_KEYS.StarAdjustment, [
    { column: "userId", parent: "User", onMissing: "refuse" },
    { column: "createdById", parent: "User", onMissing: "null" },
  ]);
});

test("undoing a star adjustment create removes it with no reference check", () => {
  const s = steps([change("StarAdjustment", "a1", "create", null, adjustment("a1"))]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.model}`), ["remove:StarAdjustment"]);
  assert.deepEqual(referenceChecks(s), []);
});

test("a reward or adjustment copy missing a column is not undoable", () => {
  const { sortOrder: _sortOrder, ...partialReward } = reward("r1");
  void _sortOrder;
  const a = plan([change("Reward", "r1", "create", null, partialReward)]);
  assert.deepEqual(a, { ok: false, reason: "not_undoable" });
  const { note: _note, ...partialAdjustment } = adjustment("a1");
  void _note;
  const b = plan([change("StarAdjustment", "a1", "create", null, partialAdjustment)]);
  assert.deepEqual(b, { ok: false, reason: "not_undoable" });
});

test("dates round-trip through toCopy and fromCopy", () => {
  const row = { ...reward("r1"), createdAt: new Date(T), updatedAt: new Date(T) };
  const copy = toCopy("Reward", row);
  assert.equal(copy.createdAt, T);
  const back = fromCopy("Reward", copy);
  assert.ok(back.createdAt instanceof Date);
  assert.equal((back.updatedAt as Date).toISOString(), T);

  const adj = toCopy("StarAdjustment", { ...adjustment("a1"), createdAt: new Date(T) });
  assert.equal((fromCopy("StarAdjustment", adj).createdAt as Date).toISOString(), T);
});

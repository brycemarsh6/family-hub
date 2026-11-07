// Tests for undoPlan.ts and undoWork.ts: goals, check-ins, plan items and
// vision statements (mission 50). The general rules are in undoPlan.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import {
  findStale,
  fromCopy,
  planUndo,
  referenceChecks,
  sameCopy,
  type UndoChangeInput,
} from "@/lib/assistant/undoPlan";
import { goalWork, streakWork } from "@/lib/assistant/undoWork";

const NOW = new Date("2026-11-07T12:00:00.000Z");
const T = "2026-11-07T10:00:00.000Z";

const goal = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: "ZZZ Assistant Test", area: "health", why: null, targetDate: null, ownerId: null,
  visibility: "shared", measureUnit: "lb", startValue: 90, targetValue: 70, currentValue: 90,
  checkedInAt: null, completedAt: null, createdById: null, createdAt: T, updatedAt: T, ...over,
});
const checkIn = (id: string, goalId: string, value: number) => ({
  id, goalId, value, at: T, createdById: null,
});
const item = (id: string, goalId: string, over: Record<string, unknown> = {}) => ({
  id, goalId, title: "ZZZ item", kind: "reminder", timesPerPeriod: null, period: null,
  doneAt: null, sortOrder: 0, habitId: null, createdAt: T, updatedAt: T, ...over,
});
const habit = (id: string) => ({
  id, title: "ZZZ item", kind: "habit", mode: "build", icon: null, lifeArea: null,
  timeOfDay: null, schedule: "daily", weekdays: null, times: null, anchorWeek: null,
  carryOver: false, track: "checks", weeklyMinutes: null, paceDays: null, hoursSince: null,
  sharing: "each", isPrivate: false, everyone: false, archivedAt: null, createdById: null,
  createdAt: T, updatedAt: T,
});
const participant = (id: string, habitId: string, userId: string) => ({
  id, habitId, userId, sortOrder: 0, currentStreak: 0, bestStreak: 0, streakAsOf: null, joinedAt: T,
});
const vision = (id: string, text: string) => ({
  id, area: "health", horizon: 5, ownerId: null, boardKey: "together", text,
  updatedById: null, createdAt: T, updatedAt: T,
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

function steps(changes: UndoChangeInput[]) {
  const p = planUndo({
    request: { status: 200, path: "/x", createdAt: new Date(NOW.getTime() - 1000) },
    changes,
    now: NOW,
    undoPath: "/api/assistant/v1/audit/req1/undo",
    alreadyUndone: false,
  });
  assert.ok(p.ok);
  return p.steps;
}

const order = (s: ReturnType<typeof steps>) => s.map((x) => `${x.kind}:${x.model}`);

test("undoing a goal create removes its check-in and plan item before the goal", () => {
  const s = steps([
    change("Goal", "g1", "create", null, goal("g1")),
    change("GoalCheckIn", "c1", "create", null, checkIn("c1", "g1", 80)),
    change("PlanItem", "i1", "create", null, item("i1", "g1")),
  ]);
  assert.deepEqual(order(s), ["remove:GoalCheckIn", "remove:PlanItem", "remove:Goal"]);
  // Both children go with the goal, so neither counts as in use.
  const checks = referenceChecks(s);
  assert.deepEqual(checks.find((c) => c.model === "Goal" && c.ref.child === "GoalCheckIn")!.exclude, ["c1"]);
  assert.deepEqual(checks.find((c) => c.model === "Goal" && c.ref.child === "PlanItem")!.exclude, ["i1"]);
  // A plan log is not covered by undo: it always counts.
  const logs = checks.find((c) => c.model === "PlanItem" && c.ref.child === "PlanLog")!;
  assert.deepEqual(logs.exclude, []);
});

test("a goal removed with a family plan item left on it is in use", () => {
  const checks = referenceChecks(steps([change("Goal", "g1", "create", null, goal("g1"))]));
  const items = checks.find((c) => c.ref.child === "PlanItem")!;
  assert.deepEqual(items.exclude, []);
});

test("undoing a habit plan item create removes the item and participants before the habit", () => {
  const s = steps([
    change("PlanItem", "i1", "create", null, item("i1", "g1", { kind: "habit", habitId: "h1" })),
    change("Habit", "h1", "create", null, habit("h1")),
    change("HabitParticipant", "p1", "create", null, participant("p1", "h1", "uA")),
  ]);
  assert.deepEqual(order(s), ["remove:HabitParticipant", "remove:PlanItem", "remove:Habit"]);
  const onHabit = referenceChecks(s).find((c) => c.model === "Habit" && c.ref.child === "PlanItem")!;
  assert.deepEqual(onHabit.exclude, ["i1"]); // not in_use
  const people = referenceChecks(s).find((c) => c.model === "Habit" && c.ref.child === "HabitParticipant")!;
  assert.deepEqual(people.exclude, ["p1"]);
});

test("undoing reminder to habit restores the item and removes the habit; the item is not a reference", () => {
  const s = steps([
    change("PlanItem", "i1", "update", item("i1", "g1"), item("i1", "g1", { kind: "habit", habitId: "h1" })),
    change("Habit", "h1", "create", null, habit("h1")),
    change("HabitParticipant", "p1", "create", null, participant("p1", "h1", "uA")),
  ]);
  assert.deepEqual(order(s), ["restore:PlanItem", "remove:HabitParticipant", "remove:Habit"]);
  const onHabit = referenceChecks(s).find((c) => c.model === "Habit" && c.ref.child === "PlanItem")!;
  assert.deepEqual(onHabit.exclude, ["i1"]);
  assert.equal(fromCopy("PlanItem", s[0].before!).habitId, null);
});

test("a restored plan item that still points at the habit keeps counting", () => {
  const s = steps([
    change("PlanItem", "i1", "update", item("i1", "g1", { habitId: "h1", title: "a" }), item("i1", "g1", { habitId: "h1", title: "b" })),
    change("Habit", "h1", "create", null, habit("h1")),
  ]);
  const onHabit = referenceChecks(s).find((c) => c.model === "Habit" && c.ref.child === "PlanItem")!;
  assert.deepEqual(onHabit.exclude, []);
});

test("undoing an undo of reminder to habit re-creates the habit before restoring the item", () => {
  // The first undo: item back to a reminder, habit removed. Its undo (the redo):
  // item points at the habit again, habit and participant come back.
  const s = steps([
    change("PlanItem", "i1", "update", item("i1", "g1", { kind: "habit", habitId: "h1" }), item("i1", "g1")),
    change("Habit", "h1", "delete", habit("h1"), null),
    change("HabitParticipant", "p1", "delete", participant("p1", "h1", "uA"), null),
  ]);
  assert.deepEqual(order(s), ["recreate:Habit", "restore:PlanItem", "recreate:HabitParticipant"]);
});

test("a goal copy that differs only in the number cache is not stale and restores without it", () => {
  const after = goal("g1", { title: "b", currentValue: 78, checkedInAt: T });
  const s = steps([change("Goal", "g1", "update", goal("g1", { title: "a" }), after)]);
  const now = goal("g1", { title: "b", currentValue: 80, checkedInAt: "2026-11-07T09:00:00.000Z" });
  assert.equal(sameCopy("Goal", now, after), true);
  assert.deepEqual(findStale(s, new Map([["Goal:g1", now]])), []);
  const out = fromCopy("Goal", s[0].before!);
  assert.equal("currentValue" in out, false);
  assert.equal("checkedInAt" in out, false);
  assert.equal(out.title, "a");
  // A real column still counts.
  const moved = goal("g1", { title: "c" });
  assert.deepEqual(findStale(s, new Map([["Goal:g1", moved]])).map((r) => r.problem), ["changed"]);
});

test("goal dates come back as dates", () => {
  const out = fromCopy("Goal", goal("g1", { targetDate: "2026-12-31T00:00:00.000Z", completedAt: T }));
  assert.ok(out.targetDate instanceof Date);
  assert.ok(out.completedAt instanceof Date);
  assert.ok(fromCopy("GoalCheckIn", checkIn("c1", "g1", 80)).at instanceof Date);
  assert.ok(fromCopy("PlanItem", item("i1", "g1", { doneAt: T })).doneAt instanceof Date);
});

test("a vision save on an empty slot undoes by removing it, an overwrite by restoring", () => {
  assert.deepEqual(order(steps([change("VisionStatement", "v1", "create", null, vision("v1", "x"))])), ["remove:VisionStatement"]);
  const s = steps([change("VisionStatement", "v1", "update", vision("v1", "x"), vision("v1", "y"))]);
  assert.equal(s[0].kind, "restore");
  assert.equal(fromCopy("VisionStatement", s[0].before!).text, "x");
});

test("goalWork names goals from Goal and check-in steps, from either copy, and skips removed goals", () => {
  const s = steps([
    change("GoalCheckIn", "c1", "create", null, checkIn("c1", "g1", 78)),
    change("GoalCheckIn", "c2", "delete", checkIn("c2", "g2", 80), null),
    change("Goal", "g3", "update", goal("g3", { title: "a" }), goal("g3", { title: "b" })),
    change("Goal", "g4", "create", null, goal("g4")),
    change("GoalCheckIn", "c4", "create", null, checkIn("c4", "g4", 85)),
    change("PlanItem", "i1", "create", null, item("i1", "g5")),
  ]);
  assert.deepEqual(goalWork(s), ["g1", "g2", "g3"]);
});

test("goalWork keeps a goal that is re-created", () => {
  const s = steps([
    change("Goal", "g1", "delete", goal("g1"), null),
    change("GoalCheckIn", "c1", "delete", checkIn("c1", "g1", 80), null),
  ]);
  assert.deepEqual(goalWork(s), ["g1"]);
});

test("streakWork still groups from undoWork.ts", () => {
  const work = streakWork(steps([
    change("HabitParticipant", "p1", "create", null, participant("p1", "h1", "uA")),
  ]));
  assert.deepEqual(work.choreUsers, ["uA"]);
  assert.deepEqual([...work.users], [["h1", ["uA"]]]);
});

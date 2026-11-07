// Tests for undoPlan.ts: habits (mission 47). The general rules are in the
// sibling undoPlan.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeChangeSummary } from "@/lib/assistant/changeCopy";
import {
  findStale,
  fromCopy,
  planUndo,
  referenceChecks,
  sameCopy,
  streakWork,
  type UndoChangeInput,
} from "@/lib/assistant/undoPlan";

const NOW = new Date("2026-11-06T12:00:00.000Z");
const T = "2026-11-06T10:00:00.000Z";
const D = "2026-11-05T00:00:00.000Z";

const habit = (id: string, over: Record<string, unknown> = {}) => ({
  id, title: "ZZZ Assistant Test", kind: "habit", mode: "build", icon: null, lifeArea: null,
  timeOfDay: null, schedule: "daily", weekdays: null, times: null, anchorWeek: null,
  carryOver: false, track: "checks", weeklyMinutes: null, paceDays: null, hoursSince: null,
  sharing: "each", isPrivate: false, everyone: false, archivedAt: null, createdById: null,
  createdAt: T, updatedAt: T, ...over,
});
const participant = (id: string, habitId: string, userId: string, over: Record<string, unknown> = {}) => ({
  id, habitId, userId, sortOrder: 0, currentStreak: 0, bestStreak: 0, streakAsOf: null, joinedAt: T, ...over,
});
const log = (id: string, habitId: string, userId: string) => ({
  id, habitId, userId, day: D, status: "done", loggedById: null, createdAt: T,
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

test("undoing a habit create removes the participants before the habit", () => {
  const s = steps([
    change("Habit", "h1", "create", null, habit("h1")),
    change("HabitParticipant", "p1", "create", null, participant("p1", "h1", "uA")),
    change("HabitParticipant", "p2", "create", null, participant("p2", "h1", "uB")),
  ]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.model}`), [
    "remove:HabitParticipant", "remove:HabitParticipant", "remove:Habit",
  ]);
  // Both participants are removed by the plan, so they do not count as in use;
  // the models undo does not cover always do.
  const checks = referenceChecks(s);
  const participants = checks.find((c) => c.ref.child === "HabitParticipant")!;
  assert.deepEqual([...participants.exclude].sort(), ["p1", "p2"]);
  assert.ok(checks.some((c) => c.ref.child === "PlanItem" && c.exclude.length === 0));
});

test("undoing a check on a Together habit removes every participant's log", () => {
  const s = steps([
    change("HabitLog", "l1", "create", null, log("l1", "h1", "uA")),
    change("HabitLog", "l2", "create", null, log("l2", "h1", "uB")),
  ]);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.recordId}`), ["remove:l1", "remove:l2"]);
});

test("a participant copy that differs only in streak columns is not stale", () => {
  const after = participant("p1", "h1", "uA");
  const s = steps([change("HabitParticipant", "p1", "update", participant("p1", "h1", "uA", { sortOrder: 1 }), after)]);
  const now = participant("p1", "h1", "uA", { currentStreak: 3, bestStreak: 5, streakAsOf: D });
  assert.equal(sameCopy("HabitParticipant", now, after), true);
  assert.deepEqual(findStale(s, new Map([["HabitParticipant:p1", now]])), []);
  // A real column still counts.
  const moved = participant("p1", "h1", "uA", { sortOrder: 9 });
  assert.deepEqual(findStale(s, new Map([["HabitParticipant:p1", moved]])).map((r) => r.problem), ["changed"]);
});

test("a participant restore neither matches on nor writes the streak columns", () => {
  const copy = participant("p1", "h1", "uA", { currentStreak: 4, bestStreak: 6, streakAsOf: D });
  const out = fromCopy("HabitParticipant", copy);
  assert.equal("currentStreak" in out, false);
  assert.equal("bestStreak" in out, false);
  assert.equal("streakAsOf" in out, false);
  assert.equal(out.sortOrder, 0);
  assert.ok(out.joinedAt instanceof Date);
});

test("a habit edit restores in place", () => {
  const s = steps([change("Habit", "h1", "update", habit("h1"), habit("h1", { title: "ZZZ renamed" }))]);
  assert.equal(s.length, 1);
  assert.equal(s[0].kind, "restore");
  assert.equal(fromCopy("Habit", s[0].before!).title, "ZZZ Assistant Test");
  assert.ok(fromCopy("Habit", s[0].before!).createdAt instanceof Date);
});

test("a deleted log comes back with its day as a date", () => {
  const s = steps([change("HabitLog", "l1", "delete", log("l1", "h1", "uA"), null)]);
  assert.equal(s[0].kind, "recreate");
  assert.ok(fromCopy("HabitLog", s[0].before!).day instanceof Date);
});

test("streakWork groups people per habit from either copy and ignores removed habits", () => {
  const s = steps([
    change("Habit", "h1", "update", habit("h1"), habit("h1", { title: "x" })),
    change("Habit", "h2", "create", null, habit("h2")),
    change("HabitParticipant", "p1", "create", null, participant("p1", "h2", "uB")),
    change("HabitLog", "l1", "create", null, log("l1", "h1", "uB")),
    change("HabitLog", "l2", "create", null, log("l2", "h1", "uA")),
    change("HabitLog", "l3", "delete", log("l3", "h1", "uA"), null),
    change("HabitTimeEntry", "t1", "create", null, { ...log("t1", "h3", "uA"), minutes: 30 }),
  ]);
  const work = streakWork(s);
  assert.deepEqual([...work.users], [["h1", ["uA", "uB"]], ["h2", ["uB"]], ["h3", ["uA"]]].sort());
  // h1 restored, h2 removed (create undone): only h1 is rebuilt as a habit.
  assert.deepEqual(work.habits, ["h1"]);
});

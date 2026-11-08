import { test } from "node:test";
import assert from "node:assert/strict";
import type { GoalView, PlanItemView } from "@/lib/goals";
import {
  changedColumns,
  checkInChange,
  goalCreateChange,
  goalUpdateChange,
  planItemCreateChanges,
  planItemEditChangedAnything,
  planItemUpdateChanges,
  toGoalDetail,
  toGoalSummary,
  toVisionBoards,
  toWeek,
  visionChange,
} from "./serializeGoals";

const NOW = new Date("2026-11-07T18:00:00Z");

const item = (over: Partial<PlanItemView> = {}): PlanItemView => ({
  id: "i1", goalId: "g1", title: "Walk", kind: "habit", timesPerPeriod: 3, period: "week", habitId: "h1", doneAt: null,
  sortOrder: 0, createdAt: NOW, count: 1, target: 3, windowLabel: "this week", done: false, doneToday: false, ...over,
});

const view = (over: Partial<GoalView> = {}): GoalView => ({
  id: "g1", title: "Run", area: "health", why: null, targetDate: new Date("2026-12-31T00:00:00Z"), ownerId: "bryce",
  owner: { id: "bryce", displayName: "Secret Name", avatarColor: "red" }, visibility: "shared",
  measureUnit: "mi", startValue: 0, targetValue: 100, currentValue: 40, checkedInAt: NOW, completedAt: null, createdAt: NOW,
  items: [item()], checkIns: [], progress: 0.4, pace: "onPace", canEdit: true, canLog: true, ...over,
});

test("toGoalSummary: ids and words, the owner as an id only", () => {
  const out = toGoalSummary(view());
  assert.equal(out.ownerId, "bryce");
  assert.equal(out.ownership, "mine");
  assert.equal(out.targetDate, "2026-12-31");
  assert.equal(out.ongoing, false);
  assert.equal(out.planItemCount, 1);
  assert.deepEqual(out.latestCheckIn, { value: 40, at: NOW.toISOString() });
  assert.ok(!JSON.stringify(out).includes("Secret Name"));
  assert.ok(!JSON.stringify(out).includes("avatar"));
});

test("toGoalSummary: an ongoing Together goal with no number", () => {
  const out = toGoalSummary(view({ ownerId: null, owner: null, targetDate: null, measureUnit: null, startValue: null, targetValue: null, currentValue: null, checkedInAt: null }));
  assert.equal(out.ownership, "together");
  assert.equal(out.ownerId, null);
  assert.equal(out.ongoing, true);
  assert.equal(out.targetDate, null);
  assert.equal(out.number, null);
  assert.equal(out.latestCheckIn, null);
});

test("toGoalDetail: check-ins newest first as given, with which ones Winnie added", () => {
  const checkIns = [{ id: "c2", value: 78, at: NOW }, { id: "c1", value: 80, at: new Date("2026-11-06T00:00:00Z") }];
  const out = toGoalDetail(view({ checkIns }), { checkIns, madeByAssistant: new Set(["c2"]), vision: { board: "together", horizon: 10, text: "Healthy" }, createdByAssistant: true });
  assert.deepEqual(out.checkIns.map((c) => [c.id, c.createdByAssistant]), [["c2", true], ["c1", false]]);
  assert.equal(out.vision?.board, "together");
  assert.equal(out.createdByAssistant, true);
  assert.equal(out.planItems[0].habitId, "h1");
});

test("toWeek: rows in the app's order, a goal with nothing left out, the week's count and what is left", () => {
  const weekStart = { year: 2026, month: 11, day: 1 };
  const step = (id: string, over: Partial<PlanItemView> = {}) => item({ id, kind: "step", habitId: null, timesPerPeriod: null, period: null, windowLabel: null, count: 0, target: 1, ...over });
  const goals = [
    view({ items: [step("s1", { sortOrder: 0 }), item({ id: "h" }), item({ id: "r", kind: "reminder", habitId: null, windowLabel: null, target: 0, count: 0 })] }),
    view({ id: "g2", items: [] }),
  ];
  const out = toWeek({ goals, weekStart, recapDay: false, recap: null });
  assert.equal(out.goals.length, 1);
  assert.deepEqual(out.goals[0].planItems.map((p) => p.id), ["h", "s1", "r"]);
  assert.deepEqual(out.summary, { done: 1, total: 3 });
  assert.deepEqual(out.habitsLeft.map((h) => [h.planItemId, h.left]), [["h", 2]]);
  assert.deepEqual(out.nextSteps, [{ goalId: "g1", planItemId: "s1", title: "Walk" }]);
  assert.equal(out.recap, null);
  assert.equal(out.weekStart, "2026-11-01");
  assert.ok(!JSON.stringify(out).includes("Secret Name"));
});

test("toWeek: a step ticked this week stays above the next step; one ticked before the week does not", () => {
  const weekStart = { year: 2026, month: 11, day: 1 };
  const step = (id: string, doneAt: Date | null, sortOrder: number) =>
    item({ id, kind: "step", habitId: null, timesPerPeriod: null, period: null, windowLabel: null, count: 0, target: 1, doneAt, done: doneAt !== null, sortOrder });
  const goals = [view({ items: [step("old", new Date("2026-10-20T12:00:00Z"), 0), step("new", new Date("2026-11-03T12:00:00Z"), 1), step("next", null, 2)] })];
  const out = toWeek({ goals, weekStart, recapDay: true, recap: null });
  assert.deepEqual(out.goals[0].planItems.map((p) => p.id), ["new", "next"]);
  assert.equal(out.recapDay, true);
});

test("toVisionBoards: text per area or null, goal counts by board, and canEdit per board", () => {
  const out = toVisionBoards({
    boards: ["together", "bryce"],
    horizons: [10],
    rows: [{ boardKey: "together", area: "health", horizon: 10, text: "Strong" }, { boardKey: "together", area: "fun", horizon: 10, text: "  " }, { boardKey: "bryce", area: "health", horizon: 5, text: "Hidden at 5" }],
    goals: [
      { ownerId: null, area: "health", completedAt: null },
      { ownerId: "bryce", area: "health", completedAt: null },
      { ownerId: "bryce", area: "health", completedAt: NOW },
    ],
    canEdit: (board) => board === "bryce",
  });
  const together = out[0].horizons[0].cards;
  assert.equal(together.find((c) => c.area === "health")?.text, "Strong");
  assert.equal(together.find((c) => c.area === "health")?.goalCount, 1);
  assert.equal(together.find((c) => c.area === "fun")?.text, null);
  assert.equal(out[0].canEdit, false);
  assert.equal(out[1].canEdit, true);
  assert.equal(out[1].horizons[0].cards.find((c) => c.area === "health")?.text, null);
  assert.equal(out[1].horizons[0].cards.find((c) => c.area === "health")?.goalCount, 1);
  assert.equal(out[1].horizons[0].cards.length, 6);
});

// ---- Audit copies ----

const goalRow = (over: Record<string, unknown> = {}) => ({
  id: "g1", title: "Run", area: "health", why: null, targetDate: new Date("2026-12-31T00:00:00Z"), ownerId: "bryce", visibility: "shared",
  measureUnit: "mi", startValue: 0, targetValue: 100, currentValue: 80, checkedInAt: NOW, completedAt: null, createdById: null,
  createdAt: NOW, updatedAt: NOW, ...over,
});

test("goalCreateChange: the whole row as the after copy", () => {
  const entry = goalCreateChange(goalRow());
  assert.equal(entry.action, "create");
  assert.equal(entry.before, null);
  assert.equal((entry.after as Record<string, unknown>).title, "Run");
  assert.equal((entry.after as Record<string, unknown>).targetDate, "2026-12-31T00:00:00.000Z");
});

test("goalUpdateChange: both copies, the changed columns without updatedAt; nothing when the row was not written", () => {
  const later = new Date("2026-11-07T19:00:00Z");
  const before = goalRow();
  const after = goalRow({ currentValue: 78, checkedInAt: later, updatedAt: later });
  const [entry] = goalUpdateChange(before, after);
  assert.deepEqual((entry.summary as { changed: string[] }).changed, ["currentValue", "checkedInAt"]);
  assert.equal((entry.before as Record<string, unknown>).currentValue, 80);
  assert.equal((entry.after as Record<string, unknown>).currentValue, 78);
  assert.deepEqual(goalUpdateChange(before, goalRow()), []);
  // A write that moved only updatedAt is still on record, so the next undo sees the row it expects.
  const touched = goalUpdateChange(before, goalRow({ updatedAt: later }));
  assert.equal(touched.length, 1);
  assert.deepEqual(changedColumns(before, goalRow({ updatedAt: later }), "Goal"), []);
});

test("checkInChange: a create has an after copy only, a delete a before copy only", () => {
  const row = { id: "c1", goalId: "g1", value: 78, at: NOW, createdById: null };
  const made = checkInChange("create", row);
  assert.equal(made.before, null);
  assert.equal((made.after as Record<string, unknown>).value, 78);
  const gone = checkInChange("delete", row);
  assert.equal(gone.after, null);
  assert.equal((gone.before as Record<string, unknown>).at, NOW.toISOString());
});

const planRow = (over: Record<string, unknown> = {}) => ({
  id: "i1", goalId: "g1", title: "Walk", kind: "habit", timesPerPeriod: 3, period: "week", doneAt: null, sortOrder: 0, habitId: "h1",
  createdAt: NOW, updatedAt: NOW, ...over,
});
const habitRow = (over: Record<string, unknown> = {}) => ({
  id: "h1", title: "Walk", kind: "habit", mode: "build", icon: null, lifeArea: "health", timeOfDay: null, schedule: "weekly", weekdays: null,
  times: 3, anchorWeek: null, carryOver: false, sharing: "each", isPrivate: false, everyone: false, track: "checks", weeklyMinutes: null,
  paceDays: null, hoursSince: null, archivedAt: null, createdById: null, createdAt: NOW, updatedAt: NOW, ...over,
});
const partRow = { id: "p1", habitId: "h1", userId: "bryce", sortOrder: 0, joinedAt: NOW, currentStreak: 0, bestStreak: 0, streakAsOf: null };

test("planItemCreateChanges: the item, then the habit and its people it made", () => {
  const entries = planItemCreateChanges(planRow(), [habitRow()], [partRow]);
  assert.deepEqual(entries.map((e) => [e.model, e.action]), [["PlanItem", "create"], ["Habit", "create"], ["HabitParticipant", "create"]]);
  const none = planItemCreateChanges(planRow({ kind: "step", habitId: null }), [], []);
  assert.deepEqual(none.map((e) => e.model), ["PlanItem"]);
});

test("planItemUpdateChanges: a step turned habit records the item and the new habit; an untouched edit is no change", () => {
  const later = new Date("2026-11-07T19:00:00Z");
  const turned = {
    item: { before: planRow({ kind: "step", habitId: null }), after: planRow({ updatedAt: later }) },
    habits: { before: [], after: [habitRow()] },
    participants: { before: [], after: [partRow] },
  };
  assert.deepEqual(planItemUpdateChanges(turned).map((e) => [e.model, e.action]), [["PlanItem", "update"], ["Habit", "create"], ["HabitParticipant", "create"]]);
  assert.ok(planItemEditChangedAnything(turned));
  const same = {
    item: { before: planRow(), after: planRow({ updatedAt: later }) },
    habits: { before: [habitRow()], after: [habitRow({ updatedAt: later })] },
    participants: { before: [partRow], after: [partRow] },
  };
  assert.equal(planItemEditChangedAnything(same), false);
  const retitled = { ...same, item: { before: planRow(), after: planRow({ title: "Walk fast", updatedAt: later }) } };
  assert.ok(planItemEditChangedAnything(retitled));
});

test("visionChange: a create has no before copy, a replace has both", () => {
  const row = { id: "v1", area: "health", horizon: 10, ownerId: null, boardKey: "together", text: "Strong", updatedById: null, createdAt: NOW, updatedAt: NOW };
  const made = visionChange(null, row);
  assert.deepEqual([made.action, made.before], ["create", null]);
  const replaced = visionChange(row, { ...row, text: "Stronger" });
  assert.equal(replaced.action, "update");
  assert.equal((replaced.before as Record<string, unknown>).text, "Strong");
  assert.equal((replaced.after as Record<string, unknown>).text, "Stronger");
});

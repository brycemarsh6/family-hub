import { test } from "node:test";
import assert from "node:assert/strict";
import { checkHabitInput } from "@/lib/habits/habitInput";
import {
  habitChartQuery,
  habitCreateBody,
  habitHoursBody,
  habitInputFromRow,
  habitListQuery,
  habitPatchBody,
  habitTapBody,
  habitTapQuery,
  newHabitInput,
  patchedHabitInput,
} from "./schemasHabits";

const ok = (r: { success: boolean }) => r.success;
const HOUSEHOLD = ["bryce", "emily", "lucy"];

test("habitCreateBody: a title and exactly one of participantIds or everyone", () => {
  assert.ok(ok(habitCreateBody.safeParse({ title: "Read", participantIds: ["bryce"] })));
  assert.ok(ok(habitCreateBody.safeParse({ title: "Read", everyone: true })));
  assert.ok(!ok(habitCreateBody.safeParse({ title: "Read" })));
  assert.ok(!ok(habitCreateBody.safeParse({ title: "Read", participantIds: ["bryce"], everyone: true })));
  assert.ok(!ok(habitCreateBody.safeParse({ participantIds: ["bryce"] })));
  assert.ok(!ok(habitCreateBody.safeParse({ title: "Read", everyone: false })));
});

test("habitCreateBody: isPrivate and any other unknown key are a 400, not ignored", () => {
  assert.ok(!ok(habitCreateBody.safeParse({ title: "Read", participantIds: ["bryce"], isPrivate: true })));
  assert.ok(!ok(habitCreateBody.safeParse({ title: "Read", participantIds: ["bryce"], createdById: "x" })));
});

test("habitCreateBody: vocabulary and shapes are enforced", () => {
  const base = { title: "Read", participantIds: ["bryce"] };
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, kind: "task" })));
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, schedule: "yearly" })));
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, weekdays: "monday" })));
  assert.ok(ok(habitCreateBody.safeParse({ ...base, weekdays: "0111110" })));
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, anchorWeek: "2026-02-30" })));
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, icon: "NotAnIcon" })));
  assert.ok(ok(habitCreateBody.safeParse({ ...base, icon: "Dumbbell", lifeArea: "health", timeOfDay: "morning" })));
  assert.ok(!ok(habitCreateBody.safeParse({ ...base, weeklyHours: 2.5 })));
});

test("habitPatchBody: at least one field; archived alone is enough; people one way only", () => {
  assert.ok(!ok(habitPatchBody.safeParse({})));
  assert.ok(ok(habitPatchBody.safeParse({ archived: true })));
  assert.ok(ok(habitPatchBody.safeParse({ title: "New" })));
  assert.ok(ok(habitPatchBody.safeParse({ icon: null })));
  assert.ok(!ok(habitPatchBody.safeParse({ participantIds: ["a"], everyone: true })));
  assert.ok(!ok(habitPatchBody.safeParse({ isPrivate: true })));
});

test("query and tap bodies: strict, personId required where a person is named", () => {
  assert.ok(ok(habitListQuery.safeParse({})));
  assert.ok(ok(habitListQuery.safeParse({ personId: "p", includeArchived: "true" })));
  assert.ok(!ok(habitListQuery.safeParse({ includeArchived: "yes" })));
  assert.ok(!ok(habitChartQuery.safeParse({})));
  assert.ok(ok(habitTapBody.safeParse({ personId: "p" })));
  assert.ok(ok(habitTapBody.safeParse({ personId: "p", day: "2026-11-05" })));
  assert.ok(!ok(habitTapBody.safeParse({ personId: "p", day: "yesterday" })));
  assert.ok(!ok(habitTapBody.safeParse({ day: "2026-11-05" })));
  assert.ok(!ok(habitTapQuery.safeParse({ personId: "p", extra: "1" })));
});

test("habitHoursBody: minutes need only be a whole number here (the shared rule gives the words)", () => {
  assert.ok(ok(habitHoursBody.safeParse({ personId: "p", minutes: 45 })));
  assert.ok(ok(habitHoursBody.safeParse({ personId: "p", minutes: 600 })));
  assert.ok(!ok(habitHoursBody.safeParse({ personId: "p", minutes: 45.5 })));
  assert.ok(!ok(habitHoursBody.safeParse({ personId: "p", minutes: "60" })));
  assert.ok(!ok(habitHoursBody.safeParse({ personId: "p" })));
});

const create = (body: unknown) => {
  const input = newHabitInput(habitCreateBody.parse(body), HOUSEHOLD);
  return { input, checked: checkHabitInput(input, HOUSEHOLD) };
};

test("newHabitInput: the defaults make a daily build habit, side by side, checks, no carry-over", () => {
  const { input, checked } = create({ title: " Read ", participantIds: ["bryce", "emily"] });
  assert.deepEqual(
    { kind: input.kind, mode: input.mode, schedule: input.schedule, sharing: input.sharing, track: input.track, carryOver: input.carryOver, isPrivate: input.isPrivate },
    { kind: "habit", mode: "build", schedule: "daily", sharing: "each", track: "checks", carryOver: false, isPrivate: false },
  );
  assert.ok(!("error" in checked));
  if (!("error" in checked)) assert.equal(checked.fields.title, "Read");
});

test("newHabitInput: weekly and monthly take times 1; a chore defaults to weekdays and needs the days", () => {
  assert.equal(create({ title: "Run", participantIds: ["bryce"], schedule: "weekly" }).input.times, 1);
  assert.equal(create({ title: "Bills", participantIds: ["bryce"], schedule: "monthly" }).input.times, 1);
  const chore = create({ title: "Trash", kind: "chore", participantIds: ["emily"] });
  assert.equal(chore.input.schedule, "weekdays");
  assert.deepEqual(chore.checked, { error: "Pick at least one day." });
  const withDays = create({ title: "Trash", kind: "chore", participantIds: ["emily"], weekdays: "0100000" });
  assert.ok(!("error" in withDays.checked));
});

test("newHabitInput: biweekly needs a Sunday anchor week, in the app's words", () => {
  assert.deepEqual(create({ title: "Car", participantIds: ["bryce"], schedule: "biweekly" }).checked, { error: "Pick which week it starts." });
  assert.ok(!("error" in create({ title: "Car", participantIds: ["bryce"], schedule: "biweekly", anchorWeek: "2026-11-01" }).checked));
  assert.deepEqual(create({ title: "Car", participantIds: ["bryce"], schedule: "biweekly", anchorWeek: "2026-11-02" }).checked, { error: "Pick which week it starts." });
});

test("newHabitInput: hours needs weeklyHours, counts monsat, and one person's is private", () => {
  assert.deepEqual(create({ title: "Study", participantIds: ["bryce"], track: "hours" }).checked, { error: "Pick 1 to 80 hours a week." });
  const mine = create({ title: "Study", participantIds: ["bryce"], track: "hours", weeklyHours: 10 });
  assert.equal(mine.input.paceDays, "monsat");
  assert.equal(mine.input.isPrivate, true);
  assert.ok(!("error" in mine.checked));
  const two = create({ title: "Study", participantIds: ["bryce", "emily"], track: "hours", weeklyHours: 10 });
  assert.equal(two.input.isPrivate, false);
  assert.equal(create({ title: "Study", everyone: true, track: "hours", weeklyHours: 10 }).input.isPrivate, false);
  assert.deepEqual(create({ title: "Study", participantIds: ["bryce"], track: "hours", weeklyHours: 90 }).checked, { error: "Pick 1 to 80 hours a week." });
  assert.deepEqual(create({ title: "Study", kind: "chore", participantIds: ["bryce"], track: "hours", weeklyHours: 5 }).checked, { error: "Hours are for habits, not chores." });
});

test("newHabitInput: everyone takes the whole household and sets the flag; strangers and Together-for-one are refused", () => {
  const all = create({ title: "Pray", everyone: true });
  assert.ok(!("error" in all.checked));
  if (!("error" in all.checked)) {
    assert.deepEqual(all.checked.participantIds, HOUSEHOLD);
    assert.equal(all.checked.everyone, true);
  }
  assert.deepEqual(create({ title: "Pray", participantIds: ["stranger"] }).checked, { error: "Pick who it is for." });
  assert.deepEqual(create({ title: "Pray", participantIds: [] }).checked, { error: "Pick who it is for." });
  assert.deepEqual(create({ title: "Pray", participantIds: ["bryce"], sharing: "together" }).checked, { error: "Pick at least two people, or choose Just me." });
  assert.deepEqual(create({ title: "  ", participantIds: ["bryce"] }).checked, { error: "Give it a name." });
});

const stored = {
  title: "Read",
  kind: "habit",
  mode: "build",
  icon: null,
  lifeArea: null,
  timeOfDay: null,
  schedule: "daily",
  weekdays: null,
  times: null,
  anchorWeek: null,
  carryOver: false,
  sharing: "each",
  isPrivate: false,
  everyone: false,
  track: "checks",
  weeklyMinutes: null,
  paceDays: null,
};

test("habitInputFromRow then no changes: the form accepts it back unchanged", () => {
  const input = habitInputFromRow(stored, ["bryce", "emily"]);
  const checked = checkHabitInput(patchedHabitInput(input, habitPatchBody.parse({ title: "Read" })), HOUSEHOLD, ["bryce", "emily"]);
  assert.ok(!("error" in checked));
});

test("habitInputFromRow: an hours habit reads back in hours; an anchor week as a date", () => {
  const input = habitInputFromRow(
    { ...stored, track: "hours", schedule: "weekly", times: 1, weeklyMinutes: 600, paceDays: "monsat", anchorWeek: new Date("2026-11-01T00:00:00Z") },
    ["bryce"],
  );
  assert.equal(input.weeklyHours, 10);
  assert.equal(input.anchorWeek, "2026-11-01");
});

test("patchedHabitInput: what is left out stays, isPrivate never moves, naming people replaces them", () => {
  const current = habitInputFromRow({ ...stored, isPrivate: true }, ["bryce"]);
  const next = patchedHabitInput(current, habitPatchBody.parse({ title: "Reread", participantIds: ["emily"] }));
  assert.equal(next.title, "Reread");
  assert.equal(next.kind, "habit");
  assert.equal(next.isPrivate, true);
  assert.deepEqual(next.participantIds, ["emily"]);
  assert.equal(next.everyone, false);
  const all = patchedHabitInput(current, habitPatchBody.parse({ everyone: true }));
  assert.equal(all.everyone, true);
  assert.deepEqual(all.participantIds, []);
  assert.equal(patchedHabitInput(current, habitPatchBody.parse({ icon: "Dumbbell" })).icon, "Dumbbell");
  assert.equal(patchedHabitInput({ ...current, icon: "Dumbbell" }, habitPatchBody.parse({ icon: null })).icon, null);
});

test("patchedHabitInput: a private habit given a second person is refused in the app's words", () => {
  const current = habitInputFromRow({ ...stored, isPrivate: true }, ["bryce"]);
  const checked = checkHabitInput(patchedHabitInput(current, habitPatchBody.parse({ participantIds: ["bryce", "emily"] })), HOUSEHOLD, ["bryce"]);
  assert.deepEqual(checked, { error: "Only a habit for one person can be private." });
});

test("patchedHabitInput: a schedule moving to weekly takes times 1; to hours needs weeklyHours", () => {
  const current = habitInputFromRow(stored, ["bryce"]);
  assert.equal(patchedHabitInput(current, habitPatchBody.parse({ schedule: "weekly" })).times, 1);
  assert.deepEqual(
    checkHabitInput(patchedHabitInput(current, habitPatchBody.parse({ track: "hours" })), HOUSEHOLD, ["bryce"]),
    { error: "Pick 1 to 80 hours a week." },
  );
  assert.ok(!("error" in checkHabitInput(patchedHabitInput(current, habitPatchBody.parse({ track: "hours", weeklyHours: 4 })), HOUSEHOLD, ["bryce"])));
});

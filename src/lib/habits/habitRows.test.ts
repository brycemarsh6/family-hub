// Pins habitRows.ts: stored rows to engine shapes, whose rows a check
// writes, and the columns a create or update sends. Stored days are UTC
// midnight, so the results are the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkTargetUserIds,
  habitColumns,
  logDayFromRow,
  logsForUser,
  scheduleChanged,
  specFromRow,
  vacationFromRow,
  type HabitFields,
} from "./habitRows";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

test("log and vacation rows become engine shapes; an odd status is repaired to done", () => {
  assert.deepEqual(logDayFromRow({ day: utc(2026, 11, 3), status: "skipped", userId: "a" }), {
    day: { year: 2026, month: 11, day: 3 },
    status: "skipped",
    userId: "a",
  });
  assert.equal(logDayFromRow({ day: utc(2026, 11, 3), status: "weird", userId: "a" }).status, "done");
  assert.deepEqual(vacationFromRow({ startDay: utc(2026, 11, 1), endDay: utc(2026, 11, 8) }), {
    start: { year: 2026, month: 11, day: 1 },
    end: { year: 2026, month: 11, day: 8 },
  });
});

test("specFromRow reads weekly, biweekly (anchor converted) and rejects an unschedulable row", () => {
  assert.deepEqual(specFromRow({ schedule: "weekly", weekdays: null, times: 3, anchorWeek: null }), {
    schedule: "weekly",
    times: 3,
  });
  assert.deepEqual(
    specFromRow({ schedule: "biweekly", weekdays: "0100000", times: null, anchorWeek: utc(2026, 11, 1) }),
    { schedule: "biweekly", days: [1], anchorWeek: { year: 2026, month: 11, day: 1 } },
  );
  assert.equal(specFromRow({ schedule: "biweekly", weekdays: "0100000", times: null, anchorWeek: null }), null);
});

test("scheduleChanged notices each schedule column and ignores an identical anchor", () => {
  const base = { schedule: "weekly", weekdays: null, times: 3, anchorWeek: utc(2026, 11, 1) };
  assert.equal(scheduleChanged(base, { ...base, anchorWeek: utc(2026, 11, 1) }), false);
  assert.equal(scheduleChanged(base, { ...base, times: 4 }), true);
  assert.equal(scheduleChanged(base, { ...base, schedule: "daily" }), true);
  assert.equal(scheduleChanged(base, { ...base, weekdays: "0100000" }), true);
  assert.equal(scheduleChanged(base, { ...base, anchorWeek: null }), true);
});

test("a Together check writes every participant, an Each check only the one person", () => {
  const people = ["a", "b", "c"];
  assert.deepEqual(checkTargetUserIds("together", people, "b"), ["a", "b", "c"]);
  assert.deepEqual(checkTargetUserIds("each", people, "b"), ["b"]);
  assert.deepEqual(checkTargetUserIds("odd", people, "b"), ["b"]);
});

test("a non-participant gets no rows, for either sharing", () => {
  assert.deepEqual(checkTargetUserIds("together", ["a"], "z"), []);
  assert.deepEqual(checkTargetUserIds("each", ["a"], "z"), []);
});

test("logsForUser keeps one person's rows", () => {
  const day = { year: 2026, month: 11, day: 3 };
  const logs = [
    { day, status: "done" as const, userId: "a" },
    { day, status: "done" as const, userId: "b" },
  ];
  assert.deepEqual(logsForUser(logs, "b"), [logs[1]]);
});

test("habitColumns sends only the given keys, repaired and trimmed", () => {
  assert.deepEqual(habitColumns({}), {});
  assert.deepEqual(habitColumns({ title: "  Walk  ", kind: "nope", schedule: "weird", sharing: "x", times: 3.9 } as unknown as HabitFields), {
    title: "Walk",
    kind: "habit",
    schedule: "daily",
    sharing: "each",
    times: 3,
  });
});

test("habitColumns stores the anchor week at UTC midnight and lets null clear", () => {
  assert.deepEqual(habitColumns({ anchorWeek: { year: 2026, month: 11, day: 1 } }).anchorWeek, utc(2026, 11, 1));
  assert.deepEqual(habitColumns({ anchorWeek: null, times: null, icon: null, timeOfDay: "noon" }), {
    anchorWeek: null,
    times: null,
    icon: null,
    timeOfDay: null,
  });
});

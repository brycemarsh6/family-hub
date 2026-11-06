// Pins scheduleHabitDays.ts: planned habit days fold into the Schedule rows.

import { test } from "node:test";
import assert from "node:assert/strict";
import { addHabitDaysToSchedule, coversWindow } from "./scheduleHabitDays";
import type { ScheduleRenderMonth } from "./scheduleWindowState";
import type { CalendarHabitDayView } from "./types";

function item(y: number, m: number, d: number, id = "h"): CalendarHabitDayView {
  return { id: `${id}:${y}-${m + 1}-${d}`, habitId: id, title: "Run", icon: null, kind: "habit", dayInstant: new Date(Date.UTC(y, m, d)), done: false };
}
const day = (y: number, m: number, d: number) => new Date(y, m, d);
const start = day(2026, 10, 1);
const end = day(2026, 11, 15);

test("an existing row gains its habit days", () => {
  const months: ScheduleRenderMonth[] = [{ monthStart: day(2026, 10, 1), days: [{ day: day(2026, 10, 9), events: [], tasks: [] }] }];
  const out = addHabitDaysToSchedule(months, [item(2026, 10, 9)], start, end);
  assert.equal(out[0].days.length, 1);
  assert.equal(out[0].days[0].habitDays.length, 1);
});

test("a habit-only day gets its own row, in order, across months", () => {
  const months: ScheduleRenderMonth[] = [{ monthStart: day(2026, 10, 1), days: [{ day: day(2026, 10, 20), events: [], tasks: [] }] }];
  const out = addHabitDaysToSchedule(months, [item(2026, 10, 9), item(2026, 11, 2)], start, end);
  assert.deepEqual(out.map((m) => m.days.map((d) => d.day.getDate())), [[9, 20], [2]]);
  assert.equal(out[0].days[1].habitDays.length, 0);
});

test("days outside the loaded window are ignored; no habit days changes nothing", () => {
  const months: ScheduleRenderMonth[] = [{ monthStart: day(2026, 10, 1), days: [{ day: day(2026, 10, 20), events: [], tasks: [] }] }];
  const out = addHabitDaysToSchedule(months, [item(2026, 9, 30), item(2026, 11, 15)], start, end);
  assert.equal(out[0].days.length, 1);
  assert.equal(out.length, 1);
  assert.equal(addHabitDaysToSchedule(months, [], start, end)[0].days[0].habitDays.length, 0);
});

test("coversWindow: not loaded until the coverage holds the whole window, even after it grows", () => {
  const first = { start: 100, end: 200 };
  assert.equal(coversWindow(null, 100, 200), false);
  assert.equal(coversWindow(first, 100, 200), true);
  assert.equal(coversWindow(first, 120, 180), true);
  // The window grew past the first coverage: false until a second fetch covers it.
  assert.equal(coversWindow(first, 100, 260), false);
  assert.equal(coversWindow(first, 40, 200), false);
  assert.equal(coversWindow({ start: 40, end: 260 }, 40, 260), true);
  // A jump elsewhere is not covered either.
  assert.equal(coversWindow(first, 500, 600), false);
});

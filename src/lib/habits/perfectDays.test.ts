// Pins perfectDays.ts (decision 71): a perfect day is every required habit
// done or skipped; chores never count; a day with nothing required is null.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { CalendarDate } from "../householdDate";
import { isPerfectDay, perfectDaysInRange, type DayEntry } from "./perfectDays";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });
const habit = (state: DayEntry["state"], status: DayEntry["status"]): DayEntry => ({ kind: "habit", state, status });

test("isPerfectDay: every required habit done or skipped", () => {
  assert.equal(isPerfectDay([habit("required", "done"), habit("required", "skipped")]), true);
  assert.equal(isPerfectDay([habit("required", "done"), habit("required", null)]), false);
});

test("isPerfectDay: a late row keeps the day missed", () => {
  assert.equal(isPerfectDay([habit("required", "late")]), false);
});

test("isPerfectDay: open and none items are not required, chores never count", () => {
  assert.equal(isPerfectDay([habit("required", "done"), habit("open", null), habit("none", null)]), true);
  assert.equal(isPerfectDay([habit("required", "done"), { kind: "chore", state: "required", status: null }]), true);
});

test("isPerfectDay: null when nothing was required", () => {
  assert.equal(isPerfectDay([]), null);
  assert.equal(isPerfectDay([habit("open", null), { kind: "chore", state: "required", status: null }]), null);
});

test("perfectDaysInRange: lists perfect days only, ends included, across the clock change", () => {
  const entriesFor = (day: CalendarDate): DayEntry[] => {
    if (day.month === 11 && day.day === 1) return [habit("required", "done")]; // the day clocks fell back
    if (day.month === 11 && day.day === 2) return [habit("required", null)];
    if (day.month === 11 && day.day === 3) return [];
    return [habit("required", "skipped")];
  };
  assert.deepEqual(perfectDaysInRange(d(2026, 10, 31), d(2026, 11, 4), entriesFor), [
    d(2026, 10, 31),
    d(2026, 11, 1),
    d(2026, 11, 4),
  ]);
});

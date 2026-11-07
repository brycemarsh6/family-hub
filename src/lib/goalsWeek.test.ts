// Pins goalsWeek.ts: the rows This week (and the Assistant API's week route)
// show for one goal, in order.

import { test } from "node:test";
import assert from "node:assert/strict";
import { weekRows } from "./goalsWeek";
import type { PlanItemView } from "./goalsProgress";
import type { CalendarDate } from "./householdDate";

const WEEK: CalendarDate = { year: 2026, month: 11, day: 2 }; // Monday, Denver midnight = 07:00Z

function row(id: string, kind: string, over: Record<string, unknown> = {}): PlanItemView {
  return { id, kind, title: id, sortOrder: 0, doneAt: null, ...over } as unknown as PlanItemView;
}

test("weekRows: habits, steps ticked this week oldest first, the next step, reminders", () => {
  const items = [
    row("rem", "reminder"),
    row("next", "step", { sortOrder: 5 }),
    row("later", "step", { sortOrder: 9 }),
    row("tickedLate", "step", { sortOrder: 2, doneAt: new Date("2026-11-05T18:00:00Z") }),
    row("tickedEarly", "step", { sortOrder: 3, doneAt: new Date("2026-11-03T18:00:00Z") }),
    row("hab", "habit"),
  ];
  assert.deepEqual(weekRows({ items }, WEEK).map((i) => i.id), ["hab", "tickedEarly", "tickedLate", "next", "rem"]);
});

test("weekRows: a step ticked before the week started is left out; the cut-off is Denver midnight, not UTC", () => {
  const items = [
    row("lastWeek", "step", { doneAt: new Date("2026-11-02T06:59:00Z") }),
    row("justIn", "step", { doneAt: new Date("2026-11-02T07:00:00Z") }),
  ];
  assert.deepEqual(weekRows({ items }, WEEK).map((i) => i.id), ["justIn"]);
});

test("weekRows: a goal with nothing for the week has no rows", () => {
  assert.deepEqual(weekRows({ items: [] }, WEEK), []);
  assert.deepEqual(weekRows({ items: [row("old", "step", { doneAt: new Date("2026-10-01T00:00:00Z") })] }, WEEK), []);
});

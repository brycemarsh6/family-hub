// Real unit tests (node:test, zero new dependencies) for the widget registry
// in dashboardWidgets.ts: labels, allowed sizes (decision 200), default sizes
// and the tablet flag. Run with `npm test`. The layout logic that uses the
// registry is tested in dashboardLayoutParse.test.ts and its siblings.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALENDAR_WIDGET_WORDS,
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_KINDS,
  WIDGET_SIZES,
  WIDGET_SIZE_LABELS,
} from "./dashboardWidgets";

test("registry: labels, sizes (decision 200) and the tablet flag", () => {
  const sizes = (k: keyof typeof DASHBOARD_WIDGETS) => DASHBOARD_WIDGETS[k].sizes.join("");
  assert.equal(DASHBOARD_WIDGETS.calendar.label, "Calendar");
  assert.equal(DASHBOARD_WIDGETS.todayMeals.label, "Today's meals");
  assert.equal(DASHBOARD_WIDGETS.habits.label, "Habits");
  assert.equal(DASHBOARD_WIDGETS.chores.label, "Chores today");
  assert.equal(DASHBOARD_WIDGETS.goals.label, "Goals this week");
  assert.deepEqual(
    ["inventory", "grocery", "recipes", "todayMeals", "goals", "habits", "chores", "calendar"].map((k) => sizes(k as never)),
    ["sm", "sm", "sm", "m", "m", "ml", "ml", "smlxl"],
  );
  assert.deepEqual([...DASHBOARD_WIDGET_KINDS], Object.keys(DASHBOARD_WIDGETS));
  const offTablet = DASHBOARD_WIDGET_KINDS.filter((k) => !DASHBOARD_WIDGETS[k].onTablet);
  assert.deepEqual(offTablet, ["habits", "chores"]);
  for (const kind of DASHBOARD_WIDGET_KINDS) {
    const def = DASHBOARD_WIDGETS[kind];
    assert.ok(def.sizes.length > 0 && def.sizes.includes(def.defaultSize), kind);
    const ranks = def.sizes.map((s) => WIDGET_SIZES.indexOf(s));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), kind);
  }
  assert.deepEqual(Object.values(WIDGET_SIZE_LABELS), ["Small", "Medium", "Large", "Extra large"]);
});

test("calendar is first in the default order, Large, and shows on the tablet", () => {
  assert.equal(DASHBOARD_WIDGET_KINDS[0], "calendar");
  assert.equal(DASHBOARD_WIDGETS.calendar.defaultSize, "l");
  assert.equal(DASHBOARD_WIDGETS.calendar.onTablet, true);
});

test("calendar words (decision 238): exact text, no em or en dashes", () => {
  assert.equal(CALENDAR_WIDGET_WORDS.tasksOnly, "Tasks only");
  assert.equal(CALENDAR_WIDGET_WORDS.nextEmptyTasks, "No tasks in the next 7 days");
  assert.equal(CALENDAR_WIDGET_WORDS.todayEnded, "Nothing else today");
  assert.equal(CALENDAR_WIDGET_WORDS.allDay, "All day");
  assert.equal(Object.keys(CALENDAR_WIDGET_WORDS).length, 16);
  for (const word of Object.values(CALENDAR_WIDGET_WORDS)) assert.ok(!/[\u2013\u2014]/.test(word), word);
});

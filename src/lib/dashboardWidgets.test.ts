// Real unit tests (node:test, zero new dependencies) for the widget registry
// in dashboardWidgets.ts: labels, allowed sizes (decision 200), default sizes
// and the tablet flag. Run with `npm test`. The layout logic that uses the
// registry is tested in dashboardLayoutParse.test.ts and its siblings.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_KINDS,
  WIDGET_SIZES,
  WIDGET_SIZE_LABELS,
} from "./dashboardWidgets";

test("registry: labels, sizes (decision 200) and the tablet flag", () => {
  const sizes = (k: keyof typeof DASHBOARD_WIDGETS) => DASHBOARD_WIDGETS[k].sizes.join("");
  assert.equal(DASHBOARD_WIDGETS.todayMeals.label, "Today's meals");
  assert.equal(DASHBOARD_WIDGETS.habits.label, "Habits");
  assert.equal(DASHBOARD_WIDGETS.chores.label, "Chores today");
  assert.equal(DASHBOARD_WIDGETS.goals.label, "Goals this week");
  assert.deepEqual(
    ["inventory", "grocery", "recipes", "todayMeals", "goals", "habits", "chores"].map((k) => sizes(k as never)),
    ["sm", "sm", "sm", "m", "m", "ml", "ml"],
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

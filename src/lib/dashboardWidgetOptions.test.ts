// Tests dashboardWidgetOptions.ts (cleaning, defaults, the Customize row's
// detail line) and how dashboardLayout.ts keeps a widget's options: through
// the parser, setWidgetOptions, and every other edit. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CALENDAR_WIDGET_DEFAULTS,
  calendarOptionsOf,
  cleanWidgetOptions,
  widgetRowDetail,
} from "./dashboardWidgetOptions";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  addWidget,
  parseDashboardLayout,
  reorderWidgets,
  resizeWidget,
  serializeDashboardLayout,
  setWidgetItems,
  setWidgetOptions,
  type DashboardLayout,
} from "./dashboardLayout";

const calendarOf = (layout: DashboardLayout) => layout.widgets.find((w) => w.uid === "calendar");
const stored = (options: unknown, kind = "calendar"): unknown => ({
  version: 2,
  widgets: [{ uid: kind, kind, size: "l", options }],
});

test("cleanWidgetOptions: calendar keeps valid keys only and drops the rest", () => {
  assert.deepEqual(cleanWidgetOptions("calendar", { tasksOnly: true, wholeDay: false, days: 7 }), {
    tasksOnly: true,
    wholeDay: false,
    days: 7,
  });
  assert.deepEqual(cleanWidgetOptions("calendar", { tasksOnly: "yes", wholeDay: 1, days: 5, extra: true }), undefined);
  assert.deepEqual(cleanWidgetOptions("calendar", { tasksOnly: true, days: "3", junk: 1 }), { tasksOnly: true });
  assert.deepEqual(cleanWidgetOptions("calendar", { days: 3 }), { days: 3 });
});

test("cleanWidgetOptions: anything that is not an object, or any other kind, gives undefined", () => {
  for (const raw of [null, undefined, 5, "x", true, {}]) assert.equal(cleanWidgetOptions("calendar", raw), undefined);
  assert.equal(cleanWidgetOptions("habits", { tasksOnly: true }), undefined);
  assert.equal(cleanWidgetOptions("recipes", { days: 3 }), undefined);
});

test("calendarOptionsOf fills the defaults", () => {
  assert.deepEqual(CALENDAR_WIDGET_DEFAULTS, { tasksOnly: false, wholeDay: false, days: 3 });
  assert.deepEqual(calendarOptionsOf({}), CALENDAR_WIDGET_DEFAULTS);
  assert.deepEqual(calendarOptionsOf({ options: { days: 7 } }), { tasksOnly: false, wholeDay: false, days: 7 });
});

test("widgetRowDetail: size, plus Tasks only on a Calendar that has it on", () => {
  assert.equal(widgetRowDetail({ kind: "calendar", size: "l" }), "Large");
  assert.equal(widgetRowDetail({ kind: "calendar", size: "l", options: { wholeDay: true } }), "Large");
  assert.equal(widgetRowDetail({ kind: "calendar", size: "l", options: { tasksOnly: true } }), "Large, Tasks only");
  assert.equal(widgetRowDetail({ kind: "habits", size: "m" }), "Medium");
});

test("parse: calendar options are kept and cleaned, other kinds lose theirs", () => {
  const out = parseDashboardLayout(stored({ tasksOnly: true, days: 5, wholeDay: "no", x: 1 }));
  assert.deepEqual(out.widgets[0].options, { tasksOnly: true });
  assert.ok(!("options" in parseDashboardLayout(stored({ days: 5 })).widgets[0]));
  assert.ok(!("options" in parseDashboardLayout(stored({ tasksOnly: true }, "habits")).widgets[0]));
  const full = parseDashboardLayout(stored({ tasksOnly: false, wholeDay: true, days: 7 }));
  assert.deepEqual(parseDashboardLayout(serializeDashboardLayout(full)), full);
});

test("setWidgetOptions: merges, cleans, ignores an unknown uid and a kind with no options", () => {
  const before = JSON.stringify(DEFAULT_DASHBOARD_LAYOUT);
  const one = setWidgetOptions(DEFAULT_DASHBOARD_LAYOUT, "calendar", { tasksOnly: true });
  assert.equal(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT), before);
  assert.deepEqual(calendarOf(one)?.options, { tasksOnly: true });
  const two = setWidgetOptions(one, "calendar", { days: 7 });
  assert.deepEqual(calendarOf(two)?.options, { tasksOnly: true, days: 7 });
  const off = setWidgetOptions(two, "calendar", { tasksOnly: false });
  assert.deepEqual(calendarOf(off)?.options, { tasksOnly: false, days: 7 });
  assert.deepEqual(calendarOf(setWidgetOptions(one, "calendar", { days: 5 as never }))?.options, { tasksOnly: true });
  assert.deepEqual(setWidgetOptions(DEFAULT_DASHBOARD_LAYOUT, "nope", { tasksOnly: true }), DEFAULT_DASHBOARD_LAYOUT);
  assert.deepEqual(setWidgetOptions(DEFAULT_DASHBOARD_LAYOUT, "habits", { tasksOnly: true }), DEFAULT_DASHBOARD_LAYOUT);
});

test("options survive resize, add, reorder and setWidgetItems", () => {
  const set = setWidgetOptions(DEFAULT_DASHBOARD_LAYOUT, "calendar", { wholeDay: true, days: 7 });
  const want = { wholeDay: true, days: 7 };
  assert.deepEqual(calendarOf(resizeWidget(set, "calendar", "xl"))?.options, want);
  assert.deepEqual(calendarOf(addWidget(set, "calendar", "m"))?.options, want);
  assert.deepEqual(calendarOf(reorderWidgets(set, ["recipes", "calendar"]))?.options, want);
  assert.deepEqual(calendarOf(setWidgetItems(set, "habits", ["h1"]))?.options, want);
  assert.equal(addWidget(set, "calendar", "m").widgets.at(-1)?.uid, "calendar-2");
  assert.ok(!("options" in addWidget(set, "calendar", "m").widgets.at(-1)!));
});

// Unit tests for the month panel's remembered open state: the pure key and
// parse. The hook itself (localStorage, useSyncExternalStore) needs a browser.

import { test } from "node:test";
import assert from "node:assert/strict";
import { MONTH_PANEL_KEY_PREFIX, monthPanelOpenKey, parseMonthPanelOpen } from "./monthPanelOpen";

test("the key is the prefix plus the person, so each person has their own", () => {
  assert.equal(MONTH_PANEL_KEY_PREFIX, "marshee:calendar-month-panel:");
  assert.equal(monthPanelOpenKey("abc"), "marshee:calendar-month-panel:abc");
  assert.notEqual(monthPanelOpenKey("a"), monthPanelOpenKey("b"));
});

test("only \"1\" is open", () => {
  assert.equal(parseMonthPanelOpen("1"), true);
});

test("anything else is closed", () => {
  for (const raw of [null, "", "0", "true", " 1", "1 ", "yes", "2"]) {
    assert.equal(parseMonthPanelOpen(raw), false, `raw ${JSON.stringify(raw)}`);
  }
});

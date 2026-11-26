// Pins which pages show the Marshee wordmark header and the pinned menu widths.
// The hooks in appChrome.ts need a real DOM and are verified in the running app.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HAMBURGER_ROW_HEIGHT, NAV_RAIL_WIDTH, NAV_SIDEBAR_WIDTH, pinnedNavWidth, showsWordmarkHeader } from "./appChrome";

test("showsWordmarkHeader: the dashboard and /login show it", () => {
  assert.equal(showsWordmarkHeader("/"), true);
  assert.equal(showsWordmarkHeader("/login"), true);
});

test("showsWordmarkHeader: every other page does not", () => {
  assert.equal(showsWordmarkHeader("/calendar"), false);
  assert.equal(showsWordmarkHeader("/kitchen/inventory"), false);
});

test("pinnedNavWidth: 0px for the menu button, 72px for the rail, 256px for the sidebar", () => {
  assert.equal(pinnedNavWidth("hamburger"), "0px");
  assert.equal(pinnedNavWidth("rail"), "72px");
  assert.equal(pinnedNavWidth("sidebar"), "256px");
  assert.equal(NAV_RAIL_WIDTH, "72px");
  assert.equal(NAV_SIDEBAR_WIDTH, "256px");
});

test("HAMBURGER_ROW_HEIGHT: derived from the rem number, still 3.5rem", () => {
  assert.equal(HAMBURGER_ROW_HEIGHT, "3.5rem");
});

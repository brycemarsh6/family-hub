// Pins which pages show the Marshee wordmark header and the pinned menu widths.
// The hooks in appChrome.ts need a real DOM and are verified in the running app.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_RAIL_WIDTH_PX, NAV_SIDEBAR_WIDTH_PX, pinnedNavWidthPx, showsWordmarkHeader } from "./appChrome";

test("showsWordmarkHeader: the dashboard and /login show it", () => {
  assert.equal(showsWordmarkHeader("/"), true);
  assert.equal(showsWordmarkHeader("/login"), true);
});

test("showsWordmarkHeader: every other page does not", () => {
  assert.equal(showsWordmarkHeader("/calendar"), false);
  assert.equal(showsWordmarkHeader("/kitchen/inventory"), false);
});

test("pinnedNavWidthPx: 0 for the menu button, 72 for the rail, 256 for the sidebar", () => {
  assert.equal(pinnedNavWidthPx("hamburger"), 0);
  assert.equal(pinnedNavWidthPx("rail"), 72);
  assert.equal(pinnedNavWidthPx("sidebar"), 256);
  assert.equal(NAV_RAIL_WIDTH_PX, 72);
  assert.equal(NAV_SIDEBAR_WIDTH_PX, 256);
});

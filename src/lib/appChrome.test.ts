// Pins which pages show the Marshee wordmark header and the pinned menu widths.
// The hooks in appChrome.ts need a real DOM and are verified in the running app.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_RAIL_WIDTH, NAV_SIDEBAR_WIDTH, pinnedNavWidth, showsWordmarkHeader } from "./appChrome";

test("showsWordmarkHeader: the dashboard and /login show it", () => {
  assert.equal(showsWordmarkHeader("/"), true);
  assert.equal(showsWordmarkHeader("/login"), true);
});

test("showsWordmarkHeader: every other page does not", () => {
  assert.equal(showsWordmarkHeader("/calendar"), false);
  assert.equal(showsWordmarkHeader("/kitchen/inventory"), false);
});

test("pinnedNavWidth: 0px for the menu button, 4.5rem for the rail, 16rem for the sidebar", () => {
  assert.equal(pinnedNavWidth("hamburger"), "0px");
  assert.equal(pinnedNavWidth("rail"), "4.5rem");
  assert.equal(pinnedNavWidth("sidebar"), "16rem");
  assert.equal(NAV_RAIL_WIDTH, "4.5rem");
  assert.equal(NAV_SIDEBAR_WIDTH, "16rem");
});

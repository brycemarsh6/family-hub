// Pins which pages show the Marshee wordmark header. The hooks and constants
// in appChrome.ts need a real DOM and are verified in the running app.

import { test } from "node:test";
import assert from "node:assert/strict";
import { showsWordmarkHeader } from "./appChrome";

test("showsWordmarkHeader: the dashboard and /login show it", () => {
  assert.equal(showsWordmarkHeader("/"), true);
  assert.equal(showsWordmarkHeader("/login"), true);
});

test("showsWordmarkHeader: every other page does not", () => {
  assert.equal(showsWordmarkHeader("/calendar"), false);
  assert.equal(showsWordmarkHeader("/kitchen/inventory"), false);
});

// Real unit tests (node:test, zero new dependencies) for the tablet's rule
// helpers, mission 39. No database involved: each rule is a pure decision
// over a role, the lastAdminGuard.test.ts precedent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "./constants";
import { tabletMayChangeWallTablet, tabletMayCompleteAnyTask } from "./tabletRules";

test("tabletMayCompleteAnyTask: true for the device role", () => {
  assert.equal(tabletMayCompleteAnyTask("device"), true);
});

test("tabletMayCompleteAnyTask: false for admin, parent and kid (the helper only adds device)", () => {
  assert.equal(tabletMayCompleteAnyTask("admin"), false);
  assert.equal(tabletMayCompleteAnyTask("parent"), false);
  assert.equal(tabletMayCompleteAnyTask("kid"), false);
});

test("tabletMayCompleteAnyTask: device is the only role that passes", () => {
  const allowed = ROLES.filter((role) => tabletMayCompleteAnyTask(role));
  assert.deepEqual(allowed, ["device"]);
});

test("tabletMayChangeWallTablet: true for the device role", () => {
  assert.equal(tabletMayChangeWallTablet("device"), true);
});

test("tabletMayChangeWallTablet: device is the only role that passes", () => {
  const allowed = ROLES.filter((role) => tabletMayChangeWallTablet(role));
  assert.deepEqual(allowed, ["device"]);
});

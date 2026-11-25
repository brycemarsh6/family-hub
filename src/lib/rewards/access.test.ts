// Pins access.ts: only admins and parents set stars.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canSetStars } from "./access";

test("admin and parent may set stars", () => {
  assert.equal(canSetStars("admin"), true);
  assert.equal(canSetStars("parent"), true);
});

test("a kid, a device and anything unknown may not", () => {
  for (const role of ["kid", "device", "", "ADMIN", "guest"]) assert.equal(canSetStars(role), false);
});

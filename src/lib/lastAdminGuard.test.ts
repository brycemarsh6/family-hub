// Real unit tests (node:test, zero new dependencies) for the last-active-
// admin lockout decision behind Family Accounts v1's Phase 3a role/
// deactivation guards — added per mission-6's C4 contract, which flagged
// that this guard (the highest-stakes one in the phase: get it wrong and a
// household can be locked out of managing itself with no way back in) had
// zero regression protection. No database involved — canDemoteOrDeactivate
// is a pure decision over plain booleans/counts, mirroring the
// loginRateLimitPolicy.ts precedent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canDemoteOrDeactivate } from "./lastAdminGuard";

test("canDemoteOrDeactivate: refuses a self-targeted action outright, even with other admins around", () => {
  assert.equal(
    canDemoteOrDeactivate({ isSelf: true, targetIsAdmin: true, otherActiveAdminCount: 5 }),
    false,
  );
  assert.equal(
    canDemoteOrDeactivate({ isSelf: true, targetIsAdmin: false, otherActiveAdminCount: 5 }),
    false,
  );
});

test("canDemoteOrDeactivate: refuses stripping the last active admin's admin-ness", () => {
  assert.equal(
    canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: true, otherActiveAdminCount: 0 }),
    false,
  );
});

test("canDemoteOrDeactivate: allows it once at least one OTHER active admin exists", () => {
  assert.equal(
    canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: true, otherActiveAdminCount: 1 }),
    true,
  );
  assert.equal(
    canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: true, otherActiveAdminCount: 4 }),
    true,
  );
});

test("canDemoteOrDeactivate: a target that isn't currently an active admin is never blocked by the lockout, regardless of count", () => {
  assert.equal(
    canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: false, otherActiveAdminCount: 0 }),
    true,
  );
});

test("canDemoteOrDeactivate: the plain non-self, non-last-admin case is allowed", () => {
  assert.equal(
    canDemoteOrDeactivate({ isSelf: false, targetIsAdmin: false, otherActiveAdminCount: 3 }),
    true,
  );
});

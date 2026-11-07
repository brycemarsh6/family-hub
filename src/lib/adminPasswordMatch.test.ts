// Real unit tests (node:test, zero new dependencies) for the "does this
// password match any admin hash" check behind the tablet's admin-password
// sign out (mission 39, C4). Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "./password";
import { matchesAnyHash } from "./adminPasswordMatch";

test("matchesAnyHash: a password matching the only hash passes", async () => {
  const hashes = [await hashPassword("first-admin-pass")];
  assert.equal(await matchesAnyHash("first-admin-pass", hashes), true);
});

test("matchesAnyHash: a password matching the second of two hashes passes", async () => {
  const hashes = [
    await hashPassword("first-admin-pass"),
    await hashPassword("second-admin-pass"),
  ];
  assert.equal(await matchesAnyHash("second-admin-pass", hashes), true);
});

test("matchesAnyHash: a password matching neither hash is refused", async () => {
  const hashes = [
    await hashPassword("first-admin-pass"),
    await hashPassword("second-admin-pass"),
  ];
  assert.equal(await matchesAnyHash("not-an-admin-pass", hashes), false);
});

test("matchesAnyHash: no hashes at all is refused, like a wrong password", async () => {
  assert.equal(await matchesAnyHash("anything-at-all", []), false);
});

test("matchesAnyHash: an empty attempt is refused", async () => {
  const hashes = [await hashPassword("first-admin-pass")];
  assert.equal(await matchesAnyHash("", hashes), false);
});

test("matchesAnyHash: a malformed hash is ignored while a good one still matches", async () => {
  const hashes = ["not-a-real-hash", await hashPassword("first-admin-pass")];
  assert.equal(await matchesAnyHash("first-admin-pass", hashes), true);
  assert.equal(await matchesAnyHash("wrong-pass", hashes), false);
});

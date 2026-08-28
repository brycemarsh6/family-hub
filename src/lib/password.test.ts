// Real unit tests (node:test, zero new dependencies) for the bcryptjs
// wrapper behind Family Accounts v1's P1 foundation. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";

test("hashPassword + verifyPassword: correct password round-trips", async () => {
  const hash = await hashPassword("correct-horse-battery-staple");
  assert.equal(await verifyPassword("correct-horse-battery-staple", hash), true);
});

test("verifyPassword: wrong password is rejected", async () => {
  const hash = await hashPassword("correct-horse-battery-staple");
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("hashPassword: hashing the same password twice produces different hashes (salted)", async () => {
  const first = await hashPassword("same-password");
  const second = await hashPassword("same-password");
  assert.notEqual(first, second);
  // Both still verify against the original password despite differing.
  assert.equal(await verifyPassword("same-password", first), true);
  assert.equal(await verifyPassword("same-password", second), true);
});

test("hashPassword: empty string is rejected", async () => {
  await assert.rejects(() => hashPassword(""));
});

test("verifyPassword: empty attempt is rejected without throwing", async () => {
  const hash = await hashPassword("some-password");
  assert.equal(await verifyPassword("", hash), false);
});

test("verifyPassword: a malformed hash returns false instead of throwing", async () => {
  assert.equal(await verifyPassword("anything", "not-a-real-hash"), false);
});

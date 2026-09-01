// Real unit tests (node:test, zero new dependencies) for the person
// projection hoisted per mission-6's C4 contract. No database involved —
// toPersonInfo is a pure mapper over a plain row shape.

import { test } from "node:test";
import assert from "node:assert/strict";
import { toPersonInfo, type PersonRow } from "./personInfo";

function row(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: "user-1",
    displayName: "Bryce",
    role: "admin",
    avatarColor: "blue",
    passwordHash: "some-bcrypt-hash",
    deactivatedAt: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("toPersonInfo: never includes a passwordHash field, account or not", () => {
  const withAccount = toPersonInfo(row({ passwordHash: "hash-value" }));
  const withoutAccount = toPersonInfo(row({ passwordHash: null }));
  assert.ok(!("passwordHash" in withAccount));
  assert.ok(!("passwordHash" in withoutAccount));
});

test("toPersonInfo: hasAccount is true exactly when passwordHash is non-null", () => {
  assert.equal(toPersonInfo(row({ passwordHash: "hash" })).hasAccount, true);
  assert.equal(toPersonInfo(row({ passwordHash: null })).hasAccount, false);
});

test("toPersonInfo: an unrecognized role/avatarColor narrows to the safe default rather than passing through", () => {
  const info = toPersonInfo(row({ role: "owner", avatarColor: "#ffffff" }));
  assert.notEqual(info.role, "owner");
  assert.notEqual(info.avatarColor, "#ffffff");
});

test("toPersonInfo: passes id, displayName, deactivatedAt, and createdAt through unchanged", () => {
  const deactivatedAt = new Date("2026-08-15T00:00:00.000Z");
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const info = toPersonInfo(
    row({ id: "user-42", displayName: "Emily", deactivatedAt, createdAt }),
  );
  assert.equal(info.id, "user-42");
  assert.equal(info.displayName, "Emily");
  assert.equal(info.deactivatedAt, deactivatedAt);
  assert.equal(info.createdAt, createdAt);
});

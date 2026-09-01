// Real unit tests (node:test, zero new dependencies) for the narrowing
// helpers Family Accounts v1's P1 foundation added to constants.ts. Run with
// `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toRole,
  toAvatarColor,
  avatarColorHex,
  DEFAULT_ROLE,
  AVATAR_COLORS,
  AVATAR_COLOR_NAMES,
  ROLES,
  MANAGER_ROLES,
  ROLE_LABELS,
  ASSIGNABLE_ROLES,
} from "./constants";

test("toRole: a real role passes through unchanged", () => {
  assert.equal(toRole("admin"), "admin");
  assert.equal(toRole("parent"), "parent");
  assert.equal(toRole("kid"), "kid");
  assert.equal(toRole("device"), "device");
});

test("toRole: unrecognized text falls back to the default", () => {
  assert.equal(toRole("owner"), DEFAULT_ROLE);
  assert.equal(toRole(""), DEFAULT_ROLE);
  assert.equal(toRole(undefined), DEFAULT_ROLE);
  assert.equal(toRole(null), DEFAULT_ROLE);
});

test("toAvatarColor: a real swatch name passes through unchanged", () => {
  for (const name of AVATAR_COLOR_NAMES) {
    assert.equal(toAvatarColor(name), name);
  }
});

test("toAvatarColor: unrecognized text falls back to the first swatch", () => {
  assert.equal(toAvatarColor("#ffffff"), AVATAR_COLOR_NAMES[0]);
  assert.equal(toAvatarColor(undefined), AVATAR_COLOR_NAMES[0]);
});

test("toAvatarColor: a raw hex value is not mistaken for a swatch name", () => {
  // The whole point of Fix 1: what's stored (and what toAvatarColor
  // narrows) is the swatch's NAME, not its hex. A hex value — even one
  // that's genuinely in the palette — must not pass through unchanged.
  for (const { hex } of AVATAR_COLORS) {
    assert.equal(toAvatarColor(hex), AVATAR_COLOR_NAMES[0]);
  }
});

test("avatarColorHex: every swatch name resolves to its own hex", () => {
  for (const { name, hex } of AVATAR_COLORS) {
    assert.equal(avatarColorHex(name), hex);
  }
});

test("avatarColorHex: an unrecognized name falls back to the first swatch's hex", () => {
  assert.equal(avatarColorHex("chartreuse"), AVATAR_COLORS[0].hex);
  assert.equal(avatarColorHex(""), AVATAR_COLORS[0].hex);
});

test("AVATAR_COLOR_NAMES: derived 1:1 from AVATAR_COLORS, same order", () => {
  assert.deepEqual([...AVATAR_COLOR_NAMES], AVATAR_COLORS.map((c) => c.name));
});

test("MANAGER_ROLES: exactly admin and parent, nothing else", () => {
  assert.deepEqual([...MANAGER_ROLES].sort(), ["admin", "parent"]);
  for (const role of MANAGER_ROLES) {
    assert.ok((ROLES as readonly string[]).includes(role));
  }
});

test("ROLE_LABELS: every real role has a human label, and only real roles", () => {
  for (const role of ROLES) {
    assert.ok(typeof ROLE_LABELS[role] === "string" && ROLE_LABELS[role].length > 0);
  }
  assert.deepEqual(Object.keys(ROLE_LABELS).sort(), [...ROLES].sort());
});

test("ASSIGNABLE_ROLES: every real role except device, and nothing else", () => {
  assert.deepEqual([...ASSIGNABLE_ROLES].sort(), ["admin", "kid", "parent"]);
  assert.ok(!ASSIGNABLE_ROLES.includes("device"));
});

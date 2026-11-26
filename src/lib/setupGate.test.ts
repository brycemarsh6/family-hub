// Unit tests (node:test) for the setup page's pure rules. No database.
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILY_NAME_MAX } from "./feedbackForward";
import {
  setupCodeMatches,
  setupIsOpen,
  checkSetupInput,
  checkNewPassword,
  DISPLAY_NAME_MAX,
  SETUP_RATE_LIMIT_KEY,
} from "./setupGate";

test("setupCodeMatches: same code matches", () => {
  assert.equal(setupCodeMatches("abc-123", "abc-123"), true);
});

test("setupCodeMatches: different code does not match", () => {
  assert.equal(setupCodeMatches("abc-124", "abc-123"), false);
});

test("setupCodeMatches: different lengths do not throw and do not match", () => {
  assert.equal(setupCodeMatches("abc", "abc-123-long-code"), false);
  assert.equal(setupCodeMatches("abc-123-long-code", "abc"), false);
});

test("setupCodeMatches: missing or blank configured code never matches", () => {
  assert.equal(setupCodeMatches("abc", undefined), false);
  assert.equal(setupCodeMatches("abc", null), false);
  assert.equal(setupCodeMatches("abc", ""), false);
  assert.equal(setupCodeMatches("", "   "), false);
  assert.equal(setupCodeMatches("   ", "   "), false);
});

test("setupCodeMatches: empty given never matches", () => {
  assert.equal(setupCodeMatches("", "abc"), false);
  assert.equal(setupCodeMatches("   ", "abc"), false);
});

test("setupCodeMatches: surrounding whitespace is ignored on both sides", () => {
  assert.equal(setupCodeMatches("  abc  ", "abc"), true);
  assert.equal(setupCodeMatches("abc", " abc\n"), true);
});

const OPEN = {
  ownerCopy: false,
  configuredCode: "code",
  userCount: 0,
  setupFinished: false,
};

test("setupIsOpen: open on a fresh family copy", () => {
  assert.equal(setupIsOpen(OPEN), true);
});

test("setupIsOpen: closed on the owner copy", () => {
  assert.equal(setupIsOpen({ ...OPEN, ownerCopy: true }), false);
});

test("setupIsOpen: closed when no code is configured", () => {
  assert.equal(setupIsOpen({ ...OPEN, configuredCode: undefined }), false);
  assert.equal(setupIsOpen({ ...OPEN, configuredCode: null }), false);
  assert.equal(setupIsOpen({ ...OPEN, configuredCode: "  " }), false);
});

test("setupIsOpen: closed once any user exists", () => {
  assert.equal(setupIsOpen({ ...OPEN, userCount: 1 }), false);
});

test("setupIsOpen: closed once setup is finished", () => {
  assert.equal(setupIsOpen({ ...OPEN, setupFinished: true }), false);
});

const GOOD = {
  familyName: "  The Smiths ",
  displayName: " Sam ",
  password: "longenough",
  passwordAgain: "longenough",
};

test("checkSetupInput: good input returns trimmed names", () => {
  assert.deepEqual(checkSetupInput(GOOD), {
    ok: true,
    familyName: "The Smiths",
    displayName: "Sam",
  });
});

test("checkSetupInput: empty family name", () => {
  assert.deepEqual(checkSetupInput({ ...GOOD, familyName: "   " }), {
    ok: false,
    error: "Give your family a name.",
  });
});

test("checkSetupInput: family name too long", () => {
  const long = "x".repeat(FAMILY_NAME_MAX + 1);
  assert.deepEqual(checkSetupInput({ ...GOOD, familyName: long }), {
    ok: false,
    error: "Keep the family name under 60 characters.",
  });
  assert.equal(
    checkSetupInput({ ...GOOD, familyName: "x".repeat(FAMILY_NAME_MAX) }).ok,
    true,
  );
});

test("checkSetupInput: empty display name", () => {
  assert.deepEqual(checkSetupInput({ ...GOOD, displayName: " " }), {
    ok: false,
    error: "Enter your name.",
  });
});

test("checkSetupInput: display name too long", () => {
  const long = "x".repeat(DISPLAY_NAME_MAX + 1);
  assert.deepEqual(checkSetupInput({ ...GOOD, displayName: long }), {
    ok: false,
    error: "Keep your name under 40 characters.",
  });
});

test("checkSetupInput: short password", () => {
  assert.deepEqual(
    checkSetupInput({ ...GOOD, password: "short", passwordAgain: "short" }),
    { ok: false, error: "Passwords must be at least 8 characters." },
  );
});

test("checkSetupInput: passwords are not trimmed", () => {
  // Eight characters only because of the padding spaces: must be accepted.
  const padded = "  abcd  ";
  assert.equal(
    checkSetupInput({ ...GOOD, password: padded, passwordAgain: padded }).ok,
    true,
  );
  assert.deepEqual(
    checkSetupInput({ ...GOOD, password: padded, passwordAgain: "abcd" }),
    { ok: false, error: "Those passwords don't match." },
  );
});

test("checkSetupInput: mismatched passwords", () => {
  assert.deepEqual(checkSetupInput({ ...GOOD, passwordAgain: "different1" }), {
    ok: false,
    error: "Those passwords don't match.",
  });
});

test("checkSetupInput: errors come in the documented order", () => {
  const all = {
    familyName: "",
    displayName: "",
    password: "x",
    passwordAgain: "y",
  };
  assert.equal(
    (checkSetupInput(all) as { error: string }).error,
    "Give your family a name.",
  );
  assert.equal(
    (checkSetupInput({ ...all, familyName: "F" }) as { error: string }).error,
    "Enter your name.",
  );
  assert.equal(
    (checkSetupInput({ ...all, familyName: "F", displayName: "D" }) as {
      error: string;
    }).error,
    "Passwords must be at least 8 characters.",
  );
});

test("SETUP_RATE_LIMIT_KEY is 'setup'", () => {
  assert.equal(SETUP_RATE_LIMIT_KEY, "setup");
});

test("checkNewPassword: short, mismatch, and fine", () => {
  assert.equal(checkNewPassword("short", "short"), "Passwords must be at least 8 characters.");
  assert.equal(checkNewPassword("long enough 1", "long enough 2"), "Those passwords don't match.");
  assert.equal(checkNewPassword("long enough 1", "long enough 1"), null);
});

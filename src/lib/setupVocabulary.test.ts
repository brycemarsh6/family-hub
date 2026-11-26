// Pins the two "no connection" lines in setupVocabulary.ts exactly as Bryce
// approved them, and that no setup word uses an em or en dash.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SETUP_WORDS } from "./setupVocabulary";

test("the link check offline line is the approved wording", () => {
  assert.equal(
    SETUP_WORDS.linkCheckFailed,
    "Couldn't check your link. Check your connection, then reload this page.",
  );
});

test("a dropped create says tap again, not reload (reload would wipe what was typed)", () => {
  assert.equal(
    SETUP_WORDS.createFailed,
    "Couldn't reach Marshee. Check your connection, then tap Create my family again.",
  );
  assert.notEqual(SETUP_WORDS.createFailed, SETUP_WORDS.linkCheckFailed);
});

test("no setup word uses an em or en dash", () => {
  for (const [key, value] of Object.entries(SETUP_WORDS)) {
    if (typeof value === "string") {
      assert.doesNotMatch(value, /[–—]/, key);
    }
  }
});

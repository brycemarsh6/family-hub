// Pins the vision rules (visions.ts): board keys, who may edit a board, what a
// save may submit, which statement a goal shows, and the board heading.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Viewer } from "./goals";
import {
  VISION_TEXT_MAX,
  boardHeading,
  canEditVision,
  validateVisionInput,
  visionBoardKey,
  visionForGoal,
  type VisionRow,
} from "./visions";

const ME: Viewer = { userId: "me", isDevice: false };
const TABLET: Viewer = { userId: "tablet", isDevice: true };

function row(over: Partial<VisionRow> = {}): VisionRow {
  return { area: "health", horizon: 10, ownerId: null, text: "Strong and rested", updatedAt: new Date("2026-11-04T19:00:00Z"), ...over };
}

test("visionBoardKey: no owner is the Together board, an owner is their id", () => {
  assert.equal(visionBoardKey(null), "together");
  assert.equal(visionBoardKey("me"), "me");
});

test("canEditVision: a device never edits; Together is any login's; a person's board is theirs alone", () => {
  assert.equal(canEditVision(null, ME), true);
  assert.equal(canEditVision("me", ME), true);
  assert.equal(canEditVision("spouse", ME), false);
  assert.equal(canEditVision(null, TABLET), false);
  assert.equal(canEditVision("tablet", TABLET), false);
});

test("validateVisionInput: accepts a statement, trims it, takes a string horizon", () => {
  assert.deepEqual(validateVisionInput({ board: "together", area: "health", horizon: 10, text: "  Fit  " }), {
    ok: { board: "together", area: "health", horizon: 10, text: "Fit" },
  });
  assert.deepEqual(validateVisionInput({ board: "mine", area: "growth", horizon: "15", text: "x" }), {
    ok: { board: "mine", area: "growth", horizon: 15, text: "x" },
  });
});

test("validateVisionInput: empty or missing text is allowed and means clear", () => {
  assert.deepEqual(validateVisionInput({ board: "mine", area: "health", horizon: 5, text: "   " }), {
    ok: { board: "mine", area: "health", horizon: 5, text: "" },
  });
  assert.deepEqual(validateVisionInput({ board: "mine", area: "health", horizon: 5 }), {
    ok: { board: "mine", area: "health", horizon: 5, text: "" },
  });
});

test("validateVisionInput: the 500 limit, and unknown area, horizon, board or shape", () => {
  const base = { board: "mine", area: "health", horizon: 10, text: "ok" };
  assert.ok("ok" in validateVisionInput({ ...base, text: "a".repeat(VISION_TEXT_MAX) }));
  assert.deepEqual(validateVisionInput({ ...base, text: "a".repeat(VISION_TEXT_MAX + 1) }), { error: "Keep it under 500 characters." });
  assert.ok("error" in validateVisionInput({ ...base, area: "fun" }));
  assert.ok("error" in validateVisionInput({ ...base, horizon: 7 }));
  assert.ok("error" in validateVisionInput({ ...base, board: "private" }));
  assert.ok("error" in validateVisionInput({ ...base, board: "someone-else" }));
  assert.ok("error" in validateVisionInput({ ...base, text: 12 }));
  assert.ok("error" in validateVisionInput(null));
  assert.ok("error" in validateVisionInput([base]));
});

test("visionForGoal: the owner's statement wins, then Together, then null", () => {
  const together = row({ text: "Together text" });
  const mine = row({ ownerId: "me", text: "My text" });
  assert.equal(visionForGoal("me", "health", [together, mine]), mine);
  assert.equal(visionForGoal(null, "health", [together, mine]), together);
  assert.equal(visionForGoal("me", "health", [together]), together);
  assert.equal(visionForGoal("spouse", "health", [together, mine]), together);
  assert.equal(visionForGoal("me", "health", []), null);
  assert.equal(visionForGoal("me", "health", [mine]), mine);
  assert.equal(visionForGoal(null, "health", [mine]), null);
});

test("visionForGoal: matches area and horizon, and an empty row never matches", () => {
  const together = row({ text: "Together text" });
  assert.equal(visionForGoal("me", "growth", [together]), null);
  assert.equal(visionForGoal("me", "health", [together], 5), null);
  assert.equal(visionForGoal("me", "health", [row({ horizon: 5, text: "Five" })], 5)?.text, "Five");
  assert.equal(visionForGoal("me", "health", [row({ ownerId: "me", text: "" }), together]), together);
  assert.equal(visionForGoal("me", "health", [row({ ownerId: "me", text: "  " })]), null);
  assert.equal(visionForGoal("me", "health", [row({ text: "" })]), null);
});

test("boardHeading: the family, or a name, in the year the horizon reaches", () => {
  assert.equal(boardHeading(null, 2026, 10), "Our family in 2036");
  assert.equal(boardHeading("Bryce", 2026, 10), "Bryce in 2036");
  assert.equal(boardHeading("Bryce", 2026, 5), "Bryce in 2031");
  assert.equal(boardHeading(null, 2026, 15), "Our family in 2041");
});

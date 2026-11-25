// Pins rewardEmoji.ts: the 60 quick picks and the one-emoji check.

import { test } from "node:test";
import assert from "node:assert/strict";
import { REWARD_EMOJI_GROUPS, toRewardEmoji } from "./rewardEmoji";

const ALL = REWARD_EMOJI_GROUPS.flatMap((group) => group.items);

test("five groups of 12 make 60 picks, in the mock's order", () => {
  assert.deepEqual(REWARD_EMOJI_GROUPS.map((group) => group.label), ["Treats", "Outings", "Toys and play", "At home", "Big and special"]);
  for (const group of REWARD_EMOJI_GROUPS) assert.equal(group.items.length, 12);
  assert.equal(ALL.length, 60);
  assert.equal(ALL[0].name, "Cupcake");
  assert.equal(ALL[59].name, "Heart");
});

test("no pick is repeated, and every pick has a caption", () => {
  assert.equal(new Set(ALL.map((item) => item.emoji)).size, 60);
  for (const item of ALL) assert.ok(item.name.length > 0);
});

test("every quick pick passes the check unchanged", () => {
  for (const item of ALL) assert.equal(toRewardEmoji(item.emoji), item.emoji, item.name);
});

test("a skin tone, a ZWJ family, a flag and a keycap pass", () => {
  for (const emoji of ["👍🏽", "👨‍👩‍👧‍👦", "🇺🇸", "1️⃣", "#️⃣"]) assert.equal(toRewardEmoji(emoji), emoji);
});

test("spaces around an emoji are trimmed", () => {
  assert.equal(toRewardEmoji("  🍪 "), "🍪");
});

test("text, digits, two emoji, empty and non-strings fail", () => {
  for (const raw of ["a", "1", "🍪🍪", "🍪a", "", "   ", 5, null, undefined, {}, "🇺", "x".repeat(40)]) assert.equal(toRewardEmoji(raw), null);
});

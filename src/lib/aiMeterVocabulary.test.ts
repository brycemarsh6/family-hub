import test from "node:test";
import assert from "node:assert/strict";
import { AI_FEATURES } from "./aiMeterPolicy";
import {
  AI_FEATURE_LABELS,
  AI_LOCKED_TEXT,
  AI_USED_BAR_LABEL,
  aiOwnerText,
  aiUsedPercentText,
  aiUsedUpText,
  formatUsd,
  resetsLabel,
} from "./aiMeterVocabulary";

test("every feature has an owner label", () => {
  for (const feature of AI_FEATURES) {
    assert.ok(AI_FEATURE_LABELS[feature].length > 0);
  }
});

test("words: the agreed sentences", () => {
  const dec1 = { year: 2026, month: 12, day: 1 };
  assert.equal(resetsLabel(dec1), "December 1");
  assert.equal(aiUsedPercentText(40, dec1), "40% of this month's AI used. Resets December 1.");
  assert.equal(aiUsedUpText(dec1), "All of this month's AI is used. Resets December 1.");
  assert.equal(aiOwnerText(1_420_000, 37), "$1.42 used this month, 37 requests. No limit on your copy.");
  assert.equal(
    AI_LOCKED_TEXT,
    "Recipe import, meal ideas, nutrition estimates and grocery sorting come with the AI upgrade.",
  );
  assert.equal(AI_USED_BAR_LABEL, "This month's AI used");
  assert.equal(aiOwnerText(0, 1), "$0.00 used this month, 1 request. No limit on your copy.");
});

test("formatUsd rounds to cents", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(14_999), "$0.01");
  assert.equal(formatUsd(15_000), "$0.02");
  assert.equal(formatUsd(1_424_000), "$1.42");
  assert.equal(formatUsd(12_500_000), "$12.50");
});

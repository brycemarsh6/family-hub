// Pins rewardVocabulary.ts: the star steps, the late-check choices and their
// repairers.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ANY_EMOJI_HINT,
  ANY_EMOJI_LABEL,
  COST_STEPS,
  DEFAULT_REWARD_COST,
  REWARD_ALL_HIDDEN,
  REWARD_PEOPLE_LABEL,
  REWARD_TITLE_MAX,
  notEnoughStarsText,
  personChipLabel,
  progressText,
  redeemButtonText,
  redeemQuestionText,
  redeemSpendText,
  redeemedByText,
  redeemedTitleText,
  rewardProgressLabel,
  rewardRedeemAriaLabel,
  toRewardCost,
  LATE_STARS,
  LATE_STARS_HELP,
  LATE_STARS_LABELS,
  LATE_STARS_OFF_LIST,
  LATE_STARS_REFUSAL,
  LATE_STARS_TITLE,
  REWARDS_SETTINGS_TITLE,
  STARS_FIELD_HINT,
  STARS_FIELD_LABEL,
  STAR_REFUSAL,
  STAR_STEPS,
  starCountText,
  starStepText,
  toLateStars,
  toStarValue,
} from "./rewardVocabulary";

test("the star steps and late choices are pinned", () => {
  assert.deepEqual([...STAR_STEPS], [1, 2, 3, 4, 5, 10, 15, 20, 25, 50]);
  assert.deepEqual([...LATE_STARS], ["full", "half", "none"]);
  assert.deepEqual(LATE_STARS_LABELS, { full: "Full stars", half: "Half stars", none: "No stars" });
  assert.equal(STAR_REFUSAL, "Pick a star value from the list.");
});

test("toStarValue keeps every listed step", () => {
  for (const step of STAR_STEPS) assert.equal(toStarValue(step), step);
});

test("toStarValue turns anything off the list, including 0, into null", () => {
  for (const raw of [0, -1, 6, 7, 51, 2.5, NaN, "5", null, undefined, {}]) assert.equal(toStarValue(raw), null);
});

test("toLateStars keeps the known choices and repairs the rest to full", () => {
  assert.equal(toLateStars("half"), "half");
  assert.equal(toLateStars("none"), "none");
  assert.equal(toLateStars("full"), "full");
  for (const raw of ["", "HALF", null, undefined, 3]) assert.equal(toLateStars(raw), "full");
});

test("starCountText is singular for 1 and -1, plural otherwise", () => {
  assert.equal(starCountText(1), "1 star");
  assert.equal(starCountText(-1), "-1 star");
  assert.equal(starCountText(10), "10 stars");
  assert.equal(starCountText(0), "0 stars");
  assert.equal(starCountText(-3), "-3 stars");
});

test("starStepText says None for no stars, else the count", () => {
  assert.equal(starStepText(null), "None");
  assert.equal(starStepText(1), "1 star");
  assert.equal(starStepText(50), "50 stars");
});

test("the form and settings words are Bryce's, word for word", () => {
  assert.equal(STARS_FIELD_LABEL, "Stars");
  assert.equal(STARS_FIELD_HINT, "Paid into the star bank each time it's checked off");
  assert.equal(REWARDS_SETTINGS_TITLE, "Rewards");
  assert.equal(LATE_STARS_TITLE, "Late checks");
  assert.equal(LATE_STARS_HELP, "A late check is a carried-over item checked off the next day. Half rounds up.");
  assert.equal(LATE_STARS_REFUSAL, "Only parents and admins can change this.");
  assert.equal(LATE_STARS_OFF_LIST, "That choice isn't on the list.");
});

test("the cost steps are Bryce's 20, and anything else is null", () => {
  assert.deepEqual([...COST_STEPS], [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000]);
  for (const step of COST_STEPS) assert.equal(toRewardCost(step), step);
  for (const raw of [0, 1, 6, 35, 1001, "20", null, undefined, NaN]) assert.equal(toRewardCost(raw), null);
  assert.equal(DEFAULT_REWARD_COST, 20);
  assert.equal(REWARD_TITLE_MAX, 60);
});

test("the Any emoji words and the redeem sheet's builders are the mock's", () => {
  assert.equal(ANY_EMOJI_LABEL, "Any emoji");
  assert.equal(ANY_EMOJI_HINT, "Tap the smiley or globe key for emoji");
  assert.equal(notEnoughStarsText("Ellie", 15), "Ellie needs 15 more stars.");
  assert.equal(notEnoughStarsText("Ellie", 1), "Ellie needs 1 more star.");
  assert.equal(redeemQuestionText("Cupcake", "Ellie"), "Redeem Cupcake for Ellie?");
  assert.equal(redeemSpendText(20, "Ellie", 55), "This spends 20 of Ellie's 55 stars. 35 left after.");
  assert.equal(redeemButtonText(20), "Redeem 20 stars");
  assert.equal(redeemedTitleText("Cupcake"), "Cupcake redeemed.");
  assert.equal(redeemedByText("Ellie", 20, "Tuesday, November 24"), "By Ellie for 20 stars on Tuesday, November 24.");
  assert.equal(progressText(55, 150), "55 of 150");
  assert.equal(progressText(-4, 150), "0 of 150");
});

test("the people row, chip and progress words are pinned", () => {
  assert.equal(REWARD_PEOPLE_LABEL, "People");
  assert.equal(REWARD_ALL_HIDDEN, "Earned rewards are hidden.");
  assert.equal(personChipLabel("Ellie", 55), "Ellie, 55 stars");
  assert.equal(personChipLabel("Ellie", 1), "Ellie, 1 star");
  assert.equal(rewardProgressLabel("Cupcake"), "Cupcake progress");
});

test("the Redeem button names its reward for a screen reader", () => {
  assert.equal(rewardRedeemAriaLabel("Cupcake"), "Redeem Cupcake");
});

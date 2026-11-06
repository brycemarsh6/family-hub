import { test } from "node:test";
import assert from "node:assert/strict";
import { feedbackTimeAgo, feedbackTimeLabel } from "./feedbackTime";

// 2026-11-04T06:30Z is 11:30 PM Tuesday Nov 3 in Denver (MST, UTC-7).
const NEAR_MIDNIGHT = new Date("2026-11-04T06:30:00Z");

test("feedbackTimeAgo: under a minute is Just now, even for a future clock skew", () => {
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-04T06:30:30Z")), "Just now");
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-04T06:29:00Z")), "Just now");
});

test("feedbackTimeAgo: minutes and hours are elapsed time", () => {
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-04T06:35:00Z")), "5 min ago");
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-04T09:30:00Z")), "3 h ago");
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-05T06:29:00Z")), "23 h ago");
});

test("feedbackTimeAgo: days count Denver calendar days, near midnight", () => {
  // 11:30 PM Nov 3 -> 12:30 AM Nov 5 Denver: 25 h, two calendar days.
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-05T07:30:00Z")), "2 d ago");
  // 11:30 PM Nov 3 -> 11:40 PM Nov 4 Denver: one calendar day.
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-05T06:40:00Z")), "1 d ago");
  // 11:30 PM Nov 3 -> 10:00 PM Nov 16 Denver: 13 calendar days.
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-17T05:00:00Z")), "13 d ago");
});

test("feedbackTimeAgo: after 14 days it is the household date", () => {
  // The UTC date is Nov 4, the Denver date is Nov 3.
  assert.equal(feedbackTimeAgo(NEAR_MIDNIGHT, new Date("2026-11-20T18:00:00Z")), "Nov 3");
});

test("feedbackTimeLabel: weekday, date and clock in household time", () => {
  assert.match(feedbackTimeLabel(NEAR_MIDNIGHT), /^Tue, Nov 3, 11:30\sPM$/);
  assert.match(feedbackTimeLabel(new Date("2026-11-04T17:05:00Z")), /^Wed, Nov 4, 10:05\sAM$/);
});

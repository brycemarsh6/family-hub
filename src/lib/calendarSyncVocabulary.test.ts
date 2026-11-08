import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_STATUSES,
  SYNCED_CALENDARS_WORDS,
  SYNC_DIRECTIONS,
  SYNC_DIRECTION_HINTS,
  SYNC_DIRECTION_LABELS,
  isSyncDirection,
  toSyncDirection,
} from "./calendarSyncVocabulary";

describe("calendar sync vocabulary", () => {
  it("pins the directions and their labels", () => {
    assert.deepEqual([...SYNC_DIRECTIONS], ["off", "outbound", "twoWay"]);
    assert.equal(SYNC_DIRECTION_LABELS.off, "Not synced");
    assert.equal(SYNC_DIRECTION_LABELS.outbound, "Marshee to Google only");
    assert.equal(SYNC_DIRECTION_LABELS.twoWay, "Both ways");
  });

  it("has a hint for every direction", () => {
    for (const direction of SYNC_DIRECTIONS) {
      assert.ok(SYNC_DIRECTION_HINTS[direction].length > 0);
    }
  });

  it("pins the account statuses", () => {
    assert.deepEqual([...ACCOUNT_STATUSES], ["ok", "needs-relink"]);
  });

  it("isSyncDirection accepts only the three directions", () => {
    assert.equal(isSyncDirection("twoWay"), true);
    assert.equal(isSyncDirection("both"), false);
    assert.equal(isSyncDirection(null), false);
  });

  it("toSyncDirection keeps good values and repairs the rest to off", () => {
    assert.equal(toSyncDirection("outbound"), "outbound");
    assert.equal(toSyncDirection("twoWay"), "twoWay");
    assert.equal(toSyncDirection("nonsense"), "off");
    assert.equal(toSyncDirection(undefined), "off");
    assert.equal(toSyncDirection(7), "off");
  });

  it("pins the page words", () => {
    assert.equal(SYNCED_CALENDARS_WORDS.pageTitle, "Synced calendars");
    assert.equal(SYNCED_CALENDARS_WORDS.linkButton, "Link a Google account");
    assert.equal(SYNCED_CALENDARS_WORDS.unlinkButton, "Unlink this account");
    assert.equal(
      SYNCED_CALENDARS_WORDS.notConfigured,
      "Google sync isn't set up on this server yet",
    );
    assert.equal(
      SYNCED_CALENDARS_WORDS.notYours("Bryce"),
      "Only Bryce can change this account",
    );
  });
});

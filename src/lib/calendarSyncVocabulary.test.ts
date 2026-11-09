import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_STATUSES,
  calendarsSummary,
  linkedByLine,
  linkErrorMessage,
  SYNCED_CALENDARS_EXTRA_WORDS,
  SYNCED_CALENDARS_WORDS,
  SYNC_DIRECTIONS,
  SYNC_DIRECTION_HINTS,
  SYNC_DIRECTION_LABELS,
  isSyncDirection,
  toAccountStatus,
  toLinkErrorCode,
  toSyncDirection,
} from "./calendarSyncVocabulary";

describe("calendar sync vocabulary", () => {
  it("pins the directions and their labels", () => {
    assert.deepEqual([...SYNC_DIRECTIONS], ["off", "outbound", "twoWay"]);
    assert.equal(SYNC_DIRECTION_LABELS.off, "Not synced");
    assert.equal(SYNC_DIRECTION_LABELS.outbound, "Marshee to Google only");
    assert.equal(SYNC_DIRECTION_LABELS.twoWay, "Both ways");
  });

  it("words the outbound hint and the not-on-yet line", () => {
    assert.equal(
      SYNC_DIRECTION_HINTS.outbound,
      "Events you choose to sync are copied to this calendar.",
    );
    assert.equal(
      SYNCED_CALENDARS_EXTRA_WORDS.syncNotOn,
      "Syncing isn't on yet. Your choices are saved for when it starts.",
    );
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

  it("toAccountStatus keeps good values and repairs the rest to ok", () => {
    assert.equal(toAccountStatus("needs-relink"), "needs-relink");
    assert.equal(toAccountStatus("ok"), "ok");
    assert.equal(toAccountStatus("weird"), "ok");
    assert.equal(toAccountStatus(null), "ok");
  });

  it("toLinkErrorCode passes the strict shape and turns anything else into google", () => {
    assert.equal(toLinkErrorCode("access_denied"), "access_denied");
    assert.equal(toLinkErrorCode("no-refresh-token"), "no-refresh-token");
    assert.equal(toLinkErrorCode("Bad Code!"), "google");
    assert.equal(toLinkErrorCode("a".repeat(41)), "google");
    assert.equal(toLinkErrorCode(""), "google");
    assert.equal(toLinkErrorCode(undefined), "google");
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

  it("words each link error code, and any other code gets the generic line", () => {
    assert.equal(linkErrorMessage("state"), "That link expired. Try again.");
    assert.equal(linkErrorMessage("signin"), "Sign in to Marshee first, then link.");
    assert.equal(linkErrorMessage("access_denied"), "Google didn't allow it. Try again.");
    assert.equal(
      linkErrorMessage("admin_policy_enforced"),
      "Your work's Google admin has blocked Marshee. Ask them to allow it, or link a personal account.",
    );
    assert.equal(linkErrorMessage("exchange"), "Google didn't finish the link. Try again.");
    assert.equal(
      linkErrorMessage("no-refresh-token"),
      "Google didn't give Marshee lasting access. Try again.",
    );
    assert.equal(
      linkErrorMessage("calendars"),
      "Google didn't share this account's calendars. Unlink it if it shows here, then try again and leave every box ticked.",
    );
    assert.equal(linkErrorMessage("weird_code"), "Google returned an error (weird_code). Try again.");
    assert.equal(linkErrorMessage("constructor"), "Google returned an error (constructor). Try again.");
  });

  it("words the linked-by line and the collapsed summary", () => {
    assert.equal(linkedByLine("Bryce", null), "Linked by Bryce");
    assert.equal(linkedByLine("Bryce", "Work"), "Work, linked by Bryce");
    assert.equal(calendarsSummary(2, 1), "2 calendars, 1 syncing");
    assert.equal(calendarsSummary(2, 2), "2 calendars, 2 syncing");
    assert.equal(calendarsSummary(1, 0), "1 calendar");
    assert.equal(calendarsSummary(0, 0), "No calendars");
  });
});

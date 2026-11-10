import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_STATUSES,
  calendarsSummary,
  copyFailedLine,
  copyRemoveFailedLine,
  isReadOnlyRole,
  onGoogleLine,
  ownerLine,
  linkedByLine,
  linkErrorMessage,
  EVENT_SYNC_WORDS,
  SYNCED_CALENDARS_EXTRA_WORDS,
  SYNCED_CALENDARS_WORDS,
  SYNC_DIRECTIONS,
  SYNC_DIRECTION_HINTS,
  SYNC_DIRECTION_LABELS,
  forLine,
  withoutForLine,
  isSyncDirection,
  SYNC_ROW_STATUSES,
  toSyncRowStatus,
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

  it("words the outbound hint and how syncing works", () => {
    assert.equal(
      SYNC_DIRECTION_HINTS.outbound,
      "Events you choose to sync are copied to this calendar.",
    );
    assert.equal(
      SYNCED_CALENDARS_EXTRA_WORDS.syncHowItWorks,
      "Marshee copies an event to a calendar when that calendar is set to sync and you tick it. Calendars set to Both ways also bring their events into Marshee.",
    );
    assert.equal("syncNotOn" in SYNCED_CALENDARS_EXTRA_WORDS, false);
  });

  it("words the Google warning hint and the read only label", () => {
    assert.equal(
      SYNCED_CALENDARS_EXTRA_WORDS.unverifiedHint,
      'Google may say it hasn\'t verified this app. That\'s expected for a private family app. Tap Advanced, then "Go to themarshandco.com (unsafe)".',
    );
    assert.equal(SYNCED_CALENDARS_EXTRA_WORDS.readOnly, "Read only");
    assert.equal(isReadOnlyRole("reader"), true);
    assert.equal(isReadOnlyRole("writer"), true);
    assert.equal(isReadOnlyRole("owner"), false);
    assert.equal(isReadOnlyRole(null), false);
  });

  it("pins the event form and detail sheet words", () => {
    assert.equal(EVENT_SYNC_WORDS.fieldLabel, "Sync to");
    assert.equal(EVENT_SYNC_WORDS.fieldHint, "Optional");
    assert.equal(EVENT_SYNC_WORDS.busyLabel, "Show as busy on Google");
    assert.equal(EVENT_SYNC_WORDS.tryAgain, "Try again");
    assert.equal(EVENT_SYNC_WORDS.done, "Done");
    assert.equal(
      EVENT_SYNC_WORDS.deletedCopyLeft,
      "Deleted from Marshee. Its copy in Google couldn't be removed, so delete it there.",
    );
    assert.equal(
      EVENT_SYNC_WORDS.reconnect,
      "Google stopped letting Marshee in. On Synced calendars, tap Link a Google account and choose this account again.",
    );
    assert.equal(ownerLine("Emily"), "Emily's");
    assert.equal(onGoogleLine("Family"), "On Google: Family");
    assert.equal(copyFailedLine("Family"), "Couldn't copy to Family.");
    assert.equal(copyRemoveFailedLine("Family"), "Couldn't remove the copy from Family.");
  });

  it("words the already-linked error", () => {
    assert.equal(
      linkErrorMessage("already-linked"),
      "Someone else in the family already linked this Google account.",
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
    assert.equal(calendarsSummary(2, 1), "2 calendars, 1 set to sync");
    assert.equal(calendarsSummary(2, 2), "2 calendars, 2 set to sync");
    assert.equal(calendarsSummary(1, 0), "1 calendar");
    assert.equal(calendarsSummary(0, 0), "No calendars");
  });

  it("pins the four row statuses and repairs anything unknown to failed", () => {
    assert.deepEqual([...SYNC_ROW_STATUSES], ["pending", "ok", "failed", "removing"]);
    for (const status of SYNC_ROW_STATUSES) assert.equal(toSyncRowStatus(status), status);
    assert.equal(toSyncRowStatus("weird"), "failed");
    assert.equal(toSyncRowStatus(null), "failed");
  });

  it("builds the For line from named people only", () => {
    assert.equal(forLine(["Bryce", "Emily"]), "For: Bryce, Emily");
    assert.equal(forLine(["Bryce", "  ", ""]), "For: Bryce");
    assert.equal(forLine([]), "");
  });
});

describe("withoutForLine", () => {
  it("removes Marshee's trailing For line and keeps the notes", () => {
    assert.equal(withoutForLine("Bring the form\n\nFor: Bryce, Emily"), "Bring the form");
  });

  it("returns empty when the For line was all there was", () => {
    assert.equal(withoutForLine("For: Bryce"), "");
  });

  it("leaves other text, and a For line that is not last, alone", () => {
    assert.equal(withoutForLine("Bring snacks"), "Bring snacks");
    assert.equal(withoutForLine("For: Bryce\n\nThen call"), "For: Bryce\n\nThen call");
    assert.equal(withoutForLine("Gift\nFor: Bryce"), "Gift\nFor: Bryce");
  });

  it("only strips one line, so it undoes forLine exactly once", () => {
    const sent = ["Notes", forLine(["A"])].join("\n\n");
    assert.equal(withoutForLine(withoutForLine(sent)), "Notes");
  });
});

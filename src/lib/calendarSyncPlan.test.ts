// Unit tests for calendarSyncPlan.ts's planning rules (which calendars get a
// copy, busy columns, ticks, token fail reasons). The push steps
// (syncEventCopies, removeAllCopies) are tested in the sibling
// calendarSyncPlanPush.test.ts, split by concern.
// Run with `npm test`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  busyColumn,
  cleanRequestedIds,
  isPushable,
  planSync,
  sortedPersonNames,
  startsTicked,
  tokenFailReason,
  type PlanCalendar,
  type PlanRow,
} from "./calendarSyncPlan";
import { linkErrorMessage, toLinkErrorCode, toSyncFailReason } from "./calendarSyncVocabulary";

const GOOGLE_ID = "6d61727368656576656e74";

function cal(id: string, over: Partial<PlanCalendar> = {}): PlanCalendar {
  return {
    id,
    googleCalendarId: `${id}@group.calendar.google.com`,
    accountId: `acct-${id}`,
    direction: "outbound",
    accessRole: "owner",
    ...over,
  };
}

function row(linkedCalendarId: string, over: Partial<PlanRow> = {}): PlanRow {
  return { linkedCalendarId, googleEventId: GOOGLE_ID, etag: '"e1"', status: "ok", ...over };
}

describe("isPushable and startsTicked", () => {
  it("allows set-to-sync calendars that are owner or unknown, nothing else", () => {
    assert.equal(isPushable({ direction: "outbound", accessRole: "owner" }), true);
    assert.equal(isPushable({ direction: "twoWay", accessRole: null }), true);
    assert.equal(isPushable({ direction: "off", accessRole: "owner" }), false);
    assert.equal(isPushable({ direction: "outbound", accessRole: "reader" }), false);
    assert.equal(isPushable({ direction: "outbound", accessRole: "writer" }), false);
  });

  it("ticks only the viewer's own Both ways calendars", () => {
    assert.equal(startsTicked({ direction: "twoWay", isMine: true }), true);
    assert.equal(startsTicked({ direction: "twoWay", isMine: false }), false);
    assert.equal(startsTicked({ direction: "outbound", isMine: true }), false);
  });
});

describe("planSync", () => {
  const calendars = [
    cal("a"),
    cal("b"),
    cal("off", { direction: "off" }),
    cal("ro", { accessRole: "reader" }),
  ];

  it("creates on new ticks, updates kept ones, removes unticked ones", () => {
    const plan = planSync({ rows: [row("a"), row("b")], calendars, requestedIds: ["b"] });
    assert.deepEqual(plan, { create: [], update: ["b"], remove: ["a"] });
    const plan2 = planSync({ rows: [row("a")], calendars, requestedIds: ["a", "b"] });
    assert.deepEqual(plan2, { create: ["b"], update: ["a"], remove: [] });
  });

  it("ignores a tampered id for an off, read-only or unknown calendar", () => {
    const plan = planSync({ rows: [], calendars, requestedIds: ["off", "ro", "nope", "a"] });
    assert.deepEqual(plan, { create: ["a"], update: [], remove: [] });
  });

  it("undefined requestedIds changes no calendars, only updates existing copies", () => {
    const plan = planSync({ rows: [row("a"), row("b")], calendars });
    assert.deepEqual(plan, { create: [], update: ["a", "b"], remove: [] });
    assert.deepEqual(planSync({ rows: [], calendars }), { create: [], update: [], remove: [] });
  });

  it("leaves a copy alone on a calendar since switched off or made read-only", () => {
    const plan = planSync({ rows: [row("off"), row("ro")], calendars, requestedIds: [] });
    assert.deepEqual(plan, { create: [], update: [], remove: [] });
    const plan2 = planSync({ rows: [row("off")], calendars });
    assert.deepEqual(plan2, { create: [], update: [], remove: [] });
  });

  it("finishes a stuck removal on the next undefined run", () => {
    const plan = planSync({ rows: [row("a", { status: "removing" })], calendars });
    assert.deepEqual(plan, { create: [], update: [], remove: ["a"] });
  });
});

describe("planSync: a failed untick", () => {
  it("a calendar re-ticked after a failed untick goes to update, the person's latest choice", () => {
    const plan = planSync({
      rows: [row("a", { status: "removing" })],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(plan, { create: [], update: ["a"], remove: [] });
  });
});

describe("cleanRequestedIds", () => {
  it("keeps strings, drops the rest, and passes absent or non-list through as undefined", () => {
    assert.deepEqual(cleanRequestedIds(["a", 1, null, "b"]), ["a", "b"]);
    assert.deepEqual(cleanRequestedIds([]), []);
    assert.equal(cleanRequestedIds(undefined), undefined);
    assert.equal(cleanRequestedIds("a"), undefined);
  });
});

describe("busyColumn", () => {
  it("stores the switch for an all-day event, leaves it alone when undefined, resets it for a timed one", () => {
    assert.deepEqual(busyColumn(true, true), { showBusyOnGoogle: true });
    assert.deepEqual(busyColumn(true, false), { showBusyOnGoogle: false });
    assert.deepEqual(busyColumn(true, undefined), {});
    assert.deepEqual(busyColumn(false, true), { showBusyOnGoogle: false });
    assert.deepEqual(busyColumn(false, undefined), { showBusyOnGoogle: false });
  });
});

describe("tokenFailReason", () => {
  it("maps a revoked grant to reconnect and anything else to network", () => {
    assert.equal(tokenFailReason("revoked"), "reconnect");
    assert.equal(tokenFailReason("network"), "network");
    assert.equal(tokenFailReason("<html>body</html>"), "network");
  });
});

describe("sortedPersonNames", () => {
  it("sorts by name then id without changing the input", () => {
    const people = [
      { id: "3", displayName: "Emily" },
      { id: "2", displayName: "Bryce" },
      { id: "1", displayName: "Bryce" },
    ];
    assert.deepEqual(sortedPersonNames(people), ["Bryce", "Bryce", "Emily"]);
    assert.equal(people[0].displayName, "Emily");
    assert.deepEqual(sortedPersonNames([]), []);
  });
});

describe("toSyncFailReason", () => {
  it("keeps the three fixed words and repairs anything else to network", () => {
    assert.equal(toSyncFailReason("reconnect"), "reconnect");
    assert.equal(toSyncFailReason("refused"), "refused");
    assert.equal(toSyncFailReason("network"), "network");
    assert.equal(toSyncFailReason(null), "network");
    assert.equal(toSyncFailReason("<html>Google body</html>"), "network");
  });
});

describe("already-linked error code", () => {
  it("passes toLinkErrorCode unchanged and has its own words", () => {
    assert.equal(toLinkErrorCode("already-linked"), "already-linked");
    assert.equal(
      linkErrorMessage("already-linked"),
      "Someone else in the family already linked this Google account.",
    );
  });
});

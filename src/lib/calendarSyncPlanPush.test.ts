// Unit tests for calendarSyncPlan.ts's push steps (syncEventCopies,
// removeAllCopies) against a fake Google. The planning rules (planSync, busy
// columns, ticks) are tested in the sibling calendarSyncPlan.test.ts, split by
// concern.
// Run with `npm test`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  removeAllCopies,
  syncEventCopies,
  type PlanCalendar,
  type PlanRow,
  type RowKey,
  type RowPatch,
  type SyncDeps,
} from "./calendarSyncPlan";
import { googleEventIdFor, type EventPayloadInput } from "./google/eventPayload";
import type { EventCallResult, GetEventResult } from "./google/types";

// The push steps (syncEventCopies, removeAllCopies) run against a fake Google
// and fake rows. Split from calendarSyncPlan.test.ts, which keeps the pure
// decisions. Nothing here reaches the network or a database.

const TOKEN = "ya29.SECRET-ACCESS-TOKEN";
const EVENT_ID = "cmevent0123456789abcdefgh";
const GOOGLE_ID = googleEventIdFor(EVENT_ID);

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

const PAYLOAD_INPUT: EventPayloadInput = {
  marsheeEventId: EVENT_ID,
  title: "Dentist",
  notes: null,
  location: null,
  startAt: new Date("2026-03-07T19:00:00Z"),
  endAt: new Date("2026-03-07T20:00:00Z"),
  allDay: false,
  showBusyOnGoogle: false,
  forNames: ["Bryce"],
};

type Call = { op: string; calendarId: string; ifMatch?: string };

/** A fake Google plus fake rows. Nothing here reaches the network or a database. */
function harness(script: {
  insert?: EventCallResult[];
  update?: EventCallResult[];
  get?: GetEventResult[];
  remove?: EventCallResult[];
  token?: { ok: true; accessToken: string } | { ok: false; reason: "reconnect" | "network" };
}) {
  const calls: Call[] = [];
  const saves: { key: RowKey; patch: RowPatch }[] = [];
  const deleted: string[] = [];
  let tokenFetches = 0;
  const next = <T>(list: T[] | undefined, fallback: T): T => (list && list.length > 0 ? list.shift()! : fallback);
  const deps: SyncDeps = {
    async getAccessToken() {
      tokenFetches += 1;
      return script.token ?? { ok: true, accessToken: TOKEN };
    },
    async insert(_t, calendarId) {
      calls.push({ op: "insert", calendarId });
      return next(script.insert, { ok: true, etag: '"new"' });
    },
    async update(_t, calendarId, _g, _p, ifMatch) {
      calls.push({ op: "update", calendarId, ifMatch });
      return next(script.update, { ok: true, etag: '"upd"' });
    },
    async get(_t, calendarId) {
      calls.push({ op: "get", calendarId });
      return next(script.get, { ok: true, etag: '"theirs"', event: { summary: "Their edit" } });
    },
    async remove(_t, calendarId) {
      calls.push({ op: "remove", calendarId });
      return next(script.remove, { ok: true, etag: null });
    },
    async saveRow(key, patch) {
      saves.push({ key, patch });
    },
    async deleteRow(_e, linkedCalendarId) {
      deleted.push(linkedCalendarId);
    },
    now: () => new Date("2026-03-01T00:00:00Z"),
  };
  return { deps, calls, saves, deleted, tokenFetches: () => tokenFetches };
}

function lastPatch(h: ReturnType<typeof harness>): RowPatch {
  return h.saves[h.saves.length - 1].patch;
}

describe("syncEventCopies: create", () => {
  it("writes pending first, inserts under the Marshee-chosen id, then ok with the etag", async () => {
    const h = harness({});
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.equal(h.saves[0].patch.status, "pending");
    assert.equal(h.saves[0].key.googleEventId, GOOGLE_ID);
    assert.deepEqual(h.calls, [{ op: "insert", calendarId: "a@group.calendar.google.com" }]);
    assert.equal(lastPatch(h).status, "ok");
    assert.equal(lastPatch(h).etag, '"new"');
  });

  it("a retry after a 409 makes no second copy: it updates the same id instead", async () => {
    const h = harness({ insert: [{ ok: false, reason: "conflict" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a", { status: "pending", etag: null })],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["insert", "update"]);
    assert.equal(h.calls[1].ifMatch, undefined);
    assert.equal(lastPatch(h).status, "ok");
    assert.ok(h.saves.every((s) => s.key.googleEventId === GOOGLE_ID));
  });

  it("fetches the access token once per account across parallel calendars", async () => {
    const h = harness({});
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a", { accountId: "same" }), cal("b", { accountId: "same" }), cal("c")],
      requestedIds: ["a", "b", "c"],
    });
    assert.equal(h.tokenFetches(), 2);
    assert.equal(h.calls.length, 3);
  });
});

describe("syncEventCopies: update", () => {
  it("sends If-Match with the saved etag", async () => {
    const h = harness({});
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(h.calls, [{ op: "update", calendarId: "a@group.calendar.google.com", ifMatch: '"e1"' }]);
    assert.equal(lastPatch(h).etag, '"upd"');
  });

  it("a 412 records Google's version in previousJson and overwrites without If-Match", async () => {
    const h = harness({ update: [{ ok: false, reason: "changed" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "get", "update"]);
    assert.equal(h.calls[2].ifMatch, undefined);
    const final = lastPatch(h);
    assert.equal(final.status, "ok");
    assert.equal(final.previousJson, JSON.stringify({ summary: "Their edit" }));
  });

  it("a 404 on update recreates the copy under the same id", async () => {
    const h = harness({ update: [{ ok: false, reason: "gone" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "insert"]);
    assert.equal(lastPatch(h).status, "ok");
    assert.equal(lastPatch(h).etag, '"new"');
  });

  it("a 404 then a 409 (Google reserved the deleted id) revives it with an update", async () => {
    const h = harness({
      update: [{ ok: false, reason: "gone" }],
      insert: [{ ok: false, reason: "conflict" }],
    });
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "insert", "update"]);
    assert.equal(lastPatch(h).status, "ok");
  });

  it("unticking removes the copy at Google and drops the row", async () => {
    const h = harness({});
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: [],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["remove"]);
    assert.deepEqual(h.deleted, ["a"]);
  });

  it("a failed untick keeps the row as removing, and a gone copy counts as removed", async () => {
    const h = harness({ remove: [{ ok: false, reason: "network" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: [],
    });
    assert.deepEqual(res, { failed: 1 });
    assert.deepEqual(h.deleted, []);
    assert.equal(lastPatch(h).status, "removing");

    const g = harness({ remove: [{ ok: false, reason: "gone" }] });
    await syncEventCopies(g.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: [],
    });
    assert.deepEqual(g.deleted, ["a"]);
  });

  it("undefined requestedIds changes nothing about which calendars have copies", async () => {
    const h = harness({});
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a"), cal("b")],
    });
    assert.deepEqual(h.calls.map((c) => `${c.op}:${c.calendarId}`), ["update:a@group.calendar.google.com"]);
    assert.deepEqual(h.deleted, []);
  });

  it("a tampered id for an off or read-only calendar makes no call and no row", async () => {
    const h = harness({});
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("off", { direction: "off" }), cal("ro", { accessRole: "reader" })],
      requestedIds: ["off", "ro"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.equal(h.calls.length, 0);
    assert.equal(h.saves.length, 0);
  });
});

describe("syncEventCopies: failures", () => {
  it("a revoked token marks failed with reconnect and makes no Google call", async () => {
    const h = harness({ token: { ok: false, reason: "reconnect" } });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 1 });
    assert.equal(h.calls.length, 0);
    assert.equal(lastPatch(h).status, "failed");
    assert.equal(lastPatch(h).failReason, "reconnect");
  });

  it("a token that cannot be refreshed otherwise is network", async () => {
    const h = harness({ token: { ok: false, reason: "network" } });
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.equal(lastPatch(h).failReason, "network");
  });

  it("Google refusing (401/403) is refused; anything else is network", async () => {
    const h = harness({ insert: [{ ok: false, reason: "unauthorized" }] });
    await syncEventCopies(h.deps, { payloadInput: PAYLOAD_INPUT, rows: [], calendars: [cal("a")], requestedIds: ["a"] });
    assert.equal(lastPatch(h).failReason, "refused");
    const n = harness({ insert: [{ ok: false, reason: "network" }] });
    await syncEventCopies(n.deps, { payloadInput: PAYLOAD_INPUT, rows: [], calendars: [cal("a")], requestedIds: ["a"] });
    assert.equal(lastPatch(n).failReason, "network");
  });

  it("one calendar failing does not stop the others", async () => {
    const h = harness({ insert: [{ ok: false, reason: "network" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a"), cal("b")],
      requestedIds: ["a", "b"],
    });
    assert.deepEqual(res, { failed: 1 });
    assert.equal(h.calls.length, 2);
  });

  it("a thrown error is dropped and recorded as a network failure", async () => {
    const h = harness({});
    h.deps.insert = async () => {
      throw new Error(`boom ${TOKEN}`);
    };
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 1 });
    assert.equal(lastPatch(h).failReason, "network");
    assert.ok(!JSON.stringify(h.saves).includes(TOKEN));
  });

  it("retryOnly re-pushes rows that are not ok and leaves ok ones", async () => {
    const h = harness({});
    await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a"), row("b", { status: "failed" })],
      calendars: [cal("a"), cal("b")],
      retryOnly: true,
    });
    assert.deepEqual(h.calls.map((c) => c.calendarId), ["b@group.calendar.google.com"]);
  });

  it("no saved row, result or fail word contains the access token", async () => {
    const h = harness({
      insert: [{ ok: false, reason: "unauthorized" }],
      update: [{ ok: false, reason: "changed" }],
    });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("b")],
      calendars: [cal("a"), cal("b")],
      requestedIds: ["a", "b"],
    });
    const everything = JSON.stringify({ res, saves: h.saves, calls: h.calls, deleted: h.deleted });
    assert.ok(!everything.includes(TOKEN));
    assert.ok(!everything.includes("ya29"));
  });
});

describe("removeAllCopies", () => {
  it("asks Google for every copy, including on a calendar since switched off", async () => {
    const h = harness({});
    const res = await removeAllCopies(h.deps, {
      eventId: EVENT_ID,
      rows: [row("a"), row("off")],
      calendars: [cal("a"), cal("off", { direction: "off" })],
    });
    assert.deepEqual(res, { left: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["remove", "remove"]);
  });

  it("reports a failed delete so the caller can still delete the event and tell the person", async () => {
    const h = harness({ remove: [{ ok: false, reason: "network" }, { ok: false, reason: "gone" }] });
    const res = await removeAllCopies(h.deps, {
      eventId: EVENT_ID,
      rows: [row("a"), row("b")],
      calendars: [cal("a"), cal("b")],
    });
    assert.deepEqual(res, { left: 1 });
  });

  it("counts a revoked token as a copy left, with no Google call", async () => {
    const h = harness({ token: { ok: false, reason: "reconnect" } });
    const res = await removeAllCopies(h.deps, { eventId: EVENT_ID, rows: [row("a")], calendars: [cal("a")] });
    assert.deepEqual(res, { left: 1 });
    assert.equal(h.calls.length, 0);
  });
});

describe("syncEventCopies: Try again and 412 edge cases", () => {
  it("Try again finishes a stuck removal: it removes the copy and drops the row", async () => {
    const h = harness({});
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a", { status: "removing" })],
      calendars: [cal("a")],
      retryOnly: true,
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["remove"]);
    assert.deepEqual(h.deleted, ["a"]);
  });

  it("a 412 whose get fails still overwrites, and saves no previousJson", async () => {
    const h = harness({
      update: [{ ok: false, reason: "changed" }],
      get: [{ ok: false, reason: "network" }],
    });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "get", "update"]);
    assert.equal(lastPatch(h).status, "ok");
    assert.ok(!("previousJson" in lastPatch(h)));
  });

  it("a 412 whose second update finds the copy gone recreates it under the same id", async () => {
    const h = harness({
      update: [
        { ok: false, reason: "changed" },
        { ok: false, reason: "gone" },
      ],
    });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("a")],
      calendars: [cal("a")],
      requestedIds: ["a"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "get", "update", "insert"]);
    assert.equal(lastPatch(h).status, "ok");
    assert.equal(lastPatch(h).etag, '"new"');
    assert.ok(h.saves.every((s) => s.key.googleEventId === GOOGLE_ID));
  });
});

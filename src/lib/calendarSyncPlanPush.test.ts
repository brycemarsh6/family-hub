// Unit tests for calendarSyncPlan.ts's push steps, create and update, against
// a fake Google. Failures, removeAllCopies and the Try again/412 edge cases
// are in the sibling calendarSyncPlanPushFailures.test.ts; the planning rules
// are in calendarSyncRules.test.ts. The shared fake is in
// calendarSyncPlanTestHarness.ts.
// Run with `npm test`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncEventCopies } from "./calendarSyncPlan";
import { GOOGLE_ID, PAYLOAD_INPUT, cal, harness, lastPatch, row } from "./calendarSyncPlanTestHarness";

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

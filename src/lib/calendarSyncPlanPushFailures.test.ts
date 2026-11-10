// Unit tests for calendarSyncPlan.ts's push steps, failures, removeAllCopies
// and the Try again/412 edge cases, against a fake Google. Create and update
// are in the sibling calendarSyncPlanPush.test.ts. The shared fake is in
// calendarSyncPlanTestHarness.ts.
// Run with `npm test`.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { removeAllCopies, syncEventCopies } from "./calendarSyncPlan";
import { EVENT_ID, GOOGLE_ID, PAYLOAD_INPUT, TOKEN, lastPatch, cal, harness, row } from "./calendarSyncPlanTestHarness";

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

describe("syncEventCopies: a source copy that is gone in Google", () => {
  it("records failed/network and never inserts a recreated original", async () => {
    const h = harness({ update: [{ ok: false, reason: "gone" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("src")],
      calendars: [cal("src")],
      requestedIds: ["src"],
      sourceLinkedCalendarId: "src",
    });
    assert.deepEqual(res, { failed: 1 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update"]);
    assert.equal(lastPatch(h).status, "failed");
    assert.equal(lastPatch(h).failReason, "network");
  });

  it("a gone after a 412 on the source also never inserts", async () => {
    const h = harness({
      update: [{ ok: false, reason: "changed" }, { ok: false, reason: "gone" }],
    });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("src")],
      calendars: [cal("src")],
      requestedIds: ["src"],
      sourceLinkedCalendarId: "src",
    });
    assert.deepEqual(res, { failed: 1 });
    assert.ok(!h.calls.some((c) => c.op === "insert"));
  });

  it("a gone on a different calendar still recreates the copy", async () => {
    const h = harness({ update: [{ ok: false, reason: "gone" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("b")],
      calendars: [cal("b")],
      requestedIds: ["b"],
      sourceLinkedCalendarId: "src",
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "insert"]);
  });

  it("the 409 revive still works through update on a non-source calendar", async () => {
    const h = harness({ update: [{ ok: false, reason: "gone" }], insert: [{ ok: false, reason: "conflict" }] });
    const res = await syncEventCopies(h.deps, {
      payloadInput: PAYLOAD_INPUT,
      rows: [row("b")],
      calendars: [cal("b")],
      requestedIds: ["b"],
    });
    assert.deepEqual(res, { failed: 0 });
    assert.deepEqual(h.calls.map((c) => c.op), ["update", "insert", "update"]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PULL_FORCE_LEASE_MS, PULL_LEASE_MS, runPull } from "./calendarPullRun";
import { CAL, NOW, fake, gEvent } from "./testing/calendarPullRunHarness";

// The pull's steps with every call faked. The rules for each event are in
// calendarSyncPull.test.ts. This file proves the order and the guards of
// calendarPullRun.ts: the lease, the sync token and access. Its writes and
// fan-out cases are in calendarPullRunWrites.test.ts.

describe("runPull: guards", () => {
  it("calls nothing when Google is not configured", async () => {
    const f = fake({ isConfigured: () => false });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 0, checked: 0 });
    assert.deepEqual(f.calls, []);
  });

  it("skips a calendar whose lease another caller holds", async () => {
    const f = fake({ claimResult: false });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 0, checked: 0 });
    assert.deepEqual(f.calls, ["loadCalendars", `claim:c1:${PULL_LEASE_MS}`]);
  });

  it("counts no calendar as checked when every one is leased", async () => {
    const f = fake({ claimResult: false, calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }] });
    assert.equal((await runPull(f.deps, { force: true })).checked, 0);
  });

  it("counts each calendar it tried, a failed one too, and not one skipped as a twin", async () => {
    const twin = { ...CAL, id: "c3", createdAt: new Date("2026-10-02T00:00:00Z") };
    const f = fake({
      calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }, twin],
      lists: [{ ok: true, events: [], nextSyncToken: "t" }],
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: false, failed: 1, checked: 2 });
  });

  it("uses the 30 second lease for Refresh", async () => {
    const f = fake({ claimResult: false });
    await runPull(f.deps, { force: true });
    assert.ok(f.calls.includes(`claim:c1:${PULL_FORCE_LEASE_MS}`));
  });

  it("never throws when the calendar list fails", async () => {
    const f = fake({
      loadCalendars: async () => {
        throw new Error("db down");
      },
    });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 0 });
  });
});

describe("runPull: sync token", () => {
  it("sends timeMin 30 days back and timeMax 365 days ahead when there is no token", async () => {
    const f = fake();
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [{ timeMin: "2026-10-10T18:00:00.000Z", timeMax: "2027-11-09T18:00:00.000Z" }]);
  });

  const WINDOW = { timeMin: "2026-10-10T18:00:00.000Z", timeMax: "2027-11-09T18:00:00.000Z" };

  it("with rewindow a calendar holding a token reads the token first, then lists the full window", async () => {
    const f = fake({
      calendars: [{ ...CAL, syncToken: "tok-old" }],
      lists: [
        { ok: true, events: [], nextSyncToken: "tok-mid" },
        { ok: true, events: [], nextSyncToken: "tok-full" },
      ],
    });
    await runPull(f.deps, { force: true, rewindow: true });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }, WINDOW]);
    assert.equal(f.calls.filter((c) => c.startsWith("saveToken")).at(-1), "saveToken:c1:tok-full");
  });

  it("with rewindow a failed token pass does no full pass and saves nothing", async () => {
    const f = fake({ calendars: [{ ...CAL, syncToken: "tok-old" }], lists: [{ ok: false, reason: "network" }] });
    assert.deepEqual(await runPull(f.deps, { force: true, rewindow: true }), { changed: false, failed: 1, checked: 1 });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }]);
    assert.equal(f.calls.some((c) => c.startsWith("saveToken") || c.startsWith("markOk")), false);
  });

  it("with rewindow a restart from the token pass runs just one full pull", async () => {
    const f = fake({ calendars: [{ ...CAL, syncToken: "tok-old" }], lists: [{ ok: false, reason: "restart" }, { ok: true, events: [], nextSyncToken: "tok-full" }] });
    await runPull(f.deps, { force: true, rewindow: true });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }, WINDOW]);
  });

  it("a clean full pull with no token back stamps Last checked and does not save a token", async () => {
    const f = fake({ lists: [{ ok: true, events: [], nextSyncToken: null }] });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 0, checked: 1 });
    assert.equal(f.calls.includes("markOk:c1"), true);
    assert.equal(f.calls.some((c) => c.startsWith("saveToken")), false);
  });

  it("sends only the token when there is one", async () => {
    const f = fake({ calendars: [{ ...CAL, syncToken: "tok-old" }] });
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [{ syncToken: "tok-old" }]);
  });

  it("on restart clears the token and runs a full pull in the same run", async () => {
    const f = fake({
      calendars: [{ ...CAL, syncToken: "tok-old" }],
      lists: [
        { ok: false, reason: "restart" },
        { ok: true, events: [gEvent()], nextSyncToken: "tok-new" },
      ],
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(f.listModes, [
      { syncToken: "tok-old" },
      { timeMin: "2026-10-10T18:00:00.000Z", timeMax: "2027-11-09T18:00:00.000Z" },
    ]);
    assert.deepEqual(
      f.calls.filter((c) => c.startsWith("saveToken") || c.startsWith("insert")),
      ["saveToken:c1:null", "insert:g1", "saveToken:c1:tok-new"],
    );
    assert.deepEqual(result, { changed: true, failed: 0, checked: 1 });
  });

  it("does not loop when a full pull answers restart", async () => {
    const f = fake({ lists: [{ ok: false, reason: "restart" }] });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.equal(f.listModes.length, 1);
  });

  it("saves no token when Google sends no nextSyncToken", async () => {
    const f = fake({ lists: [{ ok: true, events: [gEvent()], nextSyncToken: null }] });
    await runPull(f.deps, { force: false });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });

  it("saves the token only after every event is written", async () => {
    const f = fake({ lists: [{ ok: true, events: [gEvent()], nextSyncToken: "tok-new" }] });
    await runPull(f.deps, { force: false });
    assert.ok(f.calls.indexOf("insert:g1") < f.calls.indexOf("saveToken:c1:tok-new"));
  });

  it("keeps the old token when one event fails to write, and goes on with the rest", async () => {
    const f = fake({
      lists: [{ ok: true, events: [gEvent({ id: "g1" }), gEvent({ id: "g2" })], nextSyncToken: "tok-new" }],
      writeInsert: async (i) => {
        if (i.googleEventId === "g1") throw new Error("unique");
      },
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: true, failed: 1, checked: 1 });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });
});

describe("runPull: access", () => {
  it("marks the account needs-relink when Google says the link needs a reconnect", async () => {
    const f = fake({ getAccessToken: async () => ({ ok: false, reason: "reconnect" }) });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(result, { changed: false, failed: 1, checked: 1 });
    assert.ok(f.calls.includes("relink:a1"));
    assert.ok(!f.calls.includes("list"));
  });

  it("does not mark needs-relink for a network failure", async () => {
    const f = fake({ getAccessToken: async () => ({ ok: false, reason: "network" }) });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.ok(!f.calls.some((c) => c.startsWith("relink")));
  });

  it("asks for one access token per account and marks needs-relink once", async () => {
    const calls: string[] = [];
    const f = fake({
      calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }],
      getAccessToken: async (id) => {
        calls.push(`token:${id}`);
        return { ok: false, reason: "reconnect" };
      },
    });
    const result = await runPull(f.deps, { force: false });
    assert.deepEqual(calls, ["token:a1"]);
    assert.deepEqual(result, { changed: false, failed: 2, checked: 2 });
    assert.equal(f.calls.filter((c) => c === "relink:a1").length, 1);
  });

  it("counts an unauthorized list as a failure and saves nothing", async () => {
    const f = fake({ lists: [{ ok: false, reason: "unauthorized" }] });
    assert.deepEqual(await runPull(f.deps, { force: false }), { changed: false, failed: 1, checked: 1 });
    assert.deepEqual(f.calls.filter((c) => c.startsWith("saveToken")), []);
  });
});

describe("runPull: one calendar by id", () => {
  it("pulls only the named calendar, with the lease the caller asked for", async () => {
    const f = fake({ calendars: [CAL, { ...CAL, id: "c2", googleCalendarId: "g-cal-2" }] });
    const result = await runPull(f.deps, { force: true, onlyCalendarId: "c2" });
    assert.equal(result.checked, 1);
    assert.deepEqual(f.calls.filter((c) => c.startsWith("claim:")), [`claim:c2:${PULL_FORCE_LEASE_MS}`]);
  });

  it("a calendar claimed 5 seconds ago is still pulled by the series path and skipped by a normal force pull", async () => {
    const lastClaim = NOW.getTime() - 5000;
    // Mirrors the real claim: lastPulledAt < staleBefore.
    const claim = async (_id: string, staleBefore: Date) => lastClaim < staleBefore.getTime();
    const series = await runPull(fake({ claim }).deps, { force: true, onlyCalendarId: "c1", ignoreLease: true });
    assert.equal(series.checked, 1);
    const normal = await runPull(fake({ claim }).deps, { force: true, onlyCalendarId: "c1" });
    assert.equal(normal.checked, 0);
    const refresh = await runPull(fake({ claim }).deps, { force: true });
    assert.equal(refresh.checked, 0);
  });

  it("pulls nothing for an id that is not a pullable calendar", async () => {
    const f = fake();
    assert.deepEqual(await runPull(f.deps, { force: true, onlyCalendarId: "nope" }), { changed: false, failed: 0, checked: 0 });
    assert.deepEqual(f.calls, ["loadCalendars"]);
  });
});
